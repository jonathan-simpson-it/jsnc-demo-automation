# Launchpad Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the homepage into a Mac-style launchpad: icon-dominant tiles grouped by category, backed by a shared app registry every later plan extends.

**Architecture:** A typed registry `frontend/src/lib/apps.tsx` holds `{key, name, description, href, category, icon}`; the homepage renders categories from it via shared `Launchpad` components. Later plans append entries and their own page routes.

**Tech Stack:** Next.js 14 App Router, TypeScript, existing JS&C design tokens (`globals.css`).

**Spec:** User vision: "Mac-style Launchpad … all apps should be in the home page including email." Decision: homepage-as-launchpad-grid (no overlay screen).

## Global Constraints

- No git commits in this session (user has not opted in; work stays uncommitted).
- No emojis in source; JS&C tokens only (`--color-accent`, `--color-accent-soft`, `--color-surface`, `--color-line`, `--color-muted`, `--color-ink`).
- Frontend validation only via `cd frontend && ./node_modules/.bin/tsc --noEmit` — never run `next build` while `next dev` is running (corrupts `.next`).
- Playwright geometry checks: 0 horizontal overflow at 390px and 1440px; 0 console errors.
- Keep header/footer untouched.

---

### Task 1: Create the app registry `frontend/src/lib/apps.tsx`

**Files:**
- Create: `frontend/src/lib/apps.tsx`

**Interfaces (consumed by all later plans):**
- `export type AppCategory = "Applications" | "Specialist Agents" | "Workbenches" | "Compliance & Risk" | "Operations" | "Developer";`
- `export interface LaunchpadApp { key: string; name: string; description: string; href: string; category: AppCategory; icon: React.ReactNode; }`
- `export const LAUNCHPAD_APPS: LaunchpadApp[]`
- `export function appsByCategory(): [AppCategory, LaunchpadApp[]][]` (fixed category order: Applications, Workbenches, Compliance & Risk, Operations, Developer, Specialist Agents; only non-empty categories returned)

- [ ] **Step 1:** Move the 10 existing entries from `frontend/src/app/page.tsx` (5 apps: AI Chat `/chat`, Documents `/documents`, Eval Dashboard `/eval`, Email Reports `/summary`, System Config `/config` + 5 agents `/chat?agent=*`) into `LAUNCHPAD_APPS`, keeping the exact SVG icon JSX from `page.tsx`. Categories: apps → `"Applications"`, agents → `"Specialist Agents"`.
- [ ] **Step 2:** Implement `appsByCategory()` with the fixed order above.
- [ ] **Step 3:** Run `cd frontend && ./node_modules/.bin/tsc --noEmit` — expect PASS.

### Task 2: Shared launchpad components

**Files:**
- Create: `frontend/src/components/Launchpad.tsx`

**Interfaces:**
- `export function LaunchpadTile({ app }: { app: LaunchpadApp }): JSX.Element` — `<Link>` tile: 56px squircle icon (radius 1.4rem, `--color-accent-soft` bg, accent icon color), centered name below (0.85rem, ink), whole tile is the link; hover lifts (reuse `.panel-card` hover via class or inline `transform` guarded by reduced-motion — simplest: wrap tile content in `panel-card` styling manually with hover translateY(-2px)).
- `export function LaunchpadSection({ title, apps }: { title: string; apps: LaunchpadApp[] })` — hairline-divided centered uppercase label (mirror existing `SectionLabel` styling from the current homepage) + responsive grid `repeat(auto-fit, minmax(9rem, 1fr))` centered tiles.

- [ ] **Step 1:** Write the two components with inline JS&C-token styles consistent with the codebase's inline-style convention.
- [ ] **Step 2:** `tsc --noEmit` PASS.

### Task 3: Rewrite homepage to render the registry

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1:** Replace the two hardcoded grids (and their local `LauncherCard`/`SectionLabel`/`APPS`/`AGENTS` code) with `appsByCategory().map(([title, apps]) => <LaunchpadSection title={title} apps={apps} />)`.
- [ ] **Step 2:** Keep the hero (h1 "Jonathan Simpson & Co.", subtitle, system-status pill with offline handling already present) unchanged above the sections; delete the old bottom utility-links row only if still present (it was removed earlier).
- [ ] **Step 3:** `tsc --noEmit` PASS.
- [ ] **Step 4:** Playwright: homepage shows the two category sections and 10 tiles; clicking Email Reports tile lands on `/summary`; 0 horizontal overflow at 390px and 1440px; 0 console errors.

### Task 4: Document the extension contract

**Files:**
- Modify: `README.md` (Frontend section)

- [ ] **Step 1:** Add short subsection "Adding an app": (1) create page route, (2) add a `LAUNCHPAD_APPS` entry with a category, (3) optional header-nav entry. Reference `frontend/src/lib/apps.tsx`.
- [ ] **Step 2:** Re-run README TOC anchor check only if headings changed (they don't — skip if so).
