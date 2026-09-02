# PE AI Engineering Portfolio

> AI-powered Private Equity workflow automation with RAG and multi-agent systems.

## System Flow

```mermaid
flowchart TD
    %% ============ INGESTION ============
    subgraph INGESTION["📥 Document Ingestion"]
        A1[("File Upload\nPDF/TXT/MD")]
        A2[Load & Parse\nloader.py]
        A3[Chunk + TF-IDF\nchunker.py]
        A4[Vector Store\nchroma.py]
        A5[(Per-Document Collections)]
        A6[(Global Collection)]
        A7[Auto-Generated Signals]

        A1 --> A2 --> A3 --> A4
        A4 --> A5
        A4 --> A6
        A3 --> A7
        A7 --> A5
    end

    %% ============ QUERY PROCESSING ============
    subgraph QUERY["🔍 Query Processing Pipeline"]
        B1[("User Query")]
        B2[Classify Node\nclassify_node]
        B3[Search Node\nsearch_node]
        B4[Narrow Node\nnarrow_node]
        B5[Answer Node\nanswer_node]
        B6{Verified?}
        B7[Verify Node\nverify_node]
        B8[Wide Search Node\nwide_search_node]
        B9[("Final Answer\nwith Citations")]

        B1 --> B2
        B2 --> B3
        B3 --> B4
        B4 --> B5
        B5 --> B6
        B6 -- Yes --> B9
        B6 -- No --> B7
        B7 --> B6
        B6 -- Still No --> B8
        B8 --> B6
    end

    %% ============ SEARCH STRATEGIES ============
    subgraph SEARCH["🔎 Search Strategies (search_node)"]
        C1[Query Input]
        C2[Detect Document\nKeyword Signals]
        C3[Generate Query Variants]
        C4[Primary Vector Search]
        C5[Keyword Extraction Search]
        C6[Synonym Expansion Search]
        C7[Year Stripping Search]
        C8[Document-Scoped Search]
        C9[Filter: MAX_DISTANCE ≤ 2.0]
        C10[Deduplicate & Merge]

        C1 --> C2
        C2 --> C3
        C3 --> C4
        C3 --> C5
        C3 --> C6
        C3 --> C7
        C4 --> C8
        C5 --> C8
        C6 --> C8
        C7 --> C8
        C8 --> C9
        C9 --> C10
    end

    %% ============ AGENT TYPES ============
    subgraph AGENTS["🤖 Agent Types"]
        D1[Due Diligence\n→ DueDiligenceResult]
        D2[Term Sheet\n→ TermSheetData]
        D3[LP Report\n→ LPReport]
        D4[Compliance\n→ ComplianceCheck]
        D5[Router\nclassifies query]
    end

    %% ============ VERIFICATION LOOP ============
    subgraph VERIFY["✅ Verification Loop"]
        E1[Answer: "Not Found?"]
        E2[Re-examine Same Sources]
        E3[Found?]
        E4[Wide Search k=60]
        E5[Re-answer with Expanded Context]

        E1 -- Yes --> E2
        E2 --> E3
        E3 -- Yes --> E5
        E3 -- No --> E4
        E4 --> E5
    end

    %% ============ CITATION SYSTEM ============
    subgraph CITATIONS["📎 Citation System"]
        F1[Source Chunks\nwith metadata]
        F2[Extract: filename, page, line]
        F3[Format: [Source N: file, page X, line Y]]
        F4[Parser strips citations\nfor structured fields]
        F5[Fallback if empty after strip]

        F1 --> F2 --> F3
        F3 --> F4
        F4 --> F5
    end

    %% ============ CONNECTIONS ============
    B2 -.-> D5
    B3 -.-> SEARCH
    B5 -.-> VERIFY
    B5 -.-> AGENTS
    B5 -.-> CITATIONS

    %% ============ EXTERNAL ============
    U[("User")]
    API[FastAPI\n/api/agents/execute]
    UI[Streamlit\nChat UI]

    U --> API
    U --> UI
    API --> B1
    UI --> B1
    B9 --> U

    %% ============ STYLING ============
    classDef ingestion fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef query fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef search fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef agents fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef verify fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef citations fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
    classDef external fill:#eceff1,stroke:#455a64,stroke-width:2px

    class A1,A2,A3,A4,A5,A6,A7 ingestion
    class B1,B2,B3,B4,B5,B6,B7,B8,B9 query
    class C1,C2,C3,C4,C5,C6,C7,C8,C9,C10 search
    class D1,D2,D3,D4,D5 agents
    class E1,E2,E3,E4,E5 verify
    class F1,F2,F3,F4,F5 citations
    class U,API,UI external
```

## Quick Start

```bash
# Install
python -m venv venv && source venv/bin/activate
pip install -e ".[dev]"

# Configure
cp .env.example .env
# Set DEEPSEEK_API_KEY in .env

# Ingest samples
python scripts/ingest.py

# Run
./run.sh  # Starts API (8000) + Streamlit (8501)
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agents/execute` | Execute agent with query |
| `POST` | `/api/documents/upload` | Upload & auto-ingest document |
| `GET` | `/api/documents/stats` | Document/chunk counts |

## Testing

```bash
pytest tests/ -v                    # 27 unit tests
python scripts/verify_changes.py    # 14 E2E verification tests
python scripts/eval_qa.py           # 180 QA evaluation questions
```

## Architecture Highlights

- **LangGraph StateGraph** with conditional edges for retry loops
- **Per-document ChromaDB collections** prevent large docs from drowning small ones
- **5 search strategies** combined (primary, keyword, synonym, year-strip, scoped)
- **Verification loop** catches ~30% false negatives
- **TF-IDF auto-signals** for zero-config document detection on new uploads
- **Citation system** with page/line tracking for all sources