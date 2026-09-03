# Home Calendar: Radar + Graph Mail, with Month Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** On `localhost:3000/`, the home dashboard calendar aggregates regulatory-radar circulars **and** Microsoft Graph mailbox emails by date (clickable days list both, with type badges), gains prev/next-month navigation, and shows an "Inbox" card — with the full launchpad grid staying below the dashboard.

**Architecture:** Pure frontend change to the existing `HomeDashboard` component (committed `c0e4c6f`). It consumes the already-shipped backend + API client: `GET /api/graph/mail/status` → `GraphMailStatus {configured, reason?, mailbox?}` and `GET /api/graph/mail/messages?limit=N` → `{emails: GraphEmail[]}` with `GraphEmail {id, subject, from, from_email, received_at: string|null, body_preview, web_link}` (`fetchGraphMailStatus`, `fetchGraphMail` in `frontend/src/lib/api.ts`, types in `types.ts`). Radar items come from existing `fetchRegulatoryFeed()`. No backend changes.

**Tech Stack:** Next.js 14 client component, inline styles + existing design tokens (surface/line/ink/muted/accent + accent-soft), existing `RegulatorMark` component. No new dependencies.

**Spec:** Session decisions: (1) emails in calendar dots + day lists, plus a separate Inbox card; (2) add prev/next month navigation with a Today control; (3) when mail is unconfigured, show the Inbox slot with a clean note (layout stays stable). Constraint: no invented email data — when unconfigured the UI says so honestly (repo precedent: commit `119b3e2` removed fake demo data).

**Files:**
- Modify: `frontend/src/components/HomeDashboard.tsx` (single file; only globals.css touched if a glyph style is needed — likely not, all inline)

---

### Task 1: Calendar + Inbox card with Graph mail (single component task)

**Interfaces:**
- Consumes: `fetchRegulatoryFeed`, `fetchGraphMailStatus`, `fetchGraphMail`, `generateSummary` from `@/lib/api`; types `RegulatoryFeedItem`, `GraphEmail`, `GraphMailStatus`, `SummaryResponse`; `RegulatorMark` from `@/components/RegulatorMark`; helpers `toIso`, `fmtIso`, `dayKey` (already in file).
- Produces: none (page.tsx already renders `<HomeDashboard />` between the hero and the launchpad grid).

- [ ] **Step 1: Baseline gate**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (working tree clean at `2de908f` — re-check `git status` first; if the parallel session edited `HomeDashboard.tsx`, review its diff before proceeding).

- [ ] **Step 2: Add state + data loading**

State additions: `emails: GraphEmail[] | null`, `mailStatus: GraphMailStatus | null`, `view: {y, m}` (init current), plus imports of `fetchGraphMailStatus`, `fetchGraphMail`, and the two types. Auto day-selection moved into an effect that waits for BOTH `feed` and `emails` to be non-null, runs once (guard with a `picked` ref), picks: today if any dated radar/email item is today, else newest dated key across both, else today.

- [ ] **Step 3: Rebuild calendar on `view`**

`CalendarDay` becomes `{ date, key, radar: RegulatoryFeedItem[], mail: GraphEmail[], inMonth }`. Maps `byDate` (radar) + `mailByDate` (emails via `toIso(received_at)`). `cells` memo depends on `[view, byDate, mailByDate]`. Header: eyebrow "Radar & inbox"; title = month of `view`; ‹ › nav buttons (aria-labels) shift month; a "Today" button shows when not on the current month (returns to today and re-picks default day). Day cells: interactive when radar or mail items exist; dot = accent for radar-only, ink for mail-only, two dots when both; `title`/`aria-label` list counts; empty/out-of-month styling preserved.

- [ ] **Step 4: Day-detail list shows both sources**

Selected-day `<ul>`: radar rows (mini `RegulatorMark size={14} link={false}` before title; keep existing meta line) then mail rows (inline SVG envelope glyph, subject links to `web_link`, meta `from · received date+time`, single-line ellipsized `body_preview`). Empty line becomes "No circulars or mail on {date}." When navigating months, reset `selected` to the first available day in the target month (or null → month summary line).

- [ ] **Step 5: Inbox card (first card of right column)**

Header eyebrow "Inbox" + "Email page →" link to `/summary`; h2 shows mailbox (when configured) or "Mailbox not connected". Bodies: status loading → "Checking mailbox status…"; unconfigured → the exact `.env` note copy (GRAPH_TENANT_ID / GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET); configured but empty → "No messages in this mailbox yet."; else newest 5 as subject links (`web_link`, target blank) with `from · date` meta.

- [ ] **Step 6:** "What's new" and platform report cards unchanged.

- [ ] **Step 7: Typecheck + build** — `npx tsc --noEmit` PASS; `npm run build` PASS with the Next dev server stopped (shared `.next`), then restart dev.

- [ ] **Step 8: Live verification** — no Graph creds: calendar radar dots render from the live feed; month nav works (‹ → previous month, Today returns); Inbox card shows the not-connected note; day click shows radar rows with marks; launchpad below dashboard; no overflow at 1440/390; console clean. Screenshots to `.playwright-mcp/qa-shots/`. Configured path (needs creds): code-review + note in report if credentials absent.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/HomeDashboard.tsx
git commit -m "feat(ui): home calendar merges radar and Graph mail with month navigation"
```

---

## Self-review

- Scope matches the three confirmed decisions; no backend work (endpoints + client shipped in `2de908f`); launchpad placement already correct in `page.tsx`.
- Edge cases: unconfigured mail, empty mailbox, failures, out-of-month selection, undated/absent `received_at`, no-subject emails, empty months, narrow layout.
- Honesty constraint: no fake mail data; unconfigured state shows the config note.
- Interfaces match `types.ts`/`api.ts` exactly; `toIso` handles the ISO-with-time `received_at`.
- Risk: parallel session may edit `HomeDashboard.tsx` — start with `git status`/`git diff HEAD` check and merge before editing.
