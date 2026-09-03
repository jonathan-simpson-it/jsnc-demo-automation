# Regulatory Radar (SFC/HKMA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Regulatory Radar" app: fetch SFC + HKMA circular/press pages on a manual trigger or daily asyncio schedule, store them in a dedicated per-item Chroma collections set tagged with regulator/date metadata, boost recent items in compliance retrieval, and show a feed with impact summaries.

**Architecture:** New `src/regulatory/` package: `sources.py` (source config), `client.py` (httpx with offline fixture fallback), `ingest.py` (chunk + add to vector store with temporal metadata + auto signals), `scheduler.py` (asyncio daily loop); SQLite `regulatory_feed` table tracks fetched items (idempotent); `/api/regulatory/*` endpoints; launchpad app `/radar`.

**Tech Stack:** FastAPI asyncio, httpx (already a dep via onedrive), existing chunker/vector store/settings, Next.js 14.

**Spec:** Launchpad vision item 7 + SFC/HKMA scraper section. Decisions: manual "Check now" + daily asyncio background task (no APScheduler); fixture-driven adapters (sandbox is offline); per-circular scoped chat deferred to a follow-up (flagged tradeoff).

## Global Constraints

- No git commits; no new runtime deps (stdlib html parsing; httpx ok).
- Offline sandbox: adapters MUST parse saved fixtures under `tests/fixtures/regulatory/`; network calls guarded so failures set `last_error` and never crash the app.
- New settings in `config/settings.py`: `enable_regulatory_poll: bool = True`, `regulatory_poll_hours: int = 24`.
- Tests offline: monkeypatch `client.fetch_*`; isolated temp-db pattern for feed rows.
- Frontend: `tsc --noEmit`; no emojis; JS&C tokens.

---

### Task 1: Regulatory sources config + settings

**Files:**
- Create: `src/regulatory/__init__.py`, `src/regulatory/sources.py`
- Modify: `config/settings.py`

- [ ] **Step 1:** `sources.py`:

```python
from dataclasses import dataclass
@dataclass(frozen=True)
class RegulatorySource:
    key: str; regulator: str; kind: str; url: str; html_fixture: str
SOURCES = [
    RegulatorySource("sfc_circulars", "SFC", "circular",
        "https://www.sfc.hk/en/Regulatory-functions/Intermediaries/Circulars-to-licensed-corporations",
        "sfc_circulars_list.html"),
    RegulatorySource("hkma_circulars", "HKMA", "circular",
        "https://www.hkma.gov.hk/eng/key-information/press-releases/",
        "hkma_press_list.html"),
]
def source_by_key(key: str) -> RegulatorySource: ...
```

- [ ] **Step 2:** Add `enable_regulatory_poll: bool = True` and `regulatory_poll_hours: int = 24` to `Settings`.
- [ ] **Step 3:** Add `regulatory_feed` table to `init_db()` in `src/core/database.py`:

```sql
CREATE TABLE IF NOT EXISTS regulatory_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT NOT NULL,
    external_id TEXT NOT NULL,
    regulator TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    issued_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    summary TEXT DEFAULT '',
    chunks INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','ingested','skipped','error')),
    UNIQUE(source_key, external_id)
);
```

Plus helpers: `list_regulatory_items(limit=100)`, `get_regulatory_item(source_key, external_id)`, `insert_regulatory_item(...) -> dict`, `update_regulatory_item_status(id, status, chunks=None, summary=None)`.

- [ ] **Step 4:** Test `tests/test_regulatory_db.py` (isolated-db pattern): insert → idempotent second insert raises IntegrityError caught by caller helper `upsert_regulatory_item` (add wrapper that returns existing row) → list ordering, status update.

### Task 2: Fixture-driven fetch adapter

**Files:**
- Create: `tests/fixtures/regulatory/sfc_circulars_list.html`, `tests/fixtures/regulatory/hkma_press_list.html`, `src/regulatory/client.py`

- [ ] **Step 1:** Write realistic-but-small HTML fixtures: SFC listing with 2 circular entries (title links + dates like `01 Oct 2026`); HKMA listing with 2 press-release entries. Each entry: `<h? class="title"><a href="...">Title</a></h?>` + a date element.
- [ ] **Step 2:** `client.py`:

