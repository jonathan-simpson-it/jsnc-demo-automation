# Full Email Composer — /summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/summary` into a complete email workspace: AI-assisted drafting (with template fallback), full live preview, inline edit/approve, and one-click save into the user's real Outlook Drafts via Microsoft Graph (demo mode until credentials exist).

**Architecture:** A pure `src/email_composer.py` produces email drafts — deterministically from templates, or AI-refined through the existing `_make_llm()` (request-key aware) with automatic template fallback on any failure. `graph_mail.py` gains draft listing + content-type support; the routes add `POST /api/graph/mail/draft/generate` and `GET /api/graph/mail/drafts`. The frontend rebuilds `/summary` around an `EmailComposer` (markdown source + rendered live preview), an inbox panel, and a Saved-drafts panel.

**Tech Stack:** Python 3.11+/FastAPI, DeepSeek via `_make_llm`/`resolve_api_key`, Microsoft Graph client-credentials (demo fallback), Next.js 14 client components.

**Spec:** User request (this session): "create full option for /summary … full email preview, AI drafting, approve or edit, then saved to the user's actual email draft … similar features." Decisions: markdown body + rendered preview (stored in Outlook as text, with an html content-type option); a Saved drafts list panel shown on the page.

## Global Constraints

- Endpoints: `POST /api/graph/mail/draft/generate`, `GET /api/graph/mail/drafts`, existing `POST /api/graph/mail/drafts` gains optional `content_type: "text" | "html"` (default `"text"`).
- AI drafting MUST fall back to the deterministic template path when no LLM key exists or the LLM call fails (demo must work keyless). Result field `generated_by: "ai" | "template"`.
- Template keys: `digest`, `monthly`, `client`, `alert`. Tones: `professional`, `friendly`, `formal` (all lower-case).
- No user-facing DeepSeek mentions (existing copy rule); no emojis.
- Never log/echo API keys; demo data never pretends to be real (each demo surface is labeled).
- Local demo drafts live in `./data/graph_drafts.db`; all create/list draft functions accept `db_path` so tests use temp files.
- Copy uses the JS&C design system (CSS vars only, no new CSS files).
- Verification: `python -m pytest tests/test_email_composer.py tests/test_graph_mail.py tests/test_graph_api.py tests/test_summary.py -q`, `cd frontend && npx tsc --noEmit`.

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/email_composer.py` | Template library + deterministic composer + AI composer (fallback-safe) | Create |
| `src/graph_mail.py` | `list_drafts()`, `create_draft(..., content_type, db_path)`, demo storage reads | Modify |
| `src/api/routes/graph_mail.py` | `DraftGenerateRequest`, `POST /draft/generate`, `GET /drafts`, content_type validation | Modify |
| `frontend/src/lib/types.ts` | `ComposerDraft`, `SavedDraft`, template/tone unions | Modify |
| `frontend/src/lib/api.ts` | `generateAiDraft`, `fetchGraphDrafts` | Modify |
| `frontend/src/components/EmailComposer.tsx` | Subject/to/template/tone/instructions, AI-generate, editor + rendered preview, save-to-drafts | Create |
| `frontend/src/components/DraftsPanel.tsx` | Saved drafts list (demo/local + Graph when configured) | Create |
| `frontend/src/app/summary/page.tsx` | Compose workspace + inbox + drafts panels | Rewrite |
| `tests/test_email_composer.py`, `tests/test_graph_mail.py`, `tests/test_graph_api.py` | Backend coverage (all offline) | Create |

---

### Task 1: `src/email_composer.py` — templates + deterministic composer

**Files:**
- Create: `src/email_composer.py`
- Test: `tests/test_email_composer.py`

**Interfaces:**
- Produces: `TEMPLATE_KEYS = ("digest", "monthly", "client", "alert")`, `TONES = ("professional", "friendly", "formal")`, `compose_draft(summary: dict, template_key: str = "digest", tone: str = "professional", instructions: str = "", llm=None) -> dict` returning `{"subject": str, "body": str, "generated_by": "template"}` when `llm` is falsy. Later tasks add the AI branch in the same function.

- [ ] **Step 1: Write the failing tests**

`tests/test_email_composer.py`:
```python
from src.email_composer import TONES, compose_draft


