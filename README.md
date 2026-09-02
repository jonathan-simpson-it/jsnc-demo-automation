# PE AI Engineering Platform

> AI-powered Private Equity workflow automation with RAG and multi-agent systems.
> Three-tier stack: Astro marketing site, Next.js dynamic app, FastAPI backend.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Frontend (Next.js)](#frontend-nextjs)
- [Backend (FastAPI)](#backend-fastapi)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
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

```
+-------------------+     +-------------------+     +-------------------+
|   Astro Site      |     |   Next.js App     |     |   FastAPI Backend |
|   (web/)          |     |   (frontend/)     |     |   (src/api/)      |
|                   |     |                   |     |                   |
| Static marketing  |     | Dynamic app pages |     | REST API server   |
| services, blog,   |     | chat, documents,  |     | agents, RAG,      |
| work, contact     |     | eval, config,     |     | document mgmt,    |
|                   |     | summary           |     | audit trail       |
| Port: static      |     | Port: 3000        |     | Port: 8000        |
+-------------------+     +--------+----------+     +--------+----------+
                                    |                         |
                                    |  API proxy             |
                                    +--------> /api/*  ------+
                                              (via next.config.js rewrites)
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
| **SQLite** | built-in | Client, project, tag, and OneDrive token storage |
| **pypdf** | >=4.0 | PDF text extraction |
| **Pydantic** | >=2.0 | Data validation and models |
| **Python** | >=3.11 | Runtime |

---

## Frontend (Next.js)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Agent Launcher** | Logo, 5 agent cards with SVG icons, "Open" button per agent, system status, utility links |
| `/chat?agent=type` | **AI Chat** | Streaming SSE chat with agent pre-selection, message history, citation display, pipeline inspector |
| `/documents` | **Document Manager** | Sidebar with client/project/tag filters, drag-drop upload, OneDrive tab, assign modal, inline tagging |
| `/eval` | **Eval Dashboard** | Accuracy metrics, per-document breakdown, question results with pass/fail, filters |
| `/config` | **Configuration** | System status, API version, features list, agent types |
| `/summary` | **Email Summary** | Week/month reports with demo data, agent usage, recent queries, email preview |

### Components

| Component | Purpose |
|-----------|---------|
| `Header` | Skip-to-content link, serif brand mark, pill-shaped nav with active state |
| `Footer` | 5-column JS\&C grid: brand wordmark, Connect, Read, Help, Start columns |
| `StatusBadge` | System health indicator (green/yellow/red dot + label) |
| `ChatMessage` | User/assistant message bubbles with agent label, citations, trace summary |
| `PipelineInspector` | Expandable panel showing confidence bar, agent path, per-node timing bars |

### Lib Modules

| Module | Exports |
|--------|---------|
| `api.ts` | `fetchHealth`, `fetchAgents`, `streamAgent` (async generator), `uploadDocument`, `fetchDocumentList`, `assignDocument`, `addDocumentTag`, `removeDocumentTag`, `fetchClients`, `createClient`, `fetchProjects`, `createProject`, `fetchTags`, `createTag`, `fetchOneDriveStatus`, `fetchOneDriveFiles`, `importFromOneDrive`, `connectOneDrive`, `disconnectOneDrive` |
| `types.ts` | TypeScript interfaces matching all Pydantic models + `Client`, `Project`, `Tag`, `OneDriveFile`, `OneDriveStatus` |
| `utils.ts` | `parseCitation`, `traceSummary`, `formatMs`, `cn` |

### Streaming Chat

The chat page uses Server-Sent Events (SSE) for real-time streaming:

```
User types query
  -> POST /api/agents/execute/stream
  -> Backend streams events: { node: "classify" }, { node: "search" }, ...
  -> Frontend displays current pipeline node in real-time
  -> Final event: { done: true, response: { agent_type, result, citations, metadata } }
```

The `streamAgent()` function is an async generator that yields `StreamEvent` objects as they arrive.

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
| `GET` | `/api/summary` | Generate email summary (POST with period) |
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

## Database Schema

SQLite database at `data/platform.db` with the following tables:

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

Every query passes through: `classify -> search -> narrow -> answer -> verify -> (optional) wide_search`. Each step is a node with conditional edges. The verification loop catches false negatives.

### Per-Document Collections

Each uploaded document gets its own ChromaDB collection, preventing large documents from dominating search results for small ones.

### Auto-Generated Signals

TF-IDF keywords are extracted per document at ingest time and stored as auto-signals for document detection routing.

---

## Project Structure

```
rag-langgraph-langchain/
├── config/
│   └── settings.py              # Pydantic Settings: env vars
├── src/
│   ├── agents/                  # Agent logic (graph, router, prompts)
│   ├── tools/                   # LangChain search tool
│   ├── vector_store/            # ChromaDB wrapper
│   ├── ingestion/               # PDF/TXT/MD loader + chunker
│   ├── core/
│   │   ├── models.py            # Pydantic models
│   │   ├── constants.py         # Enums
│   │   └── database.py          # SQLite: clients, projects, tags, onedrive
│   ├── compliance/              # Compliance checking, audit, RBAC
│   ├── utils/                   # LLM cache, doc signals, confidence
│   └── api/
│       ├── main.py              # FastAPI app (registers all routers)
│       ├── deps.py              # Dependency injection
│       └── routes/
│           ├── agents.py        # Agent execute + stream
│           ├── documents.py     # Upload, list, tag, assign
│           ├── clients.py       # Client CRUD
│           ├── projects.py      # Project CRUD
│           ├── onedrive.py      # OneDrive OAuth + import
│           └── summary.py       # Email summary
├── web/                         # Astro marketing site (unchanged)
├── frontend/                    # Next.js application
│   └── src/
│       ├── app/                 # App Router pages
│       │   ├── page.tsx         # Agent launcher homepage
│       │   ├── layout.tsx       # Root layout with Header/Footer
│       │   ├── globals.css      # JS&C design tokens + components
│       │   ├── chat/page.tsx    # Streaming chat with agent pre-select
│       │   ├── documents/       # Client/project/tag management + OneDrive
│       │   ├── eval/            # Accuracy dashboard
│       │   ├── config/          # System overview
│       │   └── summary/         # Email reports with demo data
│       ├── components/          # Header, Footer, StatusBadge, ChatMessage, PipelineInspector
│       └── lib/
│           ├── api.ts           # API client (fetch, SSE, CRUD, OneDrive)
│           ├── types.ts         # TypeScript interfaces
│           └── utils.ts         # Citation parser, trace summary, formatting
├── data/
│   ├── sample/                  # Sample PE documents
│   ├── uploads/                 # User-uploaded documents
│   ├── chroma/                  # ChromaDB persistence
│   └── platform.db              # SQLite database
├── tests/                       # 115+ tests
├── scripts/                     # Ingest, eval, verification scripts
├── run.sh                       # Starts both FastAPI and Next.js
├── pyproject.toml               # Python dependencies
└── DESIGN-jonathansimpson.md    # JS&C design system spec
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
```

---

## Testing

### Python Tests (115+ tests)

```bash
python -m pytest tests/ -v
```

Covers: API endpoints, agents, tools, vector store, models, compliance, audit, RBAC, chunking, signals, caching, and more.

### Verification Script (14 tests)

```bash
python scripts/verify_changes.py
```

Headless E2E checks: graph builds, classification, parsers, citations, not-found detection, cache, signals, vector store, document detection, conditional edges.

### QA Evaluation

```bash
python scripts/eval_qa.py                # 180 questions
python scripts/eval_qa.py --filter cv    # CV questions only
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
| `ONEDRIVE_CLIENT_ID` | (optional) | Microsoft OAuth client ID |
| `ONEDRIVE_CLIENT_SECRET` | (optional) | Microsoft OAuth client secret |

---

## Progress Log

### Phase 1: Core Backend (completed)

- LangGraph StateGraph with classify -> search -> narrow -> answer -> verify -> wide_search pipeline
- 5 specialized agents: due diligence, term sheet, LP report, compliance, cross-document
- Per-document ChromaDB collections with auto-generated TF-IDF signals
- Document detection with weighted keyword signals
- Citation system with document name, page number, and line number
- LLM response caching (TTL-based, 500 entries)
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
- Python unit tests: 115+ pass
- Build: zero TypeScript errors, zero compilation issues
- No emojis in any source file

---

## License

MIT License
