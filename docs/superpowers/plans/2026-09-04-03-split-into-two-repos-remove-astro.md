# Split Into Two Repos (`python/` + `nextjs/`) and Remove Astro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish removing the Astro site (`web/`) by completing the port of its marketing pages into the Next.js app, wire the two tiers to talk by URL (`BACKEND_URL`), and publish the two already-created GitHub repos (`jsnc-demo-automation-python`, `jsnc-demo-automation-nextjs`) from the `python/` and `nextjs/` subfolders — each with a fresh squashed history — while this monorepo remains the combined dev workspace and archive.

**Architecture:** This workspace was already restructured (uncommitted) so the FastAPI/LangGraph backend lives in `python/` and the Next.js app lives in `nextjs/frontend/` (plus `nextjs/scripts/`). Phase 1 completes the half-done Astro→Next.js marketing port **inside `nextjs/frontend/`** (content data modules are already committed at HEAD): services, work + 2 case studies, blog + 2 posts, products, applications, contact, support, robots/sitemap, context-aware nav — then deletes `web/`. Phase 2 makes the Next.js `/api/*` proxy honor an env-driven `BACKEND_URL` (browsers keep calling same-origin; Next forwards server-side — the "talk via URLs" change), adds backend container artifacts under `python/`, and writes the two-repo deploy runbook. Phase 3 fixes the dev orchestrator for the new layout, then seeds each new GitHub repo from its subfolder as a single squashed commit (gated pushes) and records the split.

**Tech Stack:** Next.js 14 App Router + TypeScript + Tailwind (demo + new static marketing routes), FastAPI/LangGraph/ChromaDB backend (unchanged except `run.sh`, deploy artifacts, docs), Docker for the always-on backend host, Vercel for Next.js. No new npm or pip dependencies.

**Spec:** This plan supersedes and completes `docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md` (still in git history at `HEAD`; restored to the working tree in Task 1 — it contains the full authored code for the port tasks and is referenced task-by-task below). Session decisions (2026-09-04, confirmed by the user): (1) remove the Astro project entirely — Next.js serves marketing pages statically; (2) host on Vercel as two repos — one Python, one Next.js — communicating via URLs; (3) port marketing pages into this Next.js app keeping the demo home at `/`; (4) 1:1 port of the current editorial design (no restyle); (5) Python backend runs as FastAPI+uvicorn on an always-on host with persistent disk, in its own repo; (6) **user decision:** each new GitHub repo is seeded with a **fresh squashed single commit**; this monorepo stays as the archive + dev workspace. Supporting specs: `DESIGN-jonathansimpson.md`, `newDESIGN-nonai-look-non-rounded.md`, `docs/superpowers/plans/UIplan.md`.

## Current State Snapshot (verify before starting — the working tree is mid-restructure)

- Git `HEAD` (commit `3ea4b7a`) still has the **old layout**: `frontend/` (Next.js demo), `web/` (Astro marketing), root-level backend (`config/ data/ src/ tests/ scripts/ pyproject.toml run.sh .env.example`), plus `docs/`, `README.md`, design docs.
- The **working tree** has uncommitted moves: old paths deleted on disk, content re-homed into untracked dirs `python/` (backend: `config/ data/ src/ tests/ scripts/ pyproject.toml run.sh .env .env.example`) and `nextjs/` (`frontend/` = byte-identical copy of HEAD `frontend/`, plus `scripts/fetch-regulator-logos.sh`). `git status` shows ~196 ` D` entries + `?? nextjs/` + `?? python/`.
- Task 1 of the old plan is **already done and committed** at HEAD: `frontend/src/content/{site,blog,projects}.ts` and `frontend/src/lib/dates.ts` (now at `nextjs/frontend/...`).
- Not done yet: marketing components/routes/CSS, robots/sitemap, header/footer context, demo CTA changes, `web/` deletion, README rewrite, `BACKEND_URL` wiring, Docker artifacts, deploy docs, repo split.
- Runtime junk currently *tracked* at HEAD that must NOT enter the new repos: `data/audit.db-shm`, `data/audit.db-wal`, `data/llm_cache.db-shm`, `data/llm_cache.db-wal` (they live at `python/data/` in the working tree; `*.db` is ignored but `*.db-shm`/`*.db-wal` are not).
- Frontend↔backend wiring today: all browser calls are same-origin (`/api/*`, `/health`) proxied by `nextjs/frontend/next.config.js` rewrites to `http://127.0.0.1:8000`. Backend runs `uvicorn src.api.main:app` on `0.0.0.0:8000`; `run.sh` also launches `frontend/` (a sibling that no longer exists once `python/` is its own repo — fixed in Task 14).
- Git remotes: `origin` = `devoob/Langchain-langraph-fin`, `jsnc` = `jonathan-simpson-it/jsnc-demo-automation`. New targets: `jonathan-simpson-it/jsnc-demo-automation-python`, `jonathan-simpson-it/jsnc-demo-automation-nextjs`.