```python
class FetchError(Exception): ...
def fetch_listing(source: RegulatorySource, base_dir: str | None = None) -> list[dict]:
    # returns [{"external_id", "title", "url", "issued_at"}] — external_id = slugified title
    # If network available (httpx GET ok) parse live HTML with the same parser;
    # otherwise parse file `<base_dir or "tests/fixtures/regulatory">/<source.html_fixture>`.
def fetch_item_text(url: str, source: RegulatorySource, base_dir=None) -> str:
    # returns cleaned plain text (strip tags). Offline: load a paired <title>.html fixture
    # if it exists, else return title-only placeholder text.
```

Parsing helpers with stdlib `re`/`html.parser` operating on the fixture classes/ids chosen in Step 1. `httpx` import inside a function and guarded so missing network never raises out of `fetch_listing` (fall back to fixtures).
- [ ] **Step 3:** Tests `tests/test_regulatory_client.py`: `fetch_listing(SFC source)` from fixtures → 2 items, one titled exactly as in fixture; `fetch_item_text(...)` returns text containing a distinctive phrase from a `<title>.html` fixture (create `tests/fixtures/regulatory/sfc_sample_1.html` with a paragraph of regulation text).

### Task 3: Regulatory ingestion into vector store

**Files:**
- Create: `src/regulatory/ingest.py`

**Interfaces (consumed by Task 4):**
- `def ingest_regulatory_item(item: dict, source: RegulatorySource, text: str) -> dict` → `{"filename": ..., "chunks": int, "signals": int}` where `filename = f"reg-{source.regulator.lower()}-{external_id}.txt"`.

