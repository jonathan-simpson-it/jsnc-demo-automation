"""LangGraph StateGraph for the PE AI agent pipeline."""

import re
from typing import Literal, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_deepseek import ChatDeepSeek
from langgraph.graph import END, StateGraph

from config.settings import settings
from src.agents.prompts import (
    GROUNDING_RULES,
    SOURCE_SELECTION_PROMPT,
    VERIFICATION_PROMPT,
    build_compliance_prompt,
    build_lp_report_prompt,
    build_term_sheet_prompt,
    clean_citations,
    is_analysis_query,
    says_not_found,
)
from src.tools.search import create_search_tool, detect_document
from src.utils.llm_cache import llm_cache
from src.vector_store.chroma import VectorStore


# ---------------------------------------------------------------------------
# Shared state
# ---------------------------------------------------------------------------
class AgentState(TypedDict):
    query: str
    agent_type: Literal["due_diligence", "term_sheet", "lp_report", "compliance"]
    retrieved: str
    narrowed: str
    answer: str
    verified: bool
    citations: list[str]
    conversation_history: list[dict]


# ---------------------------------------------------------------------------
# Agent system prompts
# ---------------------------------------------------------------------------
_SYSTEM_PROMPTS = {
    "due_diligence": "You are a PE due diligence analyst at Archbridge Capital Partners, Hong Kong SAR. Analyze investment opportunities. Search the knowledge base, identify risks and opportunities, provide a recommendation.",
    "term_sheet": "You are a term sheet analyst at Archbridge Capital Partners, Hong Kong SAR. Extract structured data from financing documents accurately.",
    "lp_report": "You are an LP reporting analyst at Archbridge Capital Partners, Hong Kong SAR. Generate quarterly reports from portfolio and financial data.",
    "compliance": "You are a compliance analyst at Archbridge Capital Partners, Hong Kong SAR. Check documents against SFC, AMLO, HKMA, and Companies Ordinance regulations.",
}

# Prompt builders per agent type (None = built dynamically in answer_node)
_PROMPT_BUILDERS = {
    "due_diligence": None,
    "term_sheet": build_term_sheet_prompt,
    "lp_report": build_lp_report_prompt,
    "compliance": build_compliance_prompt,
}


# ---------------------------------------------------------------------------
# Parsers (one per agent type)
# ---------------------------------------------------------------------------
def _parse_fields(text: str) -> dict[str, str]:
    """Parse KEY: VALUE lines from LLM output, skipping headers like 'ANSWER:'."""
    fields = {}
    skip_keys = {"answer", "evidence", "summary", "risks", "opportunities", "recommendation", "sources"}
    for line in text.strip().split("\n"):
        if ":" in line:
            key, value = line.lstrip("-•* ").split(":", 1)
            k = key.strip().lower()
            if k in skip_keys or not value.strip():
                continue
            fields[key.strip()] = value.strip()
    return fields


def _safe_float(val: str) -> float:
    """Extract first numeric value from a string."""
    cleaned = clean_citations(val)
    cleaned = re.sub(r"[$€£¥,\s]", "", cleaned)
    match = re.search(r"\d+\.?\d*", cleaned)
    return float(match.group()) if match else 0.0


def _semicolon_list(val: str) -> list[str]:
    """Split semicolon-separated list, filtering out 'not available'."""
    return [
        x.strip() for x in clean_citations(val).split(";")
        if x.strip() and x.strip().lower() not in ("not available", "not specified")
    ]


def _parse_due_diligence(text: str) -> dict:
    sections = {}
    current = None
    for line in text.strip().split("\n"):
        stripped = line.strip()
        clean = stripped.lstrip("-•* ").upper()
        for label in ("ANSWER:", "SUMMARY:", "RISKS:", "OPPORTUNITIES:", "RECOMMENDATION:"):
            if clean.startswith(label):
                current = label.rstrip(":").lower()
                sections[current] = stripped.split(":", 1)[1].strip()
                break
        else:
            # EVIDENCE is part of the answer but not a separate section
            if clean.startswith("EVIDENCE:"):
                current = None  # stop appending to answer
            elif current == "answer" and stripped:
                sections["answer"] = sections.get("answer", "") + " " + stripped
            elif current == "risks" and stripped.startswith("- "):
                sections.setdefault("risks_list", []).append(stripped[2:])
            elif current == "opportunities" and stripped.startswith("- "):
                sections.setdefault("opps_list", []).append(stripped[2:])

    answer = sections.get("answer", "")
    return {
        "summary": clean_citations(answer or sections.get("summary", "")) or "Analysis completed",
        "risks": [clean_citations(r) for r in sections.get("risks_list", [])],
        "opportunities": [clean_citations(o) for o in sections.get("opps_list", [])],
        "recommendation": clean_citations(sections.get("recommendation", "")) or "Further analysis needed",
    }