## Global Constraints

- All diagrams in Mermaid; no emojis in source or UI copy; provider-neutral copy. No new dependencies.
- Marketing pages are a **1:1 port**: keep the Astro page content/data and the JS&C editorial look (cream `#f4f4ef`, sage `#80988f`, serif display type). Do not restyle to the demo look.
- Ported pages render static/SSG at build — no `"use client"` except contact form / FAQ toggles, no dynamic APIs, no fetch on marketing routes.
- Demo routes untouched except: Header/Footer nav becomes context-aware, and the external `https://jonathansimpson.co/contact/` CTAs in the demo home (`src/app/page.tsx`) and `PitchBand.tsx` become internal links.
- Frontend verification standard (repo convention): `cd nextjs/frontend && npx tsc --noEmit` then `npm run build` clean. Backend: `cd python && python -m pytest tests/ -q` green.
- Backend Python code modified only by `run.sh` (orchestration fix) and deploy artifacts (`Dockerfile`, `.dockerignore`) and docs.
- Keep `web/` untouched until its deletion task; every deleted route must be served from `nextjs/frontend/` first.
- Never push to GitHub without explicit user approval (push steps below are **gated**). Runtime state (`.env`, sqlite/`-shm`/`-wal` files, chroma dirs, caches, `node_modules`, `.next`) must never be committed anywhere.
- All port-task code lives in the restored spec doc `docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md`; follow its code verbatim with the path/commit deltas given in each task here.

---

## File Structure Map

New files: this plan `docs/superpowers/plans/2026-09-04-03-split-into-two-repos-remove-astro.md`; restored `docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md`; `nextjs/.gitignore`, `python/.gitignore`, `nextjs/README.md`, `python/README.md`; ported marketing code under `nextjs/frontend/src/components/marketing/` + `nextjs/frontend/src/app/{services,products,applications,work,work/[slug],blog,blog/[slug],contact,support}/page.tsx` + `nextjs/frontend/src/app/{robots,sitemap}.ts`; `nextjs/frontend/.env.example`; `python/Dockerfile`, `python/.dockerignore`; `docs/deploy.md`.

Modified: `.gitignore` (root), `nextjs/frontend/next.config.js`, `nextjs/frontend/src/app/globals.css`, `nextjs/frontend/src/app/layout.tsx`, `nextjs/frontend/src/components/{Header,Footer}.tsx`, `nextjs/frontend/src/app/page.tsx`, `nextjs/frontend/src/components/PitchBand.tsx`, `nextjs/scripts/fetch-regulator-logos.sh`, `nextjs/frontend/public/pictures/README.md`, `python/run.sh`, `README.md` (root).

Deleted: `web/` entirely; stale root-level paths from the old layout (folded into the Task 13 restructure commit); tracked runtime junk under `data/`.

---

## Phase 0 — Baseline and plan record

### Task 1: Write this plan doc and restore the prior spec doc

**Files:** Create `docs/superpowers/plans/2026-09-04-03-split-into-two-repos-remove-astro.md` (content = this plan); restore `docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md` from HEAD.

- [ ] **Step 1: Save this plan** to `docs/superpowers/plans/2026-09-04-03-split-into-two-repos-remove-astro.md`.
- [ ] **Step 2: Restore the prior spec doc** (it was deleted from the working tree but is committed):

```bash
git checkout HEAD -- docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md
```

- [ ] **Step 3: Confirm state** — `git status --short | head` shows the ~196 deletions + untracked `nextjs/`/`python/` and the restored doc; `git show HEAD:frontend/src/content/site.ts | head -5` works; `ls nextjs/frontend/src/content` shows `blog.ts projects.ts site.ts`.
- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-04-03-split-into-two-repos-remove-astro.md docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md
git commit -m "docs: plan to split into python and nextjs repos and remove Astro"
```

---

## Phase 1 — Finish the Astro → Next.js marketing port (inside `nextjs/frontend/`)

**How to read this phase:** each task is one task of the restored spec doc `docs/superpowers/plans/2026-09-04-02-remove-astro-consolidate-nextjs.md` (its Task numbers match). That doc contains the complete code for every step; follow it **exactly**, applying only the deltas stated here (path prefix `nextjs/frontend/` instead of `frontend/`, verification cwd `nextjs/frontend`, and the adjusted commit commands). Do not skip its per-task verify steps.

**Task 1 (content modules) of the spec is already complete** — verify only: `ls nextjs/frontend/src/content nextjs/frontend/src/lib` shows `site.ts blog.ts projects.ts dates.ts`. Do not redo it.

### Task 2: Marketing primitives and prose renderer (spec Task 2)

**Files:** Create `nextjs/frontend/src/components/marketing/{SectionIntro,ChipList,CtaBand,RegulatorLogosFigure,MarketingProse}.tsx` (server components; code verbatim from spec Task 2).

- [ ] **Step 1:** Implement spec Task 2 Steps 1–3 with all paths prefixed `nextjs/frontend/src/components/marketing/`.
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/components/marketing
git commit -m "feat(site): marketing section primitives and markdown-lite prose renderer"
```