def _summary(queries=47, agents=None):
    return {
        "total_queries": queries,
        "avg_confidence": 0.84,
        "agent_breakdown": agents
        or [{"agent": "due_diligence", "count": 18, "pct": 38.0},
            {"agent": "term_sheet", "count": 12, "pct": 26.0}],
        "top_queries": [
            {"query": "What are the key risks?", "agent": "due_diligence",
             "confidence": 0.91, "timestamp": "2026-09-01T14:32:00"},
        ],
        "user_activity": [{"user": "local", "queries": 47}],
    }


def test_compose_digest_without_llm_returns_template():
    out = compose_draft(_summary())
    assert out["generated_by"] == "template"
    assert "47" in out["body"]
    assert "due_diligence" in out["body"]
    assert out["subject"]  # non-empty


def test_zero_activity_still_builds_body():
    out = compose_draft(_summary(queries=0))
    assert "No activity" in out["body"]


def test_all_templates_and_tones_build():
    for key in ("digest", "monthly", "client", "alert"):
        for tone in TONES:
            out = compose_draft(_summary(), template_key=key, tone=tone)
            assert out["subject"] and len(out["body"]) > 40


def test_instructions_are_appended():
    out = compose_draft(_summary(), instructions="Mention the Enosis review.")
    assert "Enosis review" in out["body"]


def test_unknown_template_falls_back_to_digest():
    out = compose_draft(_summary(), template_key="nope")
    assert out["generated_by"] == "template"
    assert out["body"]
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest tests/test_email_composer.py -q`
Expected: FAIL — `ModuleNotFoundError: src.email_composer`.

- [ ] **Step 3: Implement**

`src/email_composer.py`:
```python
"""Email draft composition: deterministic templates + optional AI polish.

compose_draft() is the single entry point. Without an LLM it builds the
email from templates over the summary metrics; with one it asks the model
to rewrite/expand the draft and falls back to the template on any error.
"""

from __future__ import annotations

TEMPLATE_KEYS = ("digest", "monthly", "client", "alert")
TONES = ("professional", "friendly", "formal")

_TEMPLATE_INTRO = {
    "digest": "Weekly platform digest",
    "monthly": "Monthly platform report",
    "client": "Client engagement update",
    "alert": "Compliance alert",
}

_TONE_HINTS = {
    "professional": "Concise, factual, business tone.",
    "friendly": "Warm and approachable, still professional.",
    "formal": "Highly formal, suitable for board-level recipients.",
}


def _fmt_conf(conf) -> str:
    return f"{round((conf or 0) * 100)}%"


def _summary_lines(summary: dict) -> list[str]:
    """Compact, human-readable metrics block used by template bodies."""
    lines = []
    total = summary.get("total_queries") or 0
    if total == 0:
        lines.append("No platform activity was recorded in this period.")
        return lines
    avg = summary.get("avg_confidence") or 0
    lines.append(f"Total queries processed: {total}")
    lines.append(f"Average confidence: {_fmt_conf(avg)}")
    agents = summary.get("agent_breakdown") or []
    if agents:
        top = max(agents, key=lambda a: a.get("count", 0))
        lines.append(f"Most-used agent: {top.get('agent')} ({top.get('count')} queries)")
    top_queries = (summary.get("top_queries") or [])[:5]
    for i, q in enumerate(top_queries, 1):
        qq = (q.get("query") or "")[:90]
        conf = _fmt_conf(q.get("confidence"))
        lines.append(f"{i}. {qq} ({conf} confidence, {q.get('agent')})")
    return lines


def _build_subject(summary: dict, template_key: str) -> str:
    label = _TEMPLATE_INTRO.get(template_key, _TEMPLATE_INTRO["digest"])
    total = summary.get("total_queries") or 0
    return f"{label} — {total} queries · {_fmt_conf(summary.get('avg_confidence'))}"


def _build_body(summary: dict, template_key: str, tone: str, instructions: str) -> str:
    label = _TEMPLATE_INTRO.get(template_key, _TEMPLATE_INTRO["digest"])
    hint = _TONE_HINTS.get(tone, _TONE_HINTS["professional"])
    lines = [f"## {label}", "", hint, ""]
    if instructions:
        lines += [f"Focus: {instructions}", ""]
    lines += ["## Summary", ""]
    lines += _summary_lines(summary)
    lines += ["", "—", "Automatically generated by the PE AI Engineering Platform."]
    return "\n".join(lines)


