# Analyst Workbenches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four standalone workbench pages (Term Sheet, LP Report, Compliance Auditor, Filing Cabinet) that drive existing agents over user-selected documents with structured, auditable results — plus `.docx`/`.xlsx` upload support.

**Architecture:** Each workbench = document picker (list + upload into a project workspace) + "Analyze" button calling non-streaming `POST /api/agents/execute` (forced agent) → results pane renders parsed JSON structure + citations. A shared `Workbench` component set removes duplication. Backend change is limited to widening accepted upload suffixes; no new agent logic.

**Tech Stack:** Next.js 14, existing `/api/agents/execute`, `executeAgent()` in `frontend/src/lib/api.ts`.

**Spec:** Launchpad vision items 1–4 (Term Sheet Extractor & Analyzer, SFC & AMLO Compliance Auditor, Smart Document Routing Cabinet, LP Report & Executive Brief Generator). Requires Plan 1 (registry `frontend/src/lib/apps.tsx`, `AppCategory "Workbenches"`) to be merged first.

## Global Constraints

- No git commits in this session.
- No emojis; JS&C tokens only.
- Frontend validation: `cd frontend && ./node_modules/.bin/tsc --noEmit` (never `next build` while `next dev` runs).
- No new Python runtime dependencies.
- Existing conventions: routes register in `src/api/main.py`; upload flow in `src/api/routes/documents.py`; repo-style SQLite helpers in `src/core/database.py`.

---

### Task 1: Widen upload support to .docx/.xlsx

**Files:**
- Modify: `src/api/routes/documents.py` (~line 148, `supported = {".pdf", ".txt", ".md"}`)
- Modify: `frontend/src/app/documents/page.tsx` (dropzone `accept` attr and "PDF, TXT, MD" helper copy)

**Note:** `src/ingestion/loader.py` already parses `.docx`/`.xlsx` (`_load_docx`, `_load_xlsx`) and `supported_suffixes` there already includes them.

- [ ] **Step 1:** Add `".docx", ".xlsx"` to the upload route's `supported` set and update its error message if it enumerates types.
- [ ] **Step 2:** Update the documents-page hidden file input + dropzone text to `PDF, DOCX, XLSX, TXT, MD` and `accept=".pdf,.txt,.md,.docx,.xlsx"`.
- [ ] **Step 3:** Add a test to `tests/test_api.py` (or new `tests/test_upload_formats.py` following the isolated-db fixture pattern from `tests/test_conversations.py`): build a stub `.docx` (bytes that the loader will fail to parse are fine for *suffix acceptance* — but a real minimal docx zip is better; if parsing fails, expect the upload endpoint to still return 200 with `ingested: 0` per its current error-swallowing behavior — assert status is 200, not 415/400). Clean up the created `documents` row + file in `finally`.
- [ ] **Step 4:** If the repo test env is unavailable locally (deps missing), note this and rely on the CI/venv run; still ensure `python3 -m compileall src/api/routes/documents.py` passes.

### Task 2: Shared workbench components

**Files:**
- Create: `frontend/src/components/Workbench.tsx`

**Interfaces:**
- `export function WorkbenchPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode })` — section wrapper with `section-eyebrow`, serif `h1` (clamp style as used on other app pages), intro paragraph.
- `export function DocumentPicker({ onSelect }: { onSelect: (doc: DocumentInfo | null) => void })` — uses `fetchProjects`, `fetchDocumentList`, `uploadDocument` from `@/lib/api`; renders: workspace `<select>` (Global + projects, mirroring chat rail semantics but page-local), document `<select>` of docs in the workspace (documents list endpoint supports `project_id`; Global = no filter), "Upload new" file input (accept incl. docx/xlsx) that uploads to the selected workspace then refreshes the doc list; calls `onSelect(doc)` when selection changes. Labels via `aria-label`.
- `export function ResultPanel({ resultText, citations, confidence, agentType }: { resultText: string; citations: string[]; confidence: number; agentType: string })` — pretty-prints JSON if parseable (`JSON.stringify(JSON.parse(resultText), null, 2)`) else shows text in `<pre>`; "Sources (n)" list with `parseCitation` (from `@/lib/utils`); confidence % line; Copy button (`navigator.clipboard.writeText`).