### Task 3: Marketing CSS block (spec Task 3)

**Files:** Modify `nextjs/frontend/src/app/globals.css` (append the spec's marketing block).

- [ ] **Step 1:** Run the spec Task 3 selector check against `nextjs/frontend/src/app/globals.css` (expect `.section`/`.section-eyebrow` present; marketing classes absent — the 2 existing "marketing" grep hits are comments only, not the block).
- [ ] **Step 2:** Append the spec's CSS block verbatim.
- [ ] **Step 3: Verify** — `cd nextjs/frontend && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 4: Commit**

```bash
git add nextjs/frontend/src/app/globals.css
git commit -m "feat(site): marketing page styles in globals.css"
```

### Task 4: Static marketing pages — services, products, applications (spec Task 4)

**Files:** Create `nextjs/frontend/src/app/services/page.tsx`, `nextjs/frontend/src/app/products/page.tsx`, `nextjs/frontend/src/app/applications/page.tsx` (code verbatim from spec Task 4).

- [ ] **Step 1:** Implement spec Task 4 (all routes render from `siteConfig`; server components; metadata titles match the Astro originals).
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/app/services nextjs/frontend/src/app/products nextjs/frontend/src/app/applications
git commit -m "feat(site): services, products and applications marketing pages"
```

### Task 5: Work and blog listing + detail pages (spec Task 5)

**Files:** Create `nextjs/frontend/src/app/work/page.tsx`, `nextjs/frontend/src/app/work/[slug]/page.tsx`, `nextjs/frontend/src/app/blog/page.tsx`, `nextjs/frontend/src/app/blog/[slug]/page.tsx`. Detail pages are SSG with `generateStaticParams` + `generateMetadata`, render `body` via `MarketingProse`, and list/detail use `getProjects()/getProject()` and `getBlogPosts()/getBlogPost()` from `@/content/*` and `formatLongDate` from `@/lib/dates` (code verbatim from spec Task 5).

- [ ] **Step 1:** Implement spec Task 5.
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/app/work nextjs/frontend/src/app/blog
git commit -m "feat(site): work and blog listing and case-study/post detail pages"
```

### Task 6: Contact and Support pages (spec Task 6)

**Files:** Create `nextjs/frontend/src/app/contact/page.tsx`, `nextjs/frontend/src/app/support/page.tsx` plus client components per spec Task 6 (contact form posts to `mailto:`/`fetch` per the spec; FAQ toggles; only these may be `"use client"`).

- [ ] **Step 1:** Implement spec Task 6 (includes the "Message sent!" flip and FAQ `+`/`−` behavior).
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit && npm run build`. Expected: PASS; new routes listed as `○ (Static)`/`● (SSG)`.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/app/contact nextjs/frontend/src/app/support
git commit -m "feat(site): contact and support pages"
```

### Task 7: SEO — JSON-LD, robots.txt, sitemap.xml (spec Task 7)

**Files:** Create `nextjs/frontend/src/app/robots.ts`, `nextjs/frontend/src/app/sitemap.ts`; add Organization JSON-LD to `nextjs/frontend/src/app/layout.tsx` per spec Task 7. `sitemap.ts` iterates `marketingPaths` from `siteConfig`, the four content slugs, and the demo routes.

- [ ] **Step 1:** Implement spec Task 7.
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit && npm run build`; confirm `robots.txt` and `sitemap.xml` exist under `.next/` output routes.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/app/robots.ts nextjs/frontend/src/app/sitemap.ts nextjs/frontend/src/app/layout.tsx
git commit -m "feat(site): robots, sitemap and organization structured data"
```

### Task 8: Context-aware header and footer (spec Task 8)

**Files:** Modify `nextjs/frontend/src/components/Header.tsx`, `nextjs/frontend/src/components/Footer.tsx`.

**Delta:** the spec renders marketing nav from `siteConfig.marketingNavigation` and keeps the demo nav on demo routes; on marketing routes the header shows the marketing nav with a "Demo" link to `/`, and the footer gains marketing links. Use `siteConfig.marketingPaths` for the context check. `usePathname()` already used in Header; Footer must be converted to a client component only if it needs pathname (follow the spec exactly).

- [ ] **Step 1:** Implement spec Task 8.
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit && npm run build`. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/components/Header.tsx nextjs/frontend/src/components/Footer.tsx
git commit -m "feat(site): context-aware header and footer across marketing and demo"
```

### Task 9: Point demo CTAs at internal marketing routes (spec Task 9)

**Files:** Modify `nextjs/frontend/src/app/page.tsx` (the two masthead CTAs) and `nextjs/frontend/src/components/PitchBand.tsx`.

**Delta:** replace `href="https://jonathansimpson.co/contact/"` with `href="/contact"` in both files (drop `target="_blank"`); LinkedIn CTA unchanged. Follow the spec's exact JSX for any other CTA edits.

- [ ] **Step 1:** Implement spec Task 9.
- [ ] **Step 2: Verify** — `cd nextjs/frontend && npx tsc --noEmit`; `rg -n "jonathansimpson.co/contact" nextjs/frontend/src` returns nothing.
- [ ] **Step 3: Commit**

```bash
git add nextjs/frontend/src/app/page.tsx nextjs/frontend/src/components/PitchBand.tsx
git commit -m "feat(site): point demo CTAs at internal marketing routes"
```

### Task 10: Delete the Astro site and clean references (spec Task 10, path deltas)

**Files:** Delete `web/`; modify `.gitignore`, `nextjs/scripts/fetch-regulator-logos.sh`, `nextjs/frontend/public/pictures/README.md`.

- [ ] **Step 1: Confirm nothing needs `web/`** — run the spec's `rg` over the repo (`web/src|web/public|astro build|astro dev`); remaining hits allowed only in `docs/**`, `README.md`, `.gitignore`, this plan, and the restored spec doc.
- [ ] **Step 2: Delete and clean**
  - `git rm -r web`
  - `.gitignore`: remove the `web/node_modules/` line (root `.gitignore` gets its full rewrite in Task 13 — only remove the web line here).
  - `nextjs/scripts/fetch-regulator-logos.sh`: drop the `mkdir -p ... "$ROOT/web/public/pictures"` web mirror and its copy lines; `ROOT` resolves to `nextjs/`, so `"$ROOT/frontend/public/pictures"` stays correct.
  - `nextjs/frontend/public/pictures/README.md`: drop the "Mirrored in `web/public/pictures/`" sentence; note `nextjs/frontend/public/pictures/` is the single source of truth.
- [ ] **Step 3: Remove untracked build dirs on disk** — `rm -rf web` (`.astro/`, `dist/`, `node_modules/` are untracked).
- [ ] **Step 4: Verify** — `cd nextjs/frontend && npx tsc --noEmit && npm run build` PASS; `rg -n 'web/src|web/public|/web/' nextjs/frontend/src .gitignore nextjs/scripts README.md` empty.
- [ ] **Step 5: Commit**

```bash
git add -A web .gitignore nextjs/scripts/fetch-regulator-logos.sh nextjs/frontend/public/pictures/README.md
git commit -m "chore: remove Astro marketing site now that Next.js serves all pages"
```

### Task 11: Rewrite the root README for the new layout (adapted spec Task 11)

**Files:** Modify `README.md` (root).

**Deltas from the spec:** the root README describes the **combined workspace**: mermaid shows `nextjs/frontend/` (marketing pages + demo) → `python/` backend via `BACKEND_URL` proxy; a short section explains the production reality: *this repo is the dev workspace; production ships as two repos — `jsnc-demo-automation-nextjs` (Vercel) and `jsnc-demo-automation-python` (always-on host) — see `docs/deploy.md`*; structure tree lists `python/` and `nextjs/` and removes `web/`; Quick Start becomes `cd python && ./run.sh` (starts both tiers from the combined workspace).

- [ ] **Step 1:** Apply the spec Task 11 README edits with the deltas above.
- [ ] **Step 2: Verify** — `rg -n 'Astro|astro' README.md` empty; `cd python && ./run.sh --help` shows updated usage (script still references `frontend/` — the real fix is Task 14; `--help` works today).
- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: describe the nextjs and python two-repo stack"
```

---

## Phase 2 — URL-based backend wiring and deploy readiness

### Task 12: Env-driven `BACKEND_URL` in the Next.js proxy

**Files:** Modify `nextjs/frontend/next.config.js`; create `nextjs/frontend/.env.example`.

**Interfaces:** `/api/*` and `/health` rewrite destinations honor `BACKEND_URL` (default `http://127.0.0.1:8000`, so local dev is unchanged). This is the "talk via URL" change: browsers keep calling same-origin `/api/*`; Next.js forwards to the backend URL server-side — no CORS/client changes; SSE and upload streaming keep working through the proxy.

- [ ] **Step 1: Replace `nextjs/frontend/next.config.js`**

```js
/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

if (process.env.NODE_ENV === "production" && !process.env.BACKEND_URL) {
  console.warn(
    "[next.config] BACKEND_URL is not set — /api rewrites will target " +
      "http://127.0.0.1:8000. Set BACKEND_URL to your deployed Python API URL.",
  );
}

const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/health", destination: `${BACKEND_URL}/health` },
    ];
  },
};
module.exports = nextConfig;
```

- [ ] **Step 2: Create `nextjs/frontend/.env.example`**

```bash
# Backend API base URL. Local dev defaults to http://127.0.0.1:8000 when unset
# (run.sh starts the FastAPI backend there). In production (Vercel) set this to
# the deployed Python backend URL, e.g. https://api.your-backend-host.com.
BACKEND_URL=http://127.0.0.1:8000

# Public site origin for metadata/canonical/sitemap (defaults to
# https://jonathansimpson.co when unset).
NEXT_PUBLIC_SITE_URL=https://jonathansimpson.co
```

- [ ] **Step 3: Verify local proxy end to end** — `cd python && ./run.sh --skip-install --skip-ingest`; then `curl -s http://localhost:3000/health` returns `{"status":"healthy",...}`; then a POST to `http://localhost:3000/api/agents/execute/stream` yields SSE `data:` lines (or an expected 4xx without a key — key point: forwarded, not connection-refused). Ctrl+C stops both. (If ports 3000/8000 are busy, stop existing listeners first.)
- [ ] **Step 4: Commit**

```bash
git add nextjs/frontend/next.config.js nextjs/frontend/.env.example
git commit -m "feat(deploy): proxy /api to env-configured BACKEND_URL for Vercel"
```

### Task 13: Commit the folder restructure (monorepo baseline)

**Files:** none created — this is the git move commit + ignore hygiene that turns the working-tree moves into history, so all later work is ordinary tracked-file editing.

**Why now:** everything else is done in tracked files; `web/` is already gone (Task 10).

- [ ] **Step 1: Create `python/.gitignore`** (root of the python repo once seeded):

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
.venv/
venv/
env/

# Environment
.env
.env.*
!.env.example

# Runtime state (never commit)
data/chroma/
data/uploads/
data/llm_cache/
*.db
*.db-shm
*.db-wal
*.sqlite3

# Tooling caches
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
htmlcov/
.run-stamps/
.run.lock.d/

# OS
.DS_Store
```

- [ ] **Step 2: Create `nextjs/.gitignore`** (root of the nextjs repo once seeded; patterns are relative to `nextjs/` so they cover `frontend/`):

```gitignore
# Next.js / Node
frontend/node_modules/
frontend/.next/
frontend/out/
*.tsbuildinfo

# Runtime / env
frontend/.env
frontend/.env.*
!frontend/.env.example
frontend/data/

# OS
.DS_Store
```

- [ ] **Step 3: Trim the root `.gitignore`** — remove now-dead entries that referenced the old layout and runtime junk (`web/...`, `frontend/...`, `data/chroma/`, `*.db` lines and the `!frontend/src/lib/` line can go since the two sub-`.gitignore`s cover them; keep `.env`, IDE, OS, `__pycache__/`-style entries that are still useful at repo root). Verify nothing needed is lost.
- [ ] **Step 4: Stage the whole restructure** — `git add -A` (ignore files now on disk exclude `node_modules`, `.next`, `frontend/data/`, sqlite/chroma junk; confirm with `git status --short | grep -E 'node_modules|\.next|\.db|\.env$'` → empty).
- [ ] **Step 5: Review what is staged** — expected: deletions of old root paths (`config/ data/ src/ tests/ scripts/ frontend/ pyproject.toml run.sh .env.example .run.lock.d/pid`), additions under `python/` and `nextjs/` (all port work from Phase 1 included), `web/` already gone. Explicitly confirm no `.env`, no sqlite/`-shm`/`-wal`, no `node_modules`, no `.next` is staged.
- [ ] **Step 6: Commit**

```bash
git commit -m "chore: restructure repo into python and nextjs subtrees for two-repo deployment"
```

- [ ] **Step 7: Verify** — `git status --short` clean; `cd nextjs/frontend && npx tsc --noEmit && npm run build` PASS; `cd python && python -m pytest tests/ -q` green (env with deps active).

### Task 14: Fix `python/run.sh` orchestration for the new layout

**Files:** Modify `python/run.sh`.

**Problem:** `run.sh` lives in `python/` but unconditionally does `(cd frontend && npx next dev ...)` and stamps `frontend/package.json` — fine in the old single-root layout, broken when `python/` is its own repo (no sibling `frontend/`). In this combined workspace the frontend is `../nextjs/frontend`.

**Delta:** near the top of the argument parsing (before `SKIP_INSTALL` defaults are used), add:

```bash
# Frontend lives at ../nextjs/frontend in the combined dev workspace; when this
# directory is the standalone Python repo (no sibling), run API-only by default.
if [ -d "$(cd "$(dirname "$0")/.." && pwd)/nextjs/frontend" ]; then
    FE_DIR="$(cd "$(dirname "$0")/../nextjs" && pwd)/frontend"
else
    FE_DIR=""
fi
```

Then replace every bare `frontend` path reference with `"$FE_DIR"` guarded by the existing `API_ONLY` logic, and derive `API_ONLY=true` automatically when `FE_DIR` is empty: every `[ "$API_ONLY" = false ]` frontend branch also requires `[ -n "$FE_DIR" ]`, and the FE-stale check becomes `[ -n "$FE_DIR" ] && ([ ! -d "$FE_DIR/node_modules" ] || ! stamp_matches fe "$FE_DIR/package.json" "$FE_DIR/package-lock.json")`. Print an early notice when running API-only: `echo -e "${YELLOW}No ../nextjs/frontend found — starting API only.${NC}"`.

- [ ] **Step 1:** Apply the delta; keep flag behavior (`--api-only` still forces API-only even when a frontend exists).
- [ ] **Step 2: Verify** — in this combined workspace: `cd python && ./run.sh --help` shows the same usage; `./run.sh --skip-install --skip-ingest` still starts both tiers (curl `http://localhost:3000/` 200 and `http://localhost:8000/health` healthy); Ctrl+C stops both. Then simulate standalone: `FE_DIR` empty path logic via `cd python && mv ../nextjs /tmp/nextjs-moved && ./run.sh --skip-install --skip-ingest --help` — do not run a full standalone boot; instead verify the guard by reading the script (`bash -n python/run.sh` passes) and restore: `mv /tmp/nextjs-moved ../nextjs`.
- [ ] **Step 3: Commit**

```bash
git add python/run.sh
git commit -m "fix: run.sh works from python repo alone and in combined workspace"
```

### Task 15: Backend container artifacts (spec Task 13, path delta → `python/`)

**Files:** Create `python/Dockerfile`, `python/.dockerignore`.

**Interfaces:** Builds the `pyproject.toml` app; runs `uvicorn src.api.main:app` on `$PORT` (default 8000) from `/app` with a `/app/data` volume.

- [ ] **Step 1: Create `python/Dockerfile`** (verbatim from spec Task 13 Step 1 — it already `COPY`s `src ./src`, `config ./config`, `data/sample`, `scripts`, `.env.example` relative to the python repo root).

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# If your host needs build tools for a source wheel, uncomment:
#   RUN apt-get update && apt-get install -y --no-install-recommends gcc g++
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY pyproject.toml ./
COPY src ./src
COPY config ./config
RUN pip install --no-cache-dir .

# Sample documents so a fresh volume can be seeded (scripts/ingest.py).
COPY data/sample ./data/sample
COPY scripts ./scripts
COPY .env.example ./

EXPOSE 8000

# Mount a persistent volume at /app/data for ChromaDB, SQLite stores and
# uploads. The app's settings default all data paths under ./data.
VOLUME ["/app/data"]

CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port \"${PORT:-8000}\""]
```

- [ ] **Step 2: Create `python/.dockerignore`**

```dockerignore
__pycache__/
*.py[cod]
.venv/
venv/
.env
data/chroma/
data/uploads/
data/llm_cache/
*.db
*.db-shm
*.db-wal
*.sqlite3
.pytest_cache/
.mypy_cache/
.ruff_cache/
.run-stamps/
.run.lock.d/
tests/
README.md
.DS_Store
```

- [ ] **Step 3: Verify** — `docker build -t pe-backend python/ && docker run --rm -p 8000:8000 -e PORT=8000 pe-backend`, then `curl -s http://localhost:8000/health` → `{"status":"healthy",...}`; stop the container. If Docker is unavailable locally, verify with `cd python && python -c "from src.api.main import app; print(app.title)"`.
- [ ] **Step 4: Commit**

```bash
git add python/Dockerfile python/.dockerignore
git commit -m "feat(deploy): Dockerfile and .dockerignore for the standalone Python backend"
```

### Task 16: Two-repo deployment runbook

**Files:** Create `docs/deploy.md`; add links from the root `README.md`.

- [ ] **Step 1: Write `docs/deploy.md`** with sections (adapted from spec Task 14 for the two-repo reality):
  1. **Topology** (mermaid): browser → Vercel Next.js repo (`jsnc-demo-automation-nextjs`) with `/api/*` rewrites → Python backend host (`jsnc-demo-automation-python`) → ChromaDB + SQLite + uploads on a persistent volume.
  2. **Repo layout**: python repo owns `config/ src/ tests/ scripts/ data/sample/ pyproject.toml .env.example Dockerfile .dockerignore README.md`; nextjs repo owns `frontend/` (+ its own README, `.gitignore`), `scripts/fetch-regulator-logos.sh`.
  3. **Deploy the Python backend** (any always-on host with persistent disk): build `python/Dockerfile`, mount a volume at `/app/data`, env vars from `python/.env.example`, first boot runs `python scripts/ingest.py` once; explain why vanilla ephemeral serverless is unsuitable (persistent ChromaDB/SQLite/uploads + in-process asyncio regulatory poll loop; SSE is fine from one long-lived instance).
  4. **Deploy Next.js on Vercel**: import the nextjs repo; Root Directory `frontend`; env: `BACKEND_URL` = deployed Python URL, optional `NEXT_PUBLIC_SITE_URL`; no `vercel.json` needed.
  5. **OAuth redirect URIs**: register `https://<app-domain>/api/onedrive/callback` in Azure (the API builds redirect URIs from the request Host header, which behind the proxy is the Next.js domain); local dev keeps `http://localhost:8000/api/onedrive/callback`.
  6. **BYOK and keys**: user `X-API-Key` travels through the proxy unchanged; `DEEPSEEK_API_KEY` on the Python host only for a server fallback.
  7. **Local development after the split**: python repo alone → `./run.sh` (API-only auto-detection) or Docker; nextjs repo alone → `cd frontend && npm run dev` with `BACKEND_URL` default `http://127.0.0.1:8000`; combined workspace → root README Quick Start.
- [ ] **Step 2:** Add the runbook link under the root README Quick Start: `See docs/deploy.md for the production two-repo deployment (Next.js on Vercel, Python backend on its own always-on host).`
- [ ] **Step 3: Commit**

```bash
git add docs/deploy.md README.md
git commit -m "docs: add two-repo Vercel and backend-host deployment runbook"
```

---

## Phase 3 — Publish the two repos (gated ops)

**Gate:** Tasks 17–19 perform git operations and **push to GitHub**. Stop and get explicit user approval before each push — they need confirmation of repo URLs and push authorization. Everything up to the seeds is local and reversible.

### Task 17: Repo READMEs (travel with the seeds)

**Files:** Create `python/README.md`, `nextjs/README.md`.

- [ ] **Step 1: `python/README.md`** — concise: project intro ("PE AI Engineering — FastAPI/LangGraph backend: RAG + multi-agent system for private equity"), quick start (`pip install -e ".[dev]"`, copy `.env.example` → `.env`, `./run.sh` or `uvicorn src.api.main:app`, ingest via `scripts/ingest.py`), env-var table (from `config/settings.py` + `.env.example`), endpoint table (from `src/api/main.py` routers), tests (`pytest tests/ -q`), and a note: *"Frontend lives in the separate `jsnc-demo-automation-nextjs` repo; deployment topology in that repo's docs / the combined repo's `docs/deploy.md`."*
- [ ] **Step 2: `nextjs/README.md`** — concise: intro ("Jonathan Simpson & Co. — marketing site + AI platform demo, Next.js 14 App Router"), dev (`cd frontend && npm install && npm run dev`, `BACKEND_URL` default `http://127.0.0.1:8000`), structure (marketing routes vs demo routes), env vars (`BACKEND_URL`, `NEXT_PUBLIC_SITE_URL`), deploy note (Vercel, Root Directory `frontend`; Python backend is the separate `jsnc-demo-automation-python` repo), verification (`cd frontend && npx tsc --noEmit && npm run build`).
- [ ] **Step 3: Commit**

```bash
git add python/README.md nextjs/README.md
git commit -m "docs: per-repo READMEs for the split repositories"
```

### Task 18: Seed the nextjs repo (gated push)

**Goal:** `https://github.com/jonathan-simpson-it/jsnc-demo-automation-nextjs.git` receives `nextjs/` content as its root, single squashed commit.

- [ ] **Step 1: Confirm with the user** that the push is authorized and the URL is correct.
- [ ] **Step 2: Stage the content** — build the tree from the committed monorepo state (not the working tree): use `git archive HEAD nextjs | tar -x -C /tmp/seed-nextjs` or copy `nextjs/` (excluding nothing — `.gitignore`/`.env.example`/READMEs must be included; there is no `.env`, `node_modules`, or `.next` inside the committed tree).
- [ ] **Step 3: Create the fresh repo** — `cd /tmp/seed-nextjs && git init -b main && git add -A`. Confirm staged set: `frontend/` full source, `frontend/.env.example`, `scripts/fetch-regulator-logos.sh`, `README.md`, `.gitignore` — and nothing else. Commit: `git commit -m "chore: publish jsnc-demo-automation-nextjs from the combined workspace"` (no `.env`, no lockfile-secrets concerns — `package-lock.json` is fine and wanted).
- [ ] **Step 4: Push** — `git remote add origin https://github.com/jonathan-simpson-it/jsnc-demo-automation-nextjs.git && git push -u origin main` (only after the Step 1 approval).
- [ ] **Step 5: Post-push sanity (optional but recommended)** — the repo builds: fresh `npm ci` in a clone, `npx tsc --noEmit`, `npm run build`.

### Task 19: Seed the python repo (gated push)

**Goal:** `https://github.com/jonathan-simpson-it/jsnc-demo-automation-python.git` receives `python/` content as its root, single squashed commit, **without runtime junk** (sqlite/`-shm`/`-wal`, chroma, caches, `.env`).

- [ ] **Step 1: Confirm with the user** that the push is authorized and the URL is correct.
- [ ] **Step 2: Stage the content** — `git archive HEAD python | tar -x -C /tmp/seed-python`. Verify the tree contains only: `config/ src/ tests/ scripts/ data/sample/ pyproject.toml run.sh .env.example Dockerfile .dockerignore README.md .gitignore` (exclude `.env` — it is not committed — and all runtime DB/chroma files; if any slipped in, delete them from the seed dir).
- [ ] **Step 3: Create the fresh repo** — `cd /tmp/seed-python && git init -b main && git add -A && git commit -m "chore: publish jsnc-demo-automation-python from the combined workspace"`.
- [ ] **Step 4: Push** — `git remote add origin https://github.com/jonathan-simpson-it/jsnc-demo-automation-python.git && git push -u origin main` (only after the Step 1 approval).
- [ ] **Step 5: Post-push sanity (recommended)** — pytest green in a fresh clone with deps installed.

### Task 20: Record the split

- [ ] **Step 1:** Append a short "Repository split (2026-09-04)" section to the root `README.md`: this repo remains the combined dev workspace/archive; production lives in the two new repos (with URLs); dev instructions unchanged (`cd python && ./run.sh`).
- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: record the python and nextjs repository split"
```

---

## Final Verification (run before declaring done)

1. `git status --short` clean; `git log --oneline -3` shows the restructure + latest docs commits.
2. `cd nextjs/frontend && npx tsc --noEmit` — clean.
3. `cd nextjs/frontend && npm run build` — clean; marketing routes `○ (Static)`, detail routes `● (SSG)`.
4. `cd python && python -m pytest tests/ -q` — full backend suite green.
5. `cd python && ./run.sh`, then HTTP-smoke `/services`, `/products`, `/applications`, `/work`, `/work/pe-deal-flow-automation`, `/work/sme-lending-platform`, `/blog`, `/blog/ai-in-pe-due-diligence`, `/blog/building-compliance-from-day-one`, `/contact`, `/support`, `/robots.txt`, `/sitemap.xml` — each 200 with expected headline text; `/` still shows the demo dashboard with CTAs to `/contact`.
9. Browser check at 390 and 1440 (repo convention): marketing pages match the editorial look; header/footer context switching works; contact button flips to "Message sent!"; FAQ `+`/`−` toggles.
10. Proxy check with a non-localhost `BACKEND_URL` set in the Next.js dev shell — rewrites still resolve; SSE forwards (spot-check `/health`).
11. Confirm the seed dirs (`/tmp/seed-nextjs`, `/tmp/seed-python`) contain no `.env`, sqlite/`-shm`/`-wal`, chroma, caches, `node_modules`, or `.next`.

## Self-Review

- **Spec coverage:** Astro removed → Tasks 10 + 13; marketing served by Next.js static routes beside the demo at `/` → Phase 1 (spec Tasks 2–9) + Task 8 nav; "fast routes like Astro" → SSG/static verified in build output; two repos talk by URL → Task 12 + 16; two new GitHub repos seeded fresh → Tasks 18–19 (user decision); demo home keeps `/` → Global Constraints + Task 9; 1:1 design port → Global Constraints + spec doc; python on an always-on host → Tasks 15–16; monorepo stays as archive → Tasks 13, 20.
- **Placeholder scan:** every task carries concrete files, deltas, code (where new), verify commands, and commit commands; port-task code bodies are delegated to the restored spec doc (restored in Task 1) with explicit path/commit deltas, since that 2,000-line authored content is in-repo and verbatim reuse beats duplication. Gated pushes are procedures by design (they require repo-URL confirmation).
- **Type consistency:** content accessors (`getBlogPosts/getBlogPost/getProjects/getProject`, `formatLongDate`, `siteConfig.marketingNavigation/marketingPaths/cta`) were defined by the already-committed Task 1 and are consumed by the port pages per the spec doc's Tasks 4–8; `BACKEND_URL` default keeps the existing `/api` proxy contract identical in local dev; run.sh guards keep both the combined-workspace and standalone-python behaviors working.
