"""Streamlit UI for PE AI Engineering Portfolio."""

import json
from pathlib import Path

import streamlit as st

from src.agents.router import RouterAgent
from src.core.models import (
    ComplianceCheck,
    DueDiligenceResult,
    LPReport,
    TermSheetData,
)
from src.ui.components import (
    render_agent_selector,
    render_compliance_check,
    render_due_diligence_result,
    render_lp_report,
    render_term_sheet_data,
)
from src.vector_store.chroma import VectorStore


def init_session_state():
    """Initialize Streamlit session state."""
    if "vector_store" not in st.session_state:
        st.session_state.vector_store = VectorStore()
    if "router_agent" not in st.session_state:
        st.session_state.router_agent = RouterAgent(
            vector_store=st.session_state.vector_store
        )
    if "messages" not in st.session_state:
        st.session_state.messages = []


def main():
    """Main Streamlit application."""
    st.set_page_config(
        page_title="PE AI Engineering Portfolio",
        page_icon="🏦",
        layout="wide",
    )

    st.title("🏦 PE AI Engineering Portfolio")
    st.markdown("AI-powered Private Equity workflow automation with RAG and multi-agent systems")

    init_session_state()

    # Sidebar
    with st.sidebar:
        st.header("Configuration")
        agent_type = render_agent_selector()

        st.divider()
        st.header("📤 Upload Documents")
        uploaded_files = st.file_uploader(
            "Upload PDF, TXT, or MD files to the knowledge base",
            type=["pdf", "txt", "md"],
            accept_multiple_files=True,
            key="file_uploader",
        )

        if uploaded_files:
            for uf in uploaded_files:
                # Save to data/uploads
                upload_dir = Path("data/uploads")
                upload_dir.mkdir(parents=True, exist_ok=True)
                file_path = upload_dir / uf.name
                file_path.write_bytes(uf.read())

                # Ingest into vector store with location tracking
                try:
                    from src.ingestion.loader import _infer_doc_type, _load_text_with_lines, _load_pdf_with_pages
                    from src.ingestion.chunker import chunk_documents

                    suffix = file_path.suffix.lower()
                    if suffix == ".pdf":
                        locations = _load_pdf_with_pages(file_path)
                    else:
                        locations = _load_text_with_lines(file_path)

                    content_text = "\n\n".join(loc["text"] for loc in locations if loc["text"].strip())
                    if content_text.strip():
                        doc_type = _infer_doc_type(file_path)
                        doc = {
                            "content": content_text,
                            "metadata": {"source": str(file_path), "filename": uf.name},
                            "locations": locations,
                            "doc_type": doc_type.value,
                        }
                        chunks = chunk_documents([doc])
                        st.session_state.vector_store.add_documents(chunks)
                        st.success(f"✅ {uf.name} — ingested ({len(chunks)} chunks)")
                    else:
                        st.warning(f"⚠️ {uf.name} — no extractable text")
                except Exception as e:
                    st.error(f"❌ {uf.name} — {e}")

        st.divider()
        st.header("About")
        st.markdown("""
        **Portfolio Project:**
        - LangGraph multi-agent orchestration
        - RAG with ChromaDB
        - DeepSeek API integration
        - FastAPI backend
        - Streamlit UI
        """)

    # Chat interface
    st.header("💬 Chat Interface")

    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            if message["role"] == "assistant" and "agent_type" in message:
                # Re-render structured component from stored data
                _render_stored_response(message)
            else:
                st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Ask about PE deals, term sheets, compliance, or reports..."):
        # Display user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get agent response
        with st.chat_message("assistant"):
            with st.spinner("Processing..."):
                # Build conversation history for multi-turn context
                conversation_history = []
                for msg in st.session_state.messages[-6:]:  # Last 6 messages
                    if msg["role"] in ("user", "assistant"):
                        conversation_history.append({
                            "role": msg["role"],
                            "content": msg["content"][:500],  # Truncate for token efficiency
                        })

                response = st.session_state.router_agent.invoke(
                    query=prompt,
                    agent_type=agent_type,
                    conversation_history=conversation_history,
                )

                # Parse and render the response
                rendered = False
                try:
                    result_data = json.loads(response.result)
                    citations = response.citations

                    if response.agent_type == "due_diligence":
                        result = DueDiligenceResult(**result_data)
                        render_due_diligence_result(result, citations=citations)
                        rendered = True
                    elif response.agent_type == "term_sheet":
                        result = TermSheetData(**result_data)
                        render_term_sheet_data(result, citations=citations)
                        rendered = True
                    elif response.agent_type == "lp_report":
                        result = LPReport(**result_data)
                        render_lp_report(result, citations=citations)
                        rendered = True
                    elif response.agent_type == "compliance":
                        result = ComplianceCheck(**result_data)
                        render_compliance_check(result, citations=citations)
                        rendered = True
                except (json.JSONDecodeError, Exception):
                    pass

                if not rendered:
                    st.markdown(response.result)

                # Store with structured data for replay
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response.result,
                    "agent_type": response.agent_type if rendered else None,
                    "citations": response.citations if rendered else [],
                })


def _render_stored_response(message: dict) -> None:
    """Re-render a structured response from stored message data."""
    try:
        result_data = json.loads(message["content"])
        agent_type = message["agent_type"]
        citations = message.get("citations", [])

        if agent_type == "due_diligence":
            render_due_diligence_result(DueDiligenceResult(**result_data), citations=citations)
        elif agent_type == "term_sheet":
            render_term_sheet_data(TermSheetData(**result_data), citations=citations)
        elif agent_type == "lp_report":
            render_lp_report(LPReport(**result_data), citations=citations)
        elif agent_type == "compliance":
            render_compliance_check(ComplianceCheck(**result_data), citations=citations)
        else:
            st.markdown(message["content"])
    except Exception:
        st.markdown(message["content"])


if __name__ == "__main__":
    main()