def compose_draft(
    summary: dict,
    template_key: str = "digest",
    tone: str = "professional",
    instructions: str = "",
    llm=None,
) -> dict:
    """Build an email draft. Returns {'subject','body','generated_by'}."""
    body = _build_body(summary, template_key, tone, instructions)
    return {
        "subject": _build_subject(summary, template_key),
        "body": body,
        "generated_by": "template",
    }
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest tests/test_email_composer.py -q`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add src/email_composer.py tests/test_email_composer.py
git commit -m "feat: deterministic email templates for the composer"
```

---

### Task 2: AI refinement with template fallback

**Files:**
- Modify: `src/email_composer.py`
- Test: `tests/test_email_composer.py` (append)

**Interfaces:**
- Consumes: `_make_llm` from `src.agents.graph` (imported lazily inside `_default_llm`).
- Produces: `compose_draft(..., llm=None)` now uses `llm or _default_llm()`; the AI branch returns `{"generated_by": "ai"}`; anything that raises (including missing key) falls back to `generated_by: "template"`.

- [ ] **Step 1: Failing tests**

Append to `tests/test_email_composer.py`:
```python
class _FakeLLM:
    def __init__(self, reply: str):
        self.reply = reply

    def invoke(self, messages):
        class R:
            content = self.reply
        return R()


def test_ai_refines_when_llm_provided():
    reply = '{"subject": "AI subject", "body": "## AI body\\n\\nRefined text."}'
    out = compose_draft(_summary(), llm=_FakeLLM(reply))
    assert out["generated_by"] == "ai"
    assert out["subject"] == "AI subject"
    assert "Refined text." in out["body"]


def test_bad_llm_json_falls_back_to_template():
    out = compose_draft(_summary(), llm=_FakeLLM("not json at all"))
    assert out["generated_by"] == "template"
    assert out["body"]


def test_llm_exception_falls_back_to_template():
    class Boom:
        def invoke(self, messages):
            raise RuntimeError("key missing")
    out = compose_draft(_summary(), llm=Boom())
    assert out["generated_by"] == "template"
```

- [ ] **Step 2: Verify failure**

Run: `python -m pytest tests/test_email_composer.py::test_ai_refines_when_llm_provided -q`
Expected: FAIL — `generated_by` is `"template"`.

- [ ] **Step 3: Implement**

Add to `src/email_composer.py`:
```python
import json
import re

_COMPOSE_PROMPT = """You write a short internal email draft for a PE platform.
Current draft (markdown-lite, keep it):
---
{current}
---
Rules:
- Output ONLY JSON: {{"subject": "...", "body": "..."}}
- body uses markdown-lite: "## " section titles, "**bold**", "- " bullets, no tables.
- Keep it under 2000 characters. Preserve the metrics numbers exactly.
{extra}"""


def _default_llm():
    from src.agents.graph import _make_llm
    return _make_llm(temperature=0.4)


def _compose_with_llm(summary, template_key, tone, instructions, llm) -> dict | None:
    current = _build_body(summary, template_key, tone, instructions)
    extra = ""
    if instructions:
        extra = f"- Incorporate this focus: {instructions}\n"
    from langchain_core.messages import HumanMessage, SystemMessage

    resp = llm.invoke([
        SystemMessage(content="You format valid JSON only."),
        HumanMessage(content=_COMPOSE_PROMPT.format(current=current, extra=extra)),
    ])
    text = str(getattr(resp, "content", resp))
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    parsed = json.loads(m.group(0))
    subject = str(parsed.get("subject", "")).strip()
    body = str(parsed.get("body", "")).strip()
    if not subject or not body:
        return None
    return {"subject": subject, "body": body, "generated_by": "ai"}
```

Replace `compose_draft` body:
```python
def compose_draft(summary, template_key="digest", tone="professional",
                  instructions="", llm=None):
    if llm is None:
        try:
            llm = _default_llm()
        except Exception:
            llm = None
    if llm is not None:
        try:
            refined = _compose_with_llm(summary, template_key, tone, instructions, llm)
            if refined:
                return refined
        except Exception:
            pass  # any AI failure -> deterministic template
    body = _build_body(summary, template_key, tone, instructions)
    return {
        "subject": _build_subject(summary, template_key),
        "body": body,
        "generated_by": "template",
    }
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest tests/test_email_composer.py -q`
Expected: PASS (8 passed).

- [ ] **Step 5: Commit**

```bash
git add src/email_composer.py tests/test_email_composer.py
git commit -m "feat: AI email refinement with automatic template fallback"
```

---

### Task 3: `graph_mail` — draft listing + content type + testable DB path

**Files:**
- Modify: `src/graph_mail.py`
- Test: `tests/test_graph_mail.py`