def _safe_str(f: dict, key: str, default: str) -> str:
    """Get a field, clean citations, fall back to default if empty."""
    val = clean_citations(f.get(key, ""))
    return val if val else default


def _parse_term_sheet(text: str) -> dict:
    f = _parse_fields(text)
    return {
        "company_name": _safe_str(f, "COMPANY_NAME", "Unknown"),
        "round_type": _safe_str(f, "ROUND_TYPE", "Unknown"),
        "pre_money_valuation": _safe_float(f.get("PRE_MONEY_VALUATION", "0")),
        "investment_amount": _safe_float(f.get("INVESTMENT_AMOUNT", "0")),
        "liquidation_preference": _safe_str(f, "LIQUIDATION_PREFERENCE", "Standard"),
        "anti_dilution": _safe_str(f, "ANTI_DILUTION", "Standard"),
        "board_seats": _safe_str(f, "BOARD_SEATS", "To be determined"),
        "price_per_share": _safe_str(f, "PRICE_PER_SHARE", "Not specified"),
        "shares_issued": _safe_str(f, "SHARES_ISSUED", "Not specified"),
        "esop_pool": _safe_str(f, "ESOP_POOL", "Not specified"),
        "esop_refresh": _safe_str(f, "ESOP_REFRESH", "Not specified"),
        "founder_ownership_post": _safe_str(f, "FOUNDER_OWNERSHIP_POST", "Not specified"),
        "lead_investor": _safe_str(f, "LEAD_INVESTOR", "Not specified"),
        "protective_provisions": _semicolon_list(f.get("PROTECTIVE_PROVISIONS", "")),
        "information_rights": _semicolon_list(f.get("INFORMATION_RIGHTS", "")),
        "exclusivity": _safe_str(f, "EXCLUSIVITY", "Not specified"),
        "governing_law": _safe_str(f, "GOVERNING_LAW", "Not specified"),
        "dispute_resolution": _safe_str(f, "DISPUTE_RESOLUTION", "Not specified"),
        "key_person_insurance": _safe_str(f, "KEY_PERSON_INSURANCE", "Not specified"),
    }


def _parse_lp_report(text: str) -> dict:
    f = _parse_fields(text)
    highlights = [clean_citations(h) for h in f.get("HIGHLIGHTS", "").split(";") if h.strip()]
    risks = [clean_citations(r) for r in f.get("RISK_FACTORS", "").split(";") if r.strip()]

    financial = {}
    for pair in f.get("FINANCIAL_SUMMARY", "").split(";"):
        pair = pair.strip()
        if ":" in pair:
            k, v = pair.split(":", 1)
            financial[k.strip().replace(" ", "_")] = v.strip()
        elif pair.split():
            parts = pair.split()
            if len(parts) >= 2:
                financial["_".join(parts[:-1])] = parts[-1]

    return {
        "quarter": clean_citations(f.get("QUARTER", "Unknown")),
        "portfolio_highlights": highlights,
        "financial_summary": {k: (v if not isinstance(v, str) else clean_citations(v)) for k, v in financial.items()},
        "risk_factors": risks,
    }


def _parse_compliance(text: str) -> dict:
    f = _parse_fields(text)
    compliant_str = f.get("COMPLIANT", "false").lower()
    return {
        "document_name": clean_citations(f.get("DOCUMENT_NAME", "Unknown Document")),
        "compliant": compliant_str in ("true", "yes", "compliant"),
        "issues": [clean_citations(i) for i in f.get("ISSUES", "").split(";") if i.strip() and i.strip().lower() != "none"],
        "jurisdiction": clean_citations(f.get("JURISDICTION", "Hong Kong SAR")),
        "regulations_checked": [clean_citations(r) for r in f.get("REGULATIONS_CHECKED", "").split(";") if r.strip()],
    }


PARSERS = {
    "due_diligence": _parse_due_diligence,
    "term_sheet": _parse_term_sheet,
    "lp_report": _parse_lp_report,
    "compliance": _parse_compliance,
}