- [ ] **Step 1:** Implement the three components (inline JS&C-token styles).
- [ ] **Step 2:** `tsc --noEmit` PASS.

### Task 3: Term Sheet Workbench

**Files:**
- Create: `frontend/src/app/workbench/term-sheet/page.tsx`
- Modify: `frontend/src/lib/apps.tsx` (add entry: key `term_sheet_workbench`, category `"Workbenches"`, href `/workbench/term-sheet`, document icon)

- [ ] **Step 1:** Page state: `doc`, `loading`, `error`, `result: AgentResponse | null`. Analyze button (disabled until doc chosen or while loading) calls `executeAgent({ query: "Extract the full term sheet data from this document.", agent_type: "term_sheet" })`. On `result`, render `ResultPanel`. On throw, show inline friendly error with Retry (mirror chat error mapping: backend 500/key/network).
- [ ] **Step 2:** Structured dashboard: attempt `JSON.parse(result.result)` → if it matches a TermSheet-like object (has `company_name` or `liquidation_preference`), render a definition grid for known keys (company_name, round_type, pre_money_valuation, investment_amount, liquidation_preference, anti_dilution, board_seats, price_per_share, esop_pool, governing_law, lead_investor) with ink/muted token styling; unknown keys fall through to the JSON `<pre>`.
- [ ] **Step 3:** `tsc` PASS; Playwright: route renders, picker populated against live backend, button disabled without doc, no console errors, no horizontal overflow at 390/1440.

### Task 4: LP Report Workbench

**Files:**
- Create: `frontend/src/app/workbench/lp-report/page.tsx`
- Modify: `frontend/src/lib/apps.tsx` (key `lp_report_workbench`, href `/workbench/lp-report`, chart icon)

- [ ] **Step 1:** Same skeleton as Task 3 with forced `agent_type: "lp_report"` and query `"Generate a quarterly LP report from this document."`. Structured render when parsed object has `quarter`/`portfolio_highlights`: quarter heading, highlights list, risk-factors list, financial summary table (key/value rows).
- [ ] **Step 2:** `tsc` PASS + Playwright route smoke (renders, picker, analyze disabled state).

### Task 5: Compliance Auditor Workbench

**Files:**
- Create: `frontend/src/app/workbench/compliance-audit/page.tsx`
- Modify: `frontend/src/lib/apps.tsx` (key `compliance_audit`, category `"Compliance & Risk"`, href `/workbench/compliance-audit`, shield icon)

- [ ] **Step 1:** Forced `agent_type: "compliance"`; structured render when parsed object has `compliant`/`issues`: verdict chip (Pass/Fail with text labels — never color-only), issues list, jurisdiction, `regulations_checked` chips.
- [ ] **Step 2:** Copy line under the verdict: "Audit reflects the firm's internal policy corpus in this workspace." `tsc` PASS + Playwright smoke.

### Task 6: Filing Cabinet Workbench

**Files:**
- Create: `frontend/src/app/workbench/filing-cabinet/page.tsx`
- Modify: `frontend/src/lib/apps.tsx` (key `filing_cabinet`, category `"Operations"`, href `/workbench/filing-cabinet`, cabinet/folder icon)

- [ ] **Step 1:** Ingest-and-route surface: workspace select + multi-file upload (reuse upload logic shape from documents page: statuses array `{filename, status, message}` with per-file dot+text — never color-only). After each successful upload show chips: `X chunks`, source, "assigned to <project>" when workspace set.
- [ ] **Step 2:** Per-file "Assign" mini-select when workspace is Global: opens `assignDocument(doc.id, clientId, projectId)`? Simpler: only enable assignment when a workspace project is chosen at upload time (mirror documents page behavior). Educational paragraph explaining per-document Chroma collections + TF-IDF signals + why big files don't drown small ones.
- [ ] **Step 3:** `tsc` PASS + Playwright smoke (upload a `.txt` from a fixture path via the file input, expect a status row; no console errors).

### Task 7: Launchpad registration + nav completeness

- [ ] **Step 1:** Confirm all four routes appear on the homepage launchpad (Plan 1 grid) under their categories and each navigates correctly.
- [ ] **Step 2:** Final `tsc --noEmit`; Playwright overflow sweep `/workbench/*` at 390/1440.
