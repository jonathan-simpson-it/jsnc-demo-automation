# PE AI Engineering Platform

> AI-powered Private Equity workflow automation with RAG and multi-agent systems.
> Three-tier stack: Astro marketing site, Next.js dynamic app, FastAPI backend.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Frontend (Next.js)](#frontend-nextjs)
- [Backend (FastAPI)](#backend-fastapi)
- [Advanced Backend Capabilities](#advanced-backend-capabilities)
- [Database Schema](#database-schema)
- [OneDrive Integration](#onedrive-integration)
- [Design System (JS\&C)](#design-system-jsc)
- [Core Concepts](#core-concepts)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Configuration](#configuration)
- [Progress Log](#progress-log)

---

## Architecture Overview

```mermaid
flowchart LR
    M["Astro Marketing Site (web/)<br/>static: services, blog, work, contact"]
    N["Next.js App (frontend/) · port 3000<br/>chat, documents, eval, config, summary"]
    B["FastAPI Backend (src/api/) · port 8000<br/>REST + SSE: agents, RAG, document mgmt, audit"]
    C["ChromaDB vectors<br/>(data/chroma, per-document collections)"]
    S[("SQLite<br/>(data/*.db)")]

    M -. "links to tool" .-> N
    N -- "/api/* rewrites" --> B
    B <--> C
    B <--> S
```

**Why three tiers?**
- **Astro** handles static marketing pages (services, blog, work, contact) with zero client JS
- **Next.js** handles dynamic application pages (chat, documents, eval) with React state and streaming
- **FastAPI** is a pure API server -- no HTML rendering, no static files, just JSON endpoints

The Next.js app proxies `/api/*` requests to the FastAPI backend via `next.config.js` rewrites, so the frontend never needs to know the backend URL.

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | >=14.2 | Dynamic web application (App Router, TypeScript, Tailwind) |
| **React** | >=18.3 | UI framework |
| **Tailwind CSS** | >=3.4 | Utility-first CSS with JS\&C custom theme |
| **Astro** | latest | Static marketing site (unchanged) |
| **FastAPI** | >=0.115 | REST API backend (async, auto-docs) |
| **LangGraph** | >=0.2 | Agent workflow orchestration (StateGraph) |
| **LangChain** | >=0.3 | LLM framework, tools, document handling |
| **LangChain-DeepSeek** | >=0.1 | DeepSeek API integration |
| **ChromaDB** | >=0.5 | Vector storage and similarity search |
| **SQLite** | built-in | Platform data plus audit, RBAC, model-version, and cache stores |
| **pypdf** | >=4.0 | PDF text extraction |
| **Pydantic** | >=2.0 | Data validation and models |
| **Python** | >=3.11 | Runtime |

---

## Frontend (Next.js)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Launchpad** | Registry-driven category grid of every app (chat, documents, workbenches, radar, developer tools) with SVG icons and "Open" actions; see [Adding an App](#adding-an-app-launchpad) |
| `/chat` | **AI Chat** | Streaming SSE chat with a project workspace rail + saved history, agent pre-selection, suggested-question chips, live pipeline node status, citation display, pipeline inspector, friendly error states, and per-message workspace labels showing which project grounded each answer |
| `/documents` | **Documents** | Client → Project workspace tree sidebar with strict per-project RAG isolation; drop-anywhere upload queue with live per-file progress, OneDrive tab, assign modal, inline tagging |
| `/workbench/term-sheet` | **Term Sheet Workbench** | Pick in-scope documents and extract structured term-sheet data into a result dashboard |
| `/workbench/lp-report` | **LP Report Workbench** | Draft quarterly LP reports from selected documents |
| `/workbench/compliance-audit` | **Compliance Auditor** | Audit documents for SFC/HKMA/AMLO-style compliance gaps |
| `/workbench/filing-cabinet` | **Filing Cabinet** | Drop target-company files into project workspaces with the shared upload experience |
| `/review-hub` | **Review Hub** | Approve, edit-approve, or reject queued AI answers before delivery |
| `/telemetry` | **Pipeline & Cost** | Recent pipeline runs, per-node traces, token usage and DeepSeek cost analytics |
| `/radar` | **Regulatory Radar** | Live SFC/HKMA circular feed with recency-weighted compliance retrieval |
| `/eval` | **Eval Dashboard** | Accuracy metrics, per-document breakdown, question results with pass/fail, filters |
| `/config` | **Configuration** | System status, API version, features list, agent types |
| `/summary` | **Email Reports** | Week/month reports from the audit trail, agent usage, recent queries, email preview |

### Components

| Component | Purpose |
|-----------|---------|
| `Header` | Skip-to-content link, serif brand mark, pill-shaped nav with active state |
| `Footer` | 5-column JS\&C grid: brand wordmark, Connect, Read, Help, Start columns |
| `StatusBadge` | System health indicator (green/yellow/red dot + label) |
| `ChatMessage` | User/assistant message bubbles with agent label, workspace scope label (e.g. `JS&C › Personal`), citations, trace summary; renders suggestion chips under the welcome message with click-to-send |
| `PipelineInspector` | Expandable panel showing confidence bar, agent path, per-node timing bars |
| `Launchpad` | `LaunchpadTile` + `LaunchpadSection`: launchpad-style app tiles and category grids |
| `Workbench` | Shared workbench scaffold: `WorkbenchPage` layout, `DocumentPicker` for in-scope document selection, `ResultPanel` structured output renderer |
| `StructuredOutput` | Renders structured agent JSON (term sheets, LP reports, compliance findings) as a readable result card |
| `CitationList` | Dedicated citation list renderer for sourced answers |
| `StatCard` | Small metric/value card used on dashboards |

### Lib Modules

| Module | Exports |
|--------|---------|
| `api.ts` | `fetchHealth`, `fetchAgents`, `streamAgent` (async generator), `uploadDocument`, `fetchDocumentList`, `assignDocument`, `addDocumentTag`, `removeDocumentTag`, `fetchClients`, `createClient`, `fetchProjects`, `createProject`, `fetchTags`, `createTag`, `fetchOneDriveStatus`, `fetchOneDriveFiles`, `importFromOneDrive`, `connectOneDrive`, `disconnectOneDrive` |
| `types.ts` | TypeScript interfaces matching all Pydantic models + `Client`, `Project`, `Tag`, `OneDriveFile`, `OneDriveStatus` |
| `utils.ts` | `parseCitation`, `traceSummary`, `formatMs`, `cn` |
| `apps.tsx` | Launchpad registry: `LaunchpadApp` type, `LAUNCHPAD_APPS`, `appsByCategory()` |
| `Launchpad.tsx` | `LaunchpadTile`, `LaunchpadSection` components rendering the launchpad grid |

### Adding an App (Launchpad)

The homepage is a launchpad grid driven by the registry in `frontend/src/lib/apps.tsx`. Adding an app takes three steps:

1. **Create the page route** under `frontend/src/app/...`
2. **Register it**: add a `LaunchpadApp` entry to `LAUNCHPAD_APPS` with a `category` from `AppCategory` (`Applications`, `Specialist Agents`, `Workbenches`, `Compliance & Risk`, `Operations`, `Developer`) and an inline SVG icon (`stroke="currentColor"` so it inherits the accent color)
3. **Optional**: add a header-nav entry in `frontend/src/components/Header.tsx` if the app deserves top-level reachability

The homepage renders every category automatically via `appsByCategory()`.

### Streaming Chat

The chat page uses Server-Sent Events (SSE) for real-time streaming:

```
User types query
  -> POST /api/agents/execute/stream
  -> Backend streams events: { node: "classify" }, { node: "search" }, ...
  -> Frontend displays the current pipeline node in the chat header (live)
  -> Final event: { done: true, response: { agent_type, result, citations, metadata } }
```

The `streamAgent()` function is an async generator that yields `StreamEvent` objects as they arrive. Each query also sends the last 6 conversation messages so agents can follow up on earlier context.

**Chat UX (Phase 7):**
- **Suggestion chips** - The welcome message shows 3 agent-specific suggested questions; chips update when the agent selector changes and send their query on click
- **Live pipeline status** - The chat header shows the current graph node ("Classifying query", "Searching documents", ...) with an animated 3-dot indicator while streaming
- **Streaming feedback** - The send button swaps to animated dots while a request is in flight; a "thinking" bubble appears while waiting for the first node event
- **Friendly error handling** - Backend 500s, auth failures (401/403), and network failures are mapped to actionable messages (e.g. "Make sure `DEEPSEEK_API_KEY` is configured") instead of raw errors; a stream that yields no final response shows a rephrase-and-retry hint
- **Agent-aware input** - Placeholder text names the selected agent; an empty state guides first-time users to try a suggestion chip

---

## Backend (FastAPI)

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/agents` | List 5 agents with names and descriptions |
| `POST` | `/api/agents/execute` | Execute agent (non-streaming) |
| `POST` | `/api/agents/execute/stream` | Execute agent with SSE streaming |
| `GET` | `/api/documents/stats` | Document/chunk counts with summaries |
| `GET` | `/api/documents/list` | List documents filtered by client, project, or tag |
| `POST` | `/api/documents/upload` | Upload and auto-ingest document |
| `POST` | `/api/documents/ingest` | Re-ingest all sample documents |
| `PUT` | `/api/documents/{id}/assign` | Assign client and/or project to document |
| `GET` | `/api/documents/tags` | List all tags |
| `POST` | `/api/documents/tags` | Create a new tag |
| `DELETE` | `/api/documents/tags/{id}` | Delete a tag |
| `POST` | `/api/documents/{id}/tags` | Add tag to document |
| `DELETE` | `/api/documents/{id}/tags/{tag_id}` | Remove tag from document |
| `GET` | `/api/clients` | List all clients |
| `POST` | `/api/clients` | Create a client |
| `PUT` | `/api/clients/{id}` | Update a client |
| `DELETE` | `/api/clients/{id}` | Delete a client |
| `GET` | `/api/projects` | List projects (filterable by client_id) |
| `POST` | `/api/projects` | Create a project |
| `PUT` | `/api/projects/{id}` | Update a project |
| `DELETE` | `/api/projects/{id}` | Delete a project |
| `GET` | `/api/onedrive/status` | Check OneDrive connection status |
| `GET` | `/api/onedrive/connect` | Start Microsoft OAuth flow |
| `GET` | `/api/onedrive/callback` | Handle OAuth redirect |
| `GET` | `/api/onedrive/files` | Browse OneDrive files and folders |
| `POST` | `/api/onedrive/import` | Import a file from OneDrive to knowledge base |
| `POST` | `/api/onedrive/disconnect` | Disconnect OneDrive |
| `GET` | `/api/conversations` | List chat history (grouped by project on the client) |
| `POST` | `/api/conversations` | Create a chat conversation (optional `project_id`) |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation and its messages |
| `GET` | `/api/conversations/{id}/messages` | Return a conversation's messages |
| `GET` | `/api/review/queue` | Pending human-review items |
| `POST` | `/api/review/{id}/approve` | Approve (or approve with an edited answer) |
| `POST` | `/api/review/{id}/reject` | Reject without delivering |
| `GET` | `/api/telemetry/runs` | Recent pipeline runs (traces, latency, cost) |
| `GET` | `/api/telemetry/cost` | Token/cost summary by graph node |
| `POST` | `/api/telemetry/reset` | Reset cost totals and run log |
| `GET` | `/api/regulatory/status` | Radar poll state |
| `GET` | `/api/regulatory/feed` | Ingested SFC/HKMA items |
| `POST` | `/api/regulatory/poll` | Run one fetch + ingest cycle |
| `POST` | `/api/summary` | Generate email summary for a given period |
| `GET` | `/api/eval/results` | Return eval results JSON |

### Agent Types

| Agent | Name | Description |
|-------|------|-------------|
| `due_diligence` | Due Diligence Agent | Analyze investment opportunities and conduct due diligence |
| `term_sheet` | Term Sheet Extractor | Extract structured data from term sheets |
| `lp_report` | LP Report Generator | Generate quarterly LP reports |
| `compliance` | Compliance Checker | Check regulatory compliance of documents |
| `cross_doc` | Cross-Document Comparison | Compare and synthesize information across multiple documents |

---

## Advanced Backend Capabilities

Beyond the core endpoints, the backend ships deeper capabilities that drive retrieval quality, pipeline observability, and compliance/governance. Each is marked **active** (on by default), **flag-gated** (off unless enabled via env var, see Configuration), or **library** (implemented and unit-tested, not yet wired into the graph or API).

### Retrieval Engine

| Capability | Status | What it does |
|-----------|--------|--------------|
| Per-document Chroma collections | Active | Dual-write: every chunk lands in a global collection plus a per-document collection; search merges results with fair per-document sampling so one large deck cannot crowd out smaller memos |
| Auto TF-IDF signals | Active | Keyword + bigram signals extracted per document at ingest, stored in collection metadata, and merged with hardcoded weighted signals for document detection |
| Hybrid vector + BM25 search | Active | Pure-Python BM25 (k1=1.5, b=0.75) blended with vector similarity (`0.6 * vector + 0.4 * BM25`) after distance-threshold filtering |
| Query variants | Active | Synonym expansion and year-stripping variants generated when initial retrieval is weak |
| LLM query rewrite | Flag-gated | Optional LLM-based query reformulation (`ENABLE_LLM_REWRITE`) |
| Keyword re-ranker | Library | Dependency-free keyword-precision re-ranking (TF tiebreak); unit-tested but not yet plugged into the hybrid search pipeline |

### Graph Pipeline Details

```
entry -> classify -> search -> narrow -> answer -> [review] -> verify -> [wide_search] -> end
```

- **classify** - Keyword fast-path first, LLM fallback when ambiguous, conversation-aware; skipped entirely when an agent type is forced (`?agent=` or `agent_type` in the API request)
- **search** - Document detection via weighted signals, then hybrid retrieval (above)
- **narrow** - LLM source selection, plus a single-document dominance rule when one source clearly covers the question
- **answer** - LLM generation with retries when the response comes back empty or citation-only
- **review** (optional human-in-the-loop) - With `ENABLE_HUMAN_REVIEW=on` the answer pauses here and supports approve / edit (replaces the answer) / pending; the router exposes a `human_review` state the UI can collect
- **verify** - Groundedness check; an empty, citation-only, or not-found answer escalates to `wide_search` instead of ending
- **wide_search** - "Rescue mode": samples documents round-robin for fair representation, then regenerates a grounded answer
- Every node is traced (`node` + `ms`); traces drive SSE node events, the frontend pipeline inspector, and confidence scoring

### Confidence Scoring

Per-query confidence is computed from real trace signals (`src/utils/confidence.py`) rather than guessed: rescue-path penalties, citation count and source diversity, pipeline depth, and document-scoping bonuses combine into a 0-1 score, with routing-method classification ("routed", "forced", "rescue").

### Compliance & Governance

| Module | Store | What it does |
|--------|-------|--------------|
| Audit log | `data/audit.db` | Tamper-evident, SHA-256 hash-chained record of every query/response with user attribution; integrity verification and regulator export |
| RBAC | `data/rbac.db` | Roles (admin to viewer) with permissions, per-user per-document grants, and `read_all` checks |
| PII redaction | helpers | Detects and redacts HK-specific PII (HKID, phone numbers, addresses, bank accounts, credit cards, email) with overlap-aware priority ordering |
| Explainability reports | helpers | Renders the pipeline trace into a regulator-ready Markdown artifact (per-node timing, rescue-path explanation, sources, confidence justification) for HKMA/SFC-style audits |
| Model version tracking | `data/model_versions.db` | Records each model deployment with a config hash for freeze/rollback evidence |
| Email summary generator | reads audit log | Turns the audit trail into weekly/monthly email-ready Markdown reports (metrics, agent usage %, top queries) |

RBAC, PII redaction, and model-version tracking are exercised by their own unit tests but are not yet wired into the chat execute path or exposed as endpoints.

### Observability & Ops

| Module | What it does |
|--------|--------------|
| Cost tracker | Per-node token and cost accounting at DeepSeek rates ($0.14 / 1M input, $0.28 / 1M output tokens) with thread-safe summary and reset |
| Structured logger | JSON or text logs; a pipeline filter injects query, agent type, node, and latency context into every record |
| Persistent LLM cache | SQLite-backed cache at `data/llm_cache.db` with TTL expiry (1h) and LRU eviction (500 entries) that survives restarts |
| Confidence scoring | See above; feeds the frontend `PipelineInspector` confidence bar |

### Document Processing

| Capability | What it does |
|-----------|--------------|
| Table extraction | Detects pipe-delimited tables in extracted PDF text, parses headers/rows, and re-formats them for reliable retrieval |
| Ingest-time summaries | One-paragraph LLM summary per document, stored in collection metadata and surfaced in the documents list |
| Document versioning | Snapshots document versions to disk with an index and unified-diff comparisons between versions |
| Loader formats | PDF, TXT, and Markdown extraction, chunked at 1000 chars with 200 overlap |

### Standalone Domain Libraries

Implemented and unit-tested, but not yet wired into the graph or API -- so they intentionally do **not** appear as agent cards:

| Module | What it does |
|--------|--------------|
| `CashFlowForecaster` | Revenue/expense projection from financial-model documents |
| `CovenantMonitor` | Covenant ratio breach/warning detection with severity classification |
| Entity linking | Entity detection plus cross-document entity linking |
| Currency & jurisdiction registry | `Currency` / `Jurisdiction` enums with symbols and a jurisdiction-to-regulation table (HKMA/SFC/AMLO, MAS, CSRC, SEC, FCA) |

---

## Database Schema

The platform database lives at `data/platform.db` with the following tables:

```sql
-- Clients (e.g., "Acme Corp", "Enosis")
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Projects (e.g., "Series A Round", "Q3 Audit")
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_id INTEGER,  -- FK -> clients.id
    created_at TEXT DEFAULT (datetime('now'))
);

-- Documents (tracks uploads and OneDrive imports)
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    collection TEXT DEFAULT 'pe_documents',
    chunks INTEGER DEFAULT 0,
    summary TEXT DEFAULT '',
    doc_type TEXT DEFAULT '',
    client_id INTEGER,   -- FK -> clients.id
    project_id INTEGER,  -- FK -> projects.id
    source TEXT DEFAULT 'upload',  -- 'upload' or 'onedrive'
    onedrive_id TEXT,
    onedrive_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tags (e.g., "confidential", "draft", "approved")
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#80988f'
);

-- Document-Tag junction (many-to-many)
CREATE TABLE document_tags (
    document_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (document_id, tag_id)
);

-- Chat history, grouped by project (project_id NULL = Global workspace)
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL DEFAULT 'New chat',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Messages per conversation (citations/trace stored as JSON)
CREATE TABLE conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    agent_type TEXT,
    citations TEXT DEFAULT '[]',
    trace TEXT DEFAULT '[]',
    confidence REAL,
    is_error INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- OneDrive OAuth tokens (single-row, id=1)
CREATE TABLE onedrive_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TEXT,
    user_email TEXT,
    connected_at TEXT DEFAULT (datetime('now'))
);
```

**Relationships:**
- A client has many projects
- A project belongs to one client
- A document can belong to one client and one project
- A document can have many tags (and vice versa)
- A project has many conversations; a conversation has many messages
- A conversation can live in the **Global workspace** (`project_id` NULL) or be scoped to one project

**Storage layout** (all under `data/`): the platform schema above lives in `platform.db`; separate SQLite files back the compliance and caching subsystems described in [Advanced Backend Capabilities](#advanced-backend-capabilities) -- `audit.db` (hash-chained audit trail), `rbac.db` (roles and document grants), `model_versions.db` (model deployment records), and `llm_cache.db` (persistent LLM response cache).

---

## OneDrive Integration

### Setup

1. Go to [Azure Portal](https://portal.azure.com) > App registrations > New registration
2. Set redirect URI to `http://localhost:8000/api/onedrive/callback`
3. Add API permission: `Files.Read.All` (Delegated)
4. Create a client secret
5. Set environment variables:

```bash
ONEDRIVE_CLIENT_ID=your-client-id
ONEDRIVE_CLIENT_SECRET=your-client-secret
```

### Flow

1. User clicks "Connect OneDrive" on the Documents page
2. Redirects to Microsoft login (OAuth 2.0 authorization code flow)
3. After login, callback receives auth code, exchanges for tokens
4. Tokens stored in `onedrive_tokens` table (single row, auto-refresh)
5. User can browse OneDrive folders and import files directly to the knowledge base
6. Imported files are saved to `data/uploads/`, ingested into ChromaDB, and tracked in the `documents` table with `source='onedrive'`

---

## Design System (JS\&C)

All UI follows the JS\&C design system from `DESIGN-jonathansimpson.md`:

### Color Tokens

```css
--color-bg: #f4f4ef        /* warm cream page background */
--color-surface: #ffffff    /* cards, panels, elevated surfaces */
--color-ink: #161714        /* primary text (near-black) */
--color-muted: #5c5e56      /* secondary text (olive-gray) */
--color-line: #d6d8d1       /* borders, dividers */
--color-accent: #80988f     /* sage green (the only color) */
--color-accent-soft: #e3e9e6 /* soft sage for chip backgrounds */
```

### Typography

- **Headings** (h1, h2): Georgia serif, fluid `clamp()` sizing
- **Body**: Inter sans-serif, `0.88rem--1rem`
- **Labels**: Uppercase, `0.72rem`, `letter-spacing: 0.08em`, accent color
- **Buttons**: Uppercase, `0.78rem`, `letter-spacing: 0.06em`, pill-shaped
- **Code**: IBM Plex Mono, `0.82rem`

### Patterns

- **Section intro**: `.section-eyebrow` + h2 + description paragraph
- **Panel card**: 1px border, `border-radius: 1rem`, subtle shadow, hover lift
- **Chip/tag**: Pill-shaped, accent-soft background, line border
- **Container**: `min(72rem, calc(100% - 2.5rem))` centered
- **Section spacing**: `clamp(4rem, 9vw, 7.5rem)` vertical padding

---

## Core Concepts

### RAG (Retrieval-Augmented Generation)

Documents are chunked (~1000 chars, 200 overlap), embedded into ChromaDB vectors, and retrieved at query time. The LLM answers grounded in retrieved chunks with `[Source N: filename, page, line]` citations.

### LangGraph StateGraph

Every query runs through a compiled `StateGraph` of traced nodes with conditional edges:

```mermaid
flowchart LR
    Start(["query"]) --> Classify["classify<br/>keyword fast-path or LLM"]
    Classify --> Search["search<br/>detect document + hybrid retrieve"]
    Search --> Narrow["narrow<br/>pick sources"]
    Narrow --> Answer["answer<br/>generate with retries"]
    Answer -->|"ENABLE_HUMAN_REVIEW"| Review["review<br/>approve / edit / pending"]
    Answer -->|"else"| Verify["verify<br/>groundedness check"]
    Review --> Verify
    Verify -->|"pass"| Done(["response + citations"])
    Verify -->|"empty or not found"| Wide["wide_search<br/>fair rescue pass"]
    Wide --> Done
    Classify -.->|"agent type forced: skip"| Search
```

The verification loop catches false negatives: an answer that is empty, citation-only, or not found in the retrieved sources escalates to a `wide_search` rescue pass instead of ending. With `ENABLE_HUMAN_REVIEW=on`, answers pause at a review node where a human can approve, edit, or defer them. Node execution is traced (node name + duration) and streamed to the frontend as SSE events; see [Advanced Backend Capabilities](#advanced-backend-capabilities) for details on retrieval blending, confidence scoring, and the compliance suite.

### Per-Document Collections

Each uploaded document gets its own ChromaDB collection, preventing large documents from dominating search results for small ones.

### Auto-Generated Signals

TF-IDF keywords are extracted per document at ingest time and stored as auto-signals for document detection routing.

### Project-Scoped Chat & Retrieval

Chats are grouped by **project workspace**. Each conversation stores every turn in SQLite (`conversations` + `conversation_messages`); the chat page's left rail lists history per workspace and each new turn is persisted server-side, with the last 10 messages injected into the graph as conversation context.

Retrieval is isolated by project: when a conversation belongs to a project, the backend resolves that project's document filenames (`documents.project_id`) and restricts the search universe -- document detection, per-document collections, and the wide-search rescue pass -- to those files. The global `pe_documents` fallback is disabled under a scope, so answers can never cite another project's documents. A project with no documents yields an explicit "no documents assigned" notice instead of hallucinated answers. The **Global workspace** (no project) keeps the original unscoped behavior.

---

## Project Structure

```
rag-langraph-langchain/
├── config/
│   └── settings.py               # Pydantic settings: all env vars + feature flags
├── src/
│   ├── agents/                   # Graph pipeline, router, wrappers, domain libs
│   │   ├── graph.py              # StateGraph: classify→search→narrow→answer→review→verify→wide_search
│   │   ├── router.py             # RouterAgent: invoke + SSE streaming
│   │   ├── prompts.py            # Shared prompts, grounding rules, output parsers
│   │   ├── due_diligence.py      # Thin agent wrappers over the shared graph
│   │   ├── term_sheet.py  lp_report.py  compliance.py
│   │   ├── cashflow.py  covenant.py  entities.py   # Standalone analytic libs (unwired)
│   ├── tools/                    # Retrieval tooling
│   │   ├── search.py             # LangChain search tool: doc detection + hybrid search
│   │   ├── bm25.py               # Pure-Python BM25 scorer
│   │   └── reranker.py           # Keyword-precision re-ranker
│   ├── vector_store/
│   │   └── chroma.py             # Dual-write global + per-document collections
│   ├── ingestion/                # PDF/TXT/MD loading, chunking, tables, summaries, versioning
│   ├── core/
│   │   ├── models.py             # Pydantic models
│   │   ├── constants.py          # Enums: agent types, currencies, jurisdictions, ...
│   │   └── database.py           # SQLite: clients, projects, tags, documents, onedrive
│   ├── compliance/               # audit, rbac, redaction, explain, versioning, summary
│   ├── regulatory/               # SFC/HKMA sources, client, ingest, scheduler
│   ├── utils/                    # llm_cache, cost_tracker, confidence, doc_signals, logger, telemetry
│   └── api/
│       ├── main.py               # FastAPI app (registers all routers)
│       ├── deps.py               # Dependency injection (vector store, router)
│       └── routes/               # agents, documents, clients, projects, onedrive, summary
├── web/                          # Astro marketing site (unchanged)
├── frontend/                     # Next.js application
│   └── src/
│       ├── app/                  # App Router pages
│       │   ├── page.tsx          # Agent launcher homepage
│       │   ├── layout.tsx        # Root layout with Header/Footer
│       │   ├── globals.css       # JS&C design tokens + components
│       │   ├── chat/page.tsx     # Streaming chat with agent pre-select + suggestions
│       │   ├── documents/        # Client/project/tag management + OneDrive
│       │   ├── eval/             # Accuracy dashboard
│       │   ├── config/           # System overview
│       │   └── summary/          # Email reports
│       ├── components/           # Header, Footer, StatusBadge, ChatMessage, PipelineInspector
│       └── lib/
│           ├── api.ts            # API client (fetch, SSE, CRUD, OneDrive)
│           ├── types.ts          # TypeScript interfaces
│           └── utils.ts          # Citation parser, trace summary, formatting
├── data/
│   ├── platform.db               # Clients, projects, documents, tags, OneDrive tokens
│   ├── audit.db                  # Hash-chained audit trail
│   ├── rbac.db                   # Roles and document grants
│   ├── model_versions.db         # Model deployment records
│   ├── llm_cache.db              # Persistent LLM response cache
│   ├── sample/                   # Sample PE documents
│   ├── uploads/                  # User-uploaded documents
│   └── chroma/                   # ChromaDB persistence
├── tests/                        # 124 tests across 27 files (pytest + Playwright)
├── scripts/                      # ingest, eval_qa, eval_tricky, verify_changes
├── run.sh                        # Starts both FastAPI and Next.js
├── pyproject.toml                # Python dependencies
├── .env.example                  # Documented environment variables
├── DESIGN-jonathansimpson.md     # JS&C design system spec
├── devano.md                     # Project rules (all diagrams in Mermaid)
└── docs/superpowers/plans/       # Implementation plans (UIplan.md)
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- DeepSeek API key (https://platform.deepseek.com)

### Installation

```bash
# Clone
git clone <repo-url>
cd rag-langgraph-langchain

# Python
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# Frontend
cd frontend && npm install && cd ..

# Environment
cp .env.example .env
# Edit .env and set DEEPSEEK_API_KEY
```

### Run Everything

```bash
# Single command starts both servers
./run.sh

# Or individually:
# Backend:  uvicorn src.api.main:app --reload --port 8000
# Frontend: cd frontend && npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API docs**: http://localhost:8000/docs

### Run with flags

```bash
./run.sh --skip-install     # Skip pip install
./run.sh --skip-ingest      # Skip document ingestion
./run.sh --api-only         # Backend only (no Next.js)
./run.sh --api-port=8001    # Override backend port (default: 8000)
./run.sh --frontend-port=3001  # Override frontend port (default: 3000)
```

---

## Testing

### Python Tests (124 tests across 27 files)

```bash
python -m pytest tests/ -v
```

Coverage by area:

| Area | Files |
|------|-------|
| Agents & graph (incl. human review, cashflow, covenant, entities) | `test_agents`, `test_human_review`, `test_cashflow`, `test_covenant`, `test_entities` |
| Search & retrieval | `test_tools`, `test_search_enhanced`, `test_bm25`, `test_reranker`, `test_vector_store` |
| Compliance & governance | `test_audit`, `test_rbac`, `test_redaction`, `test_explain`, `test_summary`, `test_model_versioning` |
| Ingestion & documents | `test_ingestion`, `test_loader_formats`, `test_tables`, `test_versioning` |
| Utils & models | `test_confidence`, `test_cost_tracker`, `test_logger`, `test_models`, `test_currency_jurisdiction` |
| API & web | `test_api`, `test_webapp` (Playwright E2E) |

### Verification Script (14 tests)

```bash
python scripts/verify_changes.py
```

Headless E2E checks: graph builds, classification, parsers, citations, not-found detection, cache, signals, vector store, document detection, conditional edges.

### QA Evaluation

```bash
python scripts/eval_qa.py                # 180 questions
python scripts/eval_qa.py --filter cv    # CV questions only
python scripts/eval_qa.py --range 0 90   # First 90 questions only
python scripts/eval_qa.py --retry-failed # Re-run only previously failed questions
python scripts/eval_tricky.py            # 15 adversarial questions
```

Current baseline: **170-180/180 (~94%)** at ~2.2 LLM calls per question.

### Frontend Build

```bash
cd frontend && npx next build
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | (required) | DeepSeek API key |
| `DEEPSEEK_MODEL` | `deepseek-chat` | LLM model name |
| `DEEPSEEK_TEMPERATURE` | `0.0` | LLM temperature |
| `CHROMA_PERSIST_DIRECTORY` | `./data/chroma` | ChromaDB storage path |
| `CHROMA_COLLECTION_NAME` | `pe_documents` | Global collection name |
| `CHUNK_SIZE` | `1000` | Max characters per chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `RETRIEVAL_K` | `4` | Default search results |
| `CACHE_DB_PATH` | `./data/llm_cache.db` | LLM response cache location |
| `ENABLE_BM25` | `true` | Hybrid vector + BM25 scoring |
| `ENABLE_LLM_REWRITE` | `false` | LLM query rewrite on weak retrieval |
| `ENABLE_HUMAN_REVIEW` | `false` | Human-in-the-loop review node |
| `ONEDRIVE_CLIENT_ID` | (optional) | Microsoft OAuth client ID |
| `ONEDRIVE_CLIENT_SECRET` | (optional) | Microsoft OAuth client secret |

`EMBEDDING_MODEL`, `LOG_LEVEL`, `ENABLE_RERANKING`, and `ENABLE_ENTITY_LINKING` are declared in `config/settings.py` but are not yet consumed by the code; `ENABLE_BM25` is `true` by default, all other feature flags default to `false`.

---

## Progress Log

### Phase 1: Core Backend (completed)

- LangGraph StateGraph with classify -> search -> narrow -> answer -> verify -> wide_search pipeline
- 5 specialized agents: due diligence, term sheet, LP report, compliance, cross-document
- Per-document ChromaDB collections with auto-generated TF-IDF signals
- Document detection with weighted keyword signals
- Citation system with document name, page number, and line number
- LLM response caching (TTL-based, LRU 500 entries, SQLite-backed persistence)
- 180-question evaluation harness (94% accuracy)
- FastAPI backend with streaming SSE support

### Phase 2: Streamlit Frontend (removed)

- Original Streamlit UI was built and then removed in favor of Next.js
- All Streamlit code, static HTML pages, and emojis deleted

### Phase 3: Next.js Frontend (completed)

**Scaffold:**
- Next.js 14 App Router with TypeScript and Tailwind CSS
- JS\&C custom theme (colors, fonts, spacing, components)
- API proxy via `next.config.js` rewrites to `127.0.0.1:8000`

**Pages built:**
- Agent launcher homepage with SVG icon cards
- Streaming chat with agent pre-selection from URL params
- Documents page with sidebar filters, upload, OneDrive import
- Eval dashboard with accuracy metrics and question breakdown
- Config page with system status and feature list
- Summary page with demo data and email preview

**Components built:**
- Header with skip-to-content link, serif brand mark, pill nav
- Footer with 5-column JS\&C grid, stacked brand wordmark
- StatusBadge, ChatMessage (with citations), PipelineInspector (with timing bars)

**Lib modules:**
- `api.ts`: Full API client with SSE streaming, CRUD operations, OneDrive functions
- `types.ts`: TypeScript interfaces matching all Pydantic models
- `utils.ts`: Citation parser, trace summary, formatting utilities

### Phase 4: Document Management (completed)

**Database (SQLite):**
- `clients` table for organizing documents by client
- `projects` table with optional client assignment
- `documents` table with client, project, source tracking
- `tags` table with color-coded labels
- `document_tags` junction table for many-to-many tagging
- `onedrive_tokens` table for OAuth token storage

**Backend API routes:**
- Client CRUD (`/api/clients`)
- Project CRUD (`/api/projects`)
- Document listing with client/project/tag filters
- Document assignment (set client and project)
- Tag management (create, delete, add to doc, remove from doc)

**Frontend documents page:**
- Left sidebar with three filter sections (clients, projects, tags)
- Inline CRUD for clients, projects, and tags
- Document cards showing client, project, and tags
- Assign modal for setting client and project on any document
- Tag dropdown on each document card for quick tagging
- Tab switching between Local upload and OneDrive import

### Phase 5: OneDrive Integration (completed)

**OAuth flow:**
- Microsoft Azure AD OAuth 2.0 authorization code flow
- Connect button redirects to Microsoft login
- Callback stores access/refresh tokens in SQLite
- Auto-refresh when token expires (5-minute buffer)

**File operations:**
- Browse OneDrive folders and files
- Navigate into subfolders with back button
- One-click import: downloads file, saves to `data/uploads/`, ingests into ChromaDB, tracks in database

**Frontend:**
- OneDrive tab on Documents page
- Connected status indicator
- File browser with folder/file icons
- Import button per file with loading state

### Phase 6: UI Polish (completed)

**JS\&C Design System implementation:**
- Full fluid type scale with `clamp()` (h1: 2.4rem--4.8rem, h2: 1.4rem--2rem)
- Section-intro pattern (eyebrow + h2 + description) on all pages
- `.button` component: pill-shaped, uppercase, letter-spaced, 0.78rem
- `.panel-card` component: border, radius, shadow, hover lift
- `.chip` component: pill-shaped, accent-soft background
- `.input` and `.select` components with sage-green focus states
- `.brand-mark` for serif uppercase wordmark
- `.site-footer` with 5-column grid, brand-large, heading, links, meta
- `.skip-link` for accessibility
- `:focus-visible` outline on all interactive elements
- `prefers-reduced-motion` fully respected
- Container: `min(72rem, calc(100% - 2.5rem))`

**Verification:**
- Playwright E2E tests: 9/9 pages pass, all API proxies work
- Python unit tests: 124 pass across 27 files
- Build: zero TypeScript errors, zero compilation issues
- No emojis in any source file

### Phase 7: Chat Experience Overhaul (completed)

- Suggested-question chips on the welcome message, agent-specific and updated live when the agent selector changes; clicking a chip sends the query immediately
- Agent-aware input placeholder ("Ask the Due Diligence Agent...") and clearer empty-state guidance
- Live pipeline node indicator in the chat header (e.g. "Classifying query") with animated 3-dot status
- Animated streaming dots in the send button and a "thinking" bubble while a request is in flight
- Friendly error handling: backend 500s, auth failures, and network failures map to actionable messages instead of raw errors; a stream with no final response shows a rephrase-and-retry hint
- Conversation context: the last 6 messages are sent with each query so follow-ups stay grounded

**Verification:**
- Frontend build clean; existing Playwright (9/9) and Python (124) suites unaffected
- `.suggestion-chip` and `.streaming-dots` components respect `prefers-reduced-motion`

### Phase 8: Project-Scoped Chat History (completed)

- `conversations` and `conversation_messages` tables with server-side persistence of every turn (citations, trace, confidence, error flag stored per message)
- Chat page left rail grouped by project workspace: workspace selector (Global + projects), conversation list with auto-titles and relative timestamps, new-chat, delete with confirmation; drawer mode on small screens
- Conversation context is now server-authoritative: the last 10 stored messages feed the graph each turn (this also fixed a latent bug where client-sent history was silently dropped by the API)
- RAG isolation by project: detection, per-document collection search, and the wide-search rescue pass are restricted to the conversation project's documents; the global fallback is disabled under a scope; empty projects get an explicit notice
- Conversation API: list / create / delete / messages endpoints; multi-turn context tested end-to-end via SSE

### Phase 9: Launchpad Apps, Review Hub, Telemetry & Regulatory Radar (completed)

- **Launchpad homepage** (registry-driven `frontend/src/lib/apps.tsx` + shared `Launchpad` components): the homepage is now a category grid of every app; adding an app = page route + one registry entry
- **Analyst workbenches**: Term Sheet Workbench, LP Report Workbench, Compliance Auditor, and Filing Cabinet pages drive the existing agents over picked documents with structured result dashboards + full audit trail; uploads now accept `.docx`/`.xlsx` (parser already existed)
- **Human-in-the-Loop Review Hub**: `review_queue` persistence + `/api/review/*`; rescue-path / low-confidence / error answers (or every answer under `ENABLE_HUMAN_REVIEW`) queue for approve / edit-approve / reject before delivery; approved answers land in chat history; the chat page shows a pending-review notice
- **Pipeline Inspector & Cost Dashboard**: LLM calls in the graph are now cost-tracked per node (char-estimated tokens), runs are logged in a bounded in-memory ring, `/api/telemetry/*` endpoints expose runs/cost/reset, and the `/telemetry` app shows cost cards, per-node tables and per-run traces
- **Regulatory Radar**: `src/regulatory/` — SFC/HKMA source config, fixture-driven fetch adapter (offline-safe), chunked ingestion into per-item collections tagged with regulator/issuance_date/category + auto-signals, idempotent feed table, manual + daily-asyncio polling, and **recency-weighted compliance retrieval**; `/radar` shows the feed grouped by regulator with impact-summary slots (live summarization requires an LLM-reachable environment; failure-safe)

---

## License

MIT License