# ---------------------------------------------------------------------------
# Keyword classification (fast path before LLM)
# ---------------------------------------------------------------------------
_KW_MAP = {
    "term_sheet": ["liquidation preference", "anti-dilution", "board seats",
                    "protective provisions", "exclusivity", "esop", "price per share",
                    "governing law", "dispute resolution", "key person insurance"],
    "compliance": ["sfc", "amlo", "hkma", "regulatory compliance check",
                    "compliance check", "anti-money laundering", "companies ordinance"],
    "lp_report": ["lp report", "quarterly report", "portfolio update",
                   "fund performance", "limited partner"],
}


def _classify_keyword(query: str) -> str | None:
    q = query.lower()
    for agent_type, keywords in _KW_MAP.items():
        if any(kw in q for kw in keywords):
            return agent_type
    return None


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------
def _make_llm(temperature: float = 0) -> ChatDeepSeek:
    return ChatDeepSeek(model=settings.deepseek_model, temperature=temperature, api_key=settings.deepseek_api_key)


def _extract_citations(text: str) -> list[str]:
    return re.findall(r"\[Source[s]?[\s\d]*:\s*([^\]]+)\]", text)


_STOP_WORDS = frozenset({
    "what", "is", "the", "are", "who", "how", "when", "where", "why",
    "does", "do", "can", "could", "would", "should", "will", "of",
    "for", "in", "on", "at", "to", "a", "an", "and", "or", "but",
    "not", "no", "with", "from", "by", "about", "this", "that",
})


def _filter_sources(retrieved: str, selected: list[int], sources: list[tuple[int, str]]) -> str:
    kept = [text for index, text in sources if index in selected]
    return "\n\n".join(kept) if kept else retrieved


def _select_sources_llm(query: str, sources: list[tuple[int, str]]) -> list[int]:
    if not sources:
        return []
    abbreviated = [
        f"[Source {idx}:]{text[text.find(chr(10)):][:500] if chr(10) in text else text[:500]}"
        for idx, text in sources
    ]
    try:
        raw = _make_llm().invoke([HumanMessage(content=SOURCE_SELECTION_PROMPT.format(
            query=query, sources="\n\n".join(abbreviated)
        ))]).content.strip().upper()
    except Exception:
        return [idx for idx, _ in sources]

    if "ALL" in raw:
        return [idx for idx, _ in sources]
    valid = {idx for idx, _ in sources}
    selected = list(dict.fromkeys(int(n) for n in re.findall(r"\d+", raw) if int(n) in valid))[:3]
    return selected or [idx for idx, _ in sources]


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------
def classify_node(state: AgentState) -> dict:
    query = state["query"]
    cached = llm_cache.get(query, prefix="classify")
    if cached:
        return {"agent_type": cached}

    kw = _classify_keyword(query)
    if kw:
        llm_cache.set(query, kw, prefix="classify")
        return {"agent_type": kw}

    # LLM fallback
    prompt = """Classify into: due_diligence (default), term_sheet, lp_report, or compliance.
Respond with ONLY the category name."""
    try:
        resp = _make_llm().invoke([SystemMessage(content=prompt), HumanMessage(content=query)])
        cls = resp.content.strip().lower()
        for valid in ("due_diligence", "term_sheet", "lp_report", "compliance"):
            if valid in cls:
                llm_cache.set(query, valid, prefix="classify")
                return {"agent_type": valid}
    except Exception:
        pass

    llm_cache.set(query, "due_diligence", prefix="classify")
    return {"agent_type": "due_diligence"}


def search_node(state: AgentState) -> dict:
    query = state["query"]
    cached = llm_cache.get(query, prefix=state["agent_type"])
    if cached:
        return {"retrieved": cached}

    vs = VectorStore()
    retrieved = create_search_tool(vs).invoke(query)
    llm_cache.set(query, retrieved, prefix=state["agent_type"])
    return {"retrieved": retrieved}


def narrow_node(state: AgentState) -> dict:
    retrieved = state["retrieved"]
    if not retrieved or retrieved.startswith("No relevant documents"):
        return {"narrowed": retrieved}

    matches = list(re.finditer(r"\[Source (\d+):[^\]]*\]", retrieved))
    if len(matches) <= 4:
        return {"narrowed": retrieved}

    sources = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(retrieved)
        sources.append((int(m.group(1)), retrieved[m.start():end].strip()))

    # Check if mostly single-doc
    names = [re.sub(r"^\[Source \d+: ", "", t.split("\n", 1)[0]).rsplit(", page", 1)[0].strip() for _, t in sources]
    dominant = max(set(names), key=names.count)
    if names.count(dominant) >= 0.7 * len(names):
        return {"narrowed": _filter_sources(retrieved, [i for i, _ in sources[:16]], sources)}

    selected = _select_sources_llm(state["query"], sources)
    return {"narrowed": _filter_sources(retrieved, selected, sources) if selected and len(selected) < len(sources) else retrieved}