- [ ] **Step 1:** Chunk `text` using `src.ingestion.chunker` (follow the `scripts/ingest.py` chunk loop; verify the chunker's public entry and reuse it). Build chunk dicts with metadata: `{"source": item["url"], "filename": <filename>, "regulator": source.regulator, "issuance_date": item["issued_at"] or "", "category": source.kind, "circular_id": item["external_id"], "chunk_index": i, "page": 1, "line": 1}` plus first-chunk `auto_positive_signals` JSON list built from tokens: `[source.regulator.lower(), source.kind] + keywords from title words length>4`.
- [ ] **Step 2:** `vector_store.add_documents(chunks, filename=filename)` (per-item collection — keeps the existing search machinery working, per spec "save to a shared global regulatory collection": note tradeoff — per-item collections are used instead so existing `_search_all` + scope filter + wide search work unchanged; document this deviation in code comment).
- [ ] **Step 3:** Tests `tests/test_regulatory_ingest.py`: fake vector store capturing `add_documents(chunks, filename)`; assert metadata of first chunk contains regulator/issuance_date/circular_id and filename prefix `reg-`; chunks ≥1; signals list non-empty.

### Task 4: Poll cycle + endpoints + scheduler

**Files:**
- Create: `src/regulatory/scheduler.py`, `src/api/routes/regulatory.py`
- Modify: `src/api/main.py` (lifespan background task)

- [ ] **Step 1:** `scheduler.py`:

```python
_state = {"last_run": None, "last_status": "idle", "last_error": None, "running": False}
async def poll_cycle() -> dict:
    # for each source: items = client.fetch_listing(source)
    #   for item: if get_regulatory_item exists -> skip
    #             text = client.fetch_item_text(...); ingest_regulatory_item(...)
    #             upsert feed row status ingested (+chunks/summary) — on any exception status error
    # update _state and return it
def get_state() -> dict: ...
async def poll_loop() -> None:
    while True:
        try: await poll_cycle()
        except Exception as e: _state["last_error"] = str(e)
        await asyncio.sleep(settings.regulatory_poll_hours * 3600)
```

- [ ] **Step 2:** Routes: `POST /api/regulatory/poll` (runs one `poll_cycle`, returns state), `GET /api/regulatory/status` (state), `GET /api/regulatory/feed?limit=100` (rows newest first). Register router.
- [ ] **Step 3:** Lifespan in `main.py`: after existing startup, if `settings.enable_regulatory_poll`: `task = asyncio.create_task(poll_loop())`, cancel on shutdown.
- [ ] **Step 4:** Tests `tests/test_regulatory_poll.py`: monkeypatch `client.fetch_listing` (2 sources × 1 new item) and `client.fetch_item_text`, isolated DB → `poll_cycle()` inserts 2 feed rows `status=ingested`; run again → no new rows (idempotent); `fetch_item_text` raising → row `status=error` and `_state["last_error"]` set; API status endpoint reflects run.

### Task 5: Temporal recency in compliance search

**Files:**
- Modify: `src/tools/search.py`

- [ ] **Step 1:** Add helper:

```python
def _apply_recency(results: list[dict]) -> list[dict]:
    from datetime import date
    for r in results:
        d = (r.get("metadata") or {}).get("issuance_date")
        # parse "YYYY-MM-DD" or "01 Oct 2026"-style; on failure skip (no decay)
        ...
        age = (date.today() - parsed).days
        decay = max(0.5, 1 - age / 3650)
        base = r.get("hybrid_score", r.get("score", 1))
        r["hybrid_score"] = base * decay
    return results
```

Call it in `search_pe_documents` right before the final truncation/sort for results whose metadata carries `regulator`/`issuance_date` (guard: results without those keys keep base scores). Implementation note: only applies recency weighting, does not add regulatory docs to normal searches — regulatory docs live in their own per-item collections and participate through the existing all-collection path only when not scope-filtered (document this).
- [ ] **Step 2:** Tests `tests/test_regulatory_search.py`: fake result list: two items, both score 1.0 distance-equivalent with `issuance_date` 2026-09-01 vs 2020-01-01, `settings.enable_bm25=False` monkeypatched; run `_apply_recency`; assert the recent item sorts first and recent `hybrid_score > old`.

### Task 6: Radar UI

**Files:**
- Create: `frontend/src/app/radar/page.tsx`
- Modify: `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`, `frontend/src/lib/apps.tsx` (key `radar`, category `"Compliance & Risk"`, href `/radar`, radar icon)

- [ ] **Step 1:** Types `RegulatoryFeedItem { id; source_key; regulator; kind; title; url; issued_at: string | null; fetched_at: string; summary: string; chunks: number; status: string }`; `RegulatoryState { last_run: string | null; last_status: string; last_error: string | null; running: boolean }`. Helpers: `fetchRegulatoryFeed()`, `fetchRegulatoryStatus()`, `pollRegulatory()`.
- [ ] **Step 2:** Page: h1 "Regulatory radar"; status strip (last run / last error text — text not color-only); "Check now" button (disables while running, calls poll then refreshes both); feed grouped by regulator (SFC / HKMA headers) newest first: rows with title link (external `url`, `target="_blank" rel="noopener noreferrer"`), kind chip, issued date, chunk count, and summary paragraph — when `summary` empty show "Impact summary pending." Drawer ("Open circular") shows raw item detail from the feed row + a note that per-circular grounded chat ships in a follow-up.
- [ ] **Step 3:** Empty state ("Nothing ingested yet — run Check now"). `tsc` PASS; Playwright live against backend: POST poll with monkeypatched offline client is not possible E2E — instead seed 2 rows directly into the isolated DB? Live DB is shared: insert via `GET`-only route is unavailable — acceptable: test UI against seeded rows by calling `sqlite3` insert into `data/platform.db` regulatory_feed in the check, then load `/radar` and verify rows render; remove rows after. Console clean; no overflow 390/1440.

### Task 7: Impact-summary generation hook

**Files:**
- Modify: `src/regulatory/ingest.py` (optional `summarize: bool = True`)

- [ ] **Step 1:** After chunking, if `summarize`: try one LLM call via the same guarded pattern as the graph (`langchain_deepseek.ChatDeepSeek` from settings) producing a one-paragraph summary of `text`; on any exception leave `summary = ""` (never crash ingest). Persist summary via `update_regulatory_item_status(..., summary=...)`.
- [ ] **Step 2:** Tests: monkeypatch the summarizer callable to return a canned string → `ingest_regulatory_item(..., summarize_with=lambda text: "Impact text")` style injection; assert summary stored in feed row; failing summarizer (raises) still ingests with empty summary. (Design ingest signature to accept `summarize_with: Callable[[str], str] | None = None` for testability.)

### Task 8: Launchpad registration + final sweep

- [ ] **Step 1:** Confirm `/radar` tile renders on the launchpad homepage under Compliance & Risk.
- [ ] **Step 2:** Final `tsc --noEmit`; Playwright overflow sweep `/radar` at 390/1440; no console errors.
- [ ] **Step 3:** Update `README.md` (Project Structure: add `src/regulatory/`; endpoints table: add `/api/regulatory/*`; Core Concepts: one paragraph on Regulatory Radar + temporal weighting; Progress Log: Phase 9 entry).