**Interfaces:**
- Produces: `DEMO_DB_PATH = "./data/graph_drafts.db"`; `create_draft(subject, body, to=None, content_type: str = "text", db_path: str | None = None) -> dict`; `list_drafts(limit: int = 20, db_path: str | None = None) -> list[dict]`; `_save_demo_draft` accepts `db_path`.

- [ ] **Step 1: Failing tests**

`tests/test_graph_mail.py`:
```python
from src import graph_mail


def test_demo_draft_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(graph_mail, "configured", lambda: False)
    db = str(tmp_path / "drafts.db")
    created = graph_mail.create_draft(
        "Weekly digest", "## Summary\n\n47 queries.", to=["a@b.c"], db_path=db
    )
    assert created["demo"] is True
    assert created["id"].startswith("demo-draft-")
    drafts = graph_mail.list_drafts(db_path=db)
    assert len(drafts) == 1
    assert drafts[0]["subject"] == "Weekly digest"
    assert drafts[0]["to"] == "a@b.c"
    assert drafts[0]["demo"] is True


def test_demo_drafts_newest_first(tmp_path, monkeypatch):
    monkeypatch.setattr(graph_mail, "configured", lambda: False)
    db = str(tmp_path / "drafts.db")
    graph_mail.create_draft("first", "one", db_path=db)
    graph_mail.create_draft("second", "two", db_path=db)
    drafts = graph_mail.list_drafts(db_path=db)
    assert [d["subject"] for d in drafts] == ["second", "first"]


def test_create_draft_rejects_bad_content_type(tmp_path, monkeypatch):
    monkeypatch.setattr(graph_mail, "configured", lambda: False)
    db = str(tmp_path / "drafts.db")
    try:
        graph_mail.create_draft("s", "b", content_type="video", db_path=db)
        assert False, "expected ValueError"
    except ValueError:
        pass
```

- [ ] **Step 2: Verify failure**

Run: `python -m pytest tests/test_graph_mail.py -q`
Expected: FAIL — `list_drafts` missing / `db_path` arg missing.

- [ ] **Step 3: Implement**

In `src/graph_mail.py`: add `DEMO_DB_PATH = "./data/graph_drafts.db"`, `_ALLOWED_CONTENT_TYPES = ("text", "html")`, `_demo_db(db_path)`; make `_save_demo_draft` use its `db_path` arg; rewrite `create_draft` and add `list_drafts` per Task 3 code above (real Graph path uses `mailFolders/Drafts/messages`).

- [ ] **Step 4: Run tests**

Run: `python -m pytest tests/test_graph_mail.py -q`
Expected: PASS (3 passed). `python -m pytest tests/test_summary.py -q` stays green.

- [ ] **Step 5: Commit**

```bash
git add src/graph_mail.py tests/test_graph_mail.py
git commit -m "feat: list saved drafts and support html content type in graph mail"
```

---

### Task 4: Routes — generate draft + list drafts

**Files:**
- Modify: `src/api/routes/graph_mail.py`
- Test: `tests/test_graph_api.py`

**Interfaces:**
- Consumes: `compose_draft` (Task 1/2), `SummaryGenerator`, `graph_mail.list_drafts/create_draft` (Task 3).
- Produces: `POST /api/graph/mail/draft/generate` (`DraftGenerateRequest {period, template, tone, instructions, to}`) → `{"subject","body","to","generated_by","period"}`; `GET /api/graph/mail/drafts?limit=` → `{"drafts": [...]}`; `DraftRequest.content_type` validated.

- [ ] **Step 1: Failing tests**