def answer_node(state: AgentState) -> dict:
    agent_type = state["agent_type"]
    config_prompt = _PROMPT_BUILDERS[agent_type]

    if agent_type == "due_diligence":
        mode = "analysis" if is_analysis_query(state["query"]) else "factual"
        answer_prompt = f"Answer using ONLY the retrieved documents.\n\n{GROUNDING_RULES}\n\n## Retrieved Documents:\n{state['narrowed']}\n\n## User Question:\n{state['query']}"
    else:
        answer_prompt = config_prompt(state["narrowed"], state["query"])

    resp = _make_llm(temperature=settings.deepseek_temperature).invoke([
        SystemMessage(content=_SYSTEM_PROMPTS[agent_type]),
        HumanMessage(content=answer_prompt),
    ])
    answer = resp.content if isinstance(resp.content, str) else str(resp.content)
    return {"answer": answer, "citations": _extract_citations(answer), "verified": not says_not_found(answer)}


def verify_node(state: AgentState) -> dict:
    try:
        verified = _make_llm().invoke([
            SystemMessage(content=_SYSTEM_PROMPTS["due_diligence"]),
            HumanMessage(content=VERIFICATION_PROMPT.format(
                query=state["query"], answer=state["answer"][:800], retrieved=state["narrowed"]
            )),
        ]).content
        if isinstance(verified, str) and not says_not_found(verified):
            return {"answer": verified, "citations": _extract_citations(verified), "verified": True}
    except Exception:
        pass
    return {"verified": False}


def wide_search_node(state: AgentState) -> dict:
    query = state["query"]
    vs = VectorStore()
    target = detect_document(query, vs)

    queries = [query]
    keywords = [w for w in re.findall(r"[a-zA-Z0-9]+", query) if w.lower() not in _STOP_WORDS and len(w) > 1]
    if keywords:
        queries.append(" ".join(keywords))

    formatted, seen = [], set()
    for q in queries:
        results = vs.search(q, k=60 if target else 40, source_filter=target) if target else vs.search(q, k=40)
        kept = 0
        for r in results:
            key = r["content"][:100]
            if key in seen:
                continue
            seen.add(key)
            kept += 1
            if kept > 30:
                break
            m = r["metadata"]
            formatted.append(f"[Source {len(formatted)+1}: {m.get('filename','?')}, page {m.get('page',1)}, line {m.get('line',1)}]\n{r['content']}")
            if len(formatted) >= 60:
                break
        if len(formatted) >= 60:
            break

    wide_text = "\n\n".join(formatted)
    if not wide_text:
        return {"verified": True}

    try:
        verified = _make_llm().invoke([
            SystemMessage(content=_SYSTEM_PROMPTS["due_diligence"]),
            HumanMessage(content=VERIFICATION_PROMPT.format(
                query=query, answer=state["answer"][:800], retrieved=wide_text
            )),
        ]).content
        if isinstance(verified, str) and not says_not_found(verified):
            return {"answer": verified, "citations": _extract_citations(verified), "verified": True}
    except Exception:
        pass

    return {"verified": True}


# ---------------------------------------------------------------------------
# Conditional edges
# ---------------------------------------------------------------------------
def should_verify(state: AgentState) -> str:
    return "end" if state.get("verified", True) else "verify"


def after_verify(state: AgentState) -> str:
    return "end" if state.get("verified", True) else "wide_search"


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------
def build_agent_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    for name, fn in [("classify", classify_node), ("search", search_node),
                     ("narrow", narrow_node), ("answer", answer_node),
                     ("verify", verify_node), ("wide_search", wide_search_node)]:
        graph.add_node(name, fn)

    graph.set_entry_point("classify")
    graph.add_edge("classify", "search")
    graph.add_edge("search", "narrow")
    graph.add_edge("narrow", "answer")
    graph.add_conditional_edges("answer", should_verify, {"verify": "verify", "end": END})
    graph.add_conditional_edges("verify", after_verify, {"wide_search": "wide_search", "end": END})
    graph.add_edge("wide_search", END)
    return graph.compile()


_compiled_graph = None


def get_agent_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_agent_graph()
    return _compiled_graph