`tests/test_graph_api.py`:
```python
from fastapi.testclient import TestClient

from src.api.main import app
from src.compliance.summary import SummaryGenerator


def _fake_summary(*args, **kwargs):
    return {
        "total_queries": 3,
        "avg_confidence": 0.8,
        "agent_breakdown": [{"agent": "due_diligence", "count": 3, "pct": 100.0}],
        "top_queries": [{"query": "Risks?", "agent": "due_diligence",
                         "confidence": 0.8, "timestamp": "2026-09-01T00:00:00"}],
        "user_activity": [{"user": "local", "queries": 3}],
    }


def test_generate_returns_template_without_key(monkeypatch):
    monkeypatch.setattr(SummaryGenerator, "generate", _fake_summary)
    client = TestClient(app)
    res = client.post("/api/graph/mail/draft/generate",
                      json={"period": "week", "template": "digest"})
    assert res.status_code == 200
    body = res.json()
    assert body["generated_by"] == "template"
    assert body["subject"]
    assert "due_diligence" in body["body"]


def test_drafts_demo_roundtrip_via_api(monkeypatch, tmp_path):
    import src.graph_mail as gm
    monkeypatch.setattr(gm, "configured", lambda: False)
    monkeypatch.setattr(gm, "DEMO_DB_PATH", str(tmp_path / "d.db"))
    client = TestClient(app)
    assert client.post("/api/graph/mail/drafts", json={"subject": "s", "body": "b"}).status_code == 200
    drafts = client.get("/api/graph/mail/drafts").json()["drafts"]
    assert len(drafts) == 1 and drafts[0]["subject"] == "s"


def test_draft_content_type_validation():
    client = TestClient(app)
    res = client.post("/api/graph/mail/drafts",
                      json={"subject": "s", "body": "b", "content_type": "video"})
    assert res.status_code == 400
```

- [ ] **Step 2: Verify failure**

Run: `python -m pytest tests/test_graph_api.py -q`
Expected: FAIL — 404 for the new endpoints.

- [ ] **Step 3: Implement**

In `src/api/routes/graph_mail.py` (see Task 4 code in the plan text): add `DraftGenerateRequest`, `generate_draft`, `list_drafts`; extend `DraftRequest` + validation.

- [ ] **Step 4: Run tests**

Run: `python -m pytest tests/test_graph_api.py tests/test_graph_mail.py tests/test_email_composer.py tests/test_summary.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/routes/graph_mail.py tests/test_graph_api.py
git commit -m "feat: AI draft generation and saved-drafts endpoints"
```

---

### Task 5: Frontend types + API client

**Files:**
- Modify: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`

- [ ] **Step 1: Append types** — `EmailTemplateKey`, `EmailTone`, `ComposerDraft`, `SavedDraft` (exact shapes in plan text).

- [ ] **Step 2: Append api functions** — `generateAiDraft`, `fetchGraphDrafts`; add type imports.

- [ ] **Step 3: Typecheck** — `cd frontend && npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts
git commit -m "feat: frontend types and api for AI drafts and saved drafts"
```

---

### Task 6: `EmailComposer` component

**Files:**
- Create: `frontend/src/components/EmailComposer.tsx`

**Interfaces:**
- Props: `{ period: "week" | "month"; mailActive: boolean; demo?: boolean; onSaved?: (saved: { subject: string; demo?: boolean }) => void }`.
- Produces: subject input, To input, template chips, tone chips, instructions, "Draft with AI" (uses `generateAiDraft`; note when `generated_by === "template"`), Write/Preview tabs (preview = `<EmailPreview text={body}/>`), body textarea, "Save to Outlook drafts" (`createGraphDraft`), status lines, all local state.

- [ ] **Step 1: Write the component** (full code in component sketch; reuse panel styling).

- [ ] **Step 2: Typecheck** — clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/EmailComposer.tsx
git commit -m "feat: email composer with AI draft, preview tabs, and save"
```

---

### Task 7: `DraftsPanel` component

**Files:**
- Create: `frontend/src/components/DraftsPanel.tsx`

- [ ] **Step 1: Write the component** — props `{ drafts: SavedDraft[]; demo?: boolean }`; list rows + empty state.

- [ ] **Step 2: Typecheck** — clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DraftsPanel.tsx
git commit -m "feat: saved drafts panel"
```

---

### Task 8: Rewrite `/summary` page

**Files:**
- Modify: `frontend/src/app/summary/page.tsx`

- [ ] **Step 1: Rewrite** — two-column layout: `EmailComposer` left; right = existing Recent mail panel + `DraftsPanel` (drafts loaded via `fetchGraphDrafts`, refreshed on save).

- [ ] **Step 2: Typecheck** — clean.

- [ ] **Step 3: Browser verification** — steps in plan text (demo generate → template note; preview; save; drafts list; inbox expand).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/summary/page.tsx
git commit -m "feat: rebuild summary page as compose workspace with drafts list"
```

---

### Task 9: Docs + full verification

**Files:**
- Modify: `.env.example`, `README.md`

- [ ] **Step 1-2: Docs** — Graph block note + README endpoints/templates/demo lines.

- [ ] **Step 3: Full verification** — backend pytest set + `npx tsc --noEmit && npx next build`.

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document AI email composer and Graph mail endpoints"
```
