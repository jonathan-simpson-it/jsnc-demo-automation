# PE AI Platform — Product Design (as built)

> **Foundation:** tokens, type, color and agency methodology live in
> [`DESIGN-jonathansimpson.md`](./DESIGN-jonathansimpson.md). This document is
> the living **product design** for the working application: layout rules,
> workspace blueprints, interaction and state patterns, and copy conventions —
> written against the code, so pages should match it.
>
> **Repo rules:** all diagrams in Mermaid (see `devano.md`); no emojis in
> source or UI copy; user-facing copy is provider-neutral ("API key", never a
> vendor name).

---

## 1. Design Principles

1. **Workspaces are app shells; marketing is the exception.** Any page that is
   a daily tool (`/chat`, `/documents`, `/radar`, `/summary`) fills the
   viewport and pins its primary action (prompt, composer, primary button)
   where the user reaches for it — usually the bottom or the top of its
   content column. Marketing chrome (the footer) must not push those actions
   off-screen.
2. **One action, one place.** A single CTA appears once per viewport in the
   context that needs it. Navigation holds global controls (e.g. the API key
   button); pages must not duplicate them as banners or floating blocks.
3. **Hierarchy before decoration.** Filters that scope content sit *above* the
   content they scope. Brand marks appear once per viewport; decorative icons
   must not compete with the wordmark.
4. **States are designed, not emergent.** Every data-driven surface defines
   loading, empty, error, disabled, and demo states with explicit copy.
5. **Ground truth over demo.** Real data always wins; demo data is allowed for
   flows that need credentials (mail) but is always labeled "demo".

---

## 2. Layout Rules

- **Page height:** tool pages use `calc(100vh - 3.5rem)` /
  `calc(100dvh - 3.5rem)` shells (see `.chat-shell`); marketing pages scroll
  normally with the footer.
- **Footer visibility:** `<Footer/>` renders only outside `/chat` (the chat
  workspace is a true app shell; the prompt bar sits at the viewport bottom).
  Footer remains the marketing footer on other routes.
- **Header:** one brand mark + pill nav + at most one global utility control
  (API key button) + `StatusBadge` where meaningful. No per-page headers
  duplicate the brand.
- **Containers:** content width via `.container`
  (`min(72rem, calc(100% - 2.5rem))`); dashboards may widen to `68rem`
  (homepage) with panels using `auto-fit, minmax(...)` grids.
- **Scroll behavior (chat):** the conversation follows only when the user is
  pinned within 8px of the bottom, only on real content changes, and never on
  submit. Node events ("Classifying query") never scroll. Conversation/open
  jumps instantly to the end once.
- **Type measure:** paragraphs inside data cards are never capped by the
  marketing `40rem` rule (`max-width: none` inside `StructuredOutput`);
  marketing/prose paragraphs keep the cap.

---

## 3. Global Shell & Navigation

| Element | Rule |
|---|---|
| Header brand | One logo + serif wordmark (left); no repeats elsewhere on tool pages |
| Nav | Pill links: Chat · Documents · Eval · Summary · Config |
| Utility | Single ghost button opens the API-key popover (`KeySettings`); label states: `My key active` / `Server key in use` / `Add API key` |
| Popover | Two states — no key: explainer + masked password input + Save + provider link; key set: "stored only in this browser" + masked key + Remove. Save fires a toast: "API key saved — stored only in this browser, never on our servers." |
| Footer | 5-column JS&C footer on non-chat routes only |

**Brand placement budget per viewport:** header (1×). Avatars use neutral
glyphs (chat bubbles) — never the logo.

---

## 4. Workspace Blueprints

### 4.1 Home `/`

1. Hero: centered logo roundel, eyebrow, display title, one-line pitch,
   system status dot. *(Logo permitted here — it is the identity page.)*
2. **Regulatory calendar panel** — current month; days with radar items are
   tappable and open that day's item list (regulator · kind · title links).
   Dates normalized from raw or ISO feed values.
3. **Latest from the radar panel** — the 6 newest dated items with links.
4. **Platform report card** — weekly totals (queries, confidence, top agent)
   with a link to `/summary`.
5. Launchpad category grid (registry-driven) + pitch band.
6. States: backend offline shows `Backend offline`; empty feed → "Nothing on
   the radar yet."

### 4.2 Chat `/chat` (app shell)

```
┌────────────────────────┬──────────────────────────────────────────────┐
│ RAIL (16rem)           │ TOP STRIP: status · agent · streaming node   │
│ Chats · New chat       │ (no logo, no marketing)                      │
│ workspace select       ├──────────────────────────────────────────────┤
│ rows: title + meta     │ Messages (role=log, overflow-y-auto)         │
│ delete on hover        │   hero: glyph · headline · copy              │
│ narrow: drawer         │         agent pills (query modes)            │
│                        │         suggestion cards (3–4)               │
│                        │   or conversation bubbles + citations        │
│                        ├──────────────────────────────────────────────┤
│                        │ COMPOSER (pinned bottom)                     │
│                        │  unlock state OR pills + input + send        │
└────────────────────────┴──────────────────────────────────────────────┘
```

- **Hero (welcome):** neutral chat glyph in the large avatar circle, headline
  ("What can I help with?"), one-sentence workspace/agent copy, **agent pills
  above the suggestion cards**, then the suggestion grid, then the footnote
  ("Answers cite their sources…").
- **Conversation:** user messages right-aligned accent bubbles; assistant
  answers as surface cards with agent label + scope chip, `StructuredOutput`
  body (sections/table-free lists, bold rendered, no raw `**`), Sources list,
  collapsed "How I got this answer" inspector. Message avatars use the chat
  glyph.
- **Composer:** agent pills (query modes) above the input in conversations;
  staged attachments/@-mention chips; mention popover; send button shows
  streaming dots while busy. Placeholder names the active agent; @-mention
  only after a project workspace is selected (else a notice explains).
- **No-key state:** the input is disabled and a single slim inline row shows
  "Add an API key to start chatting." + a small `Add API key to unlock
  prompt` button that opens the header popover. No banners.
- **Errors:** friendly, actionable (invalid/401 → "check the API key in the
  header button"; missing key → same inline unlock state; network → "Can't
  reach the backend…"). Error answers surface immediately — never silently
  queued for review.
- **Footer:** none on this route.

### 4.3 Documents `/documents`

- Workspace tree (Client → Project) with strict scope-isolation banner;
  Local upload + OneDrive tabs; per-file live upload/import rows (index
  badge, streaming dots, chunk counts, statuses); assign modal; inline
  tagging chips.
- Every mutation surface defines busy/error states inline on the row, never
  as global banners.

### 4.4 Radar `/radar`

- Header: eyebrow + title + last-run + status chip + `Check now`.
- **Grouping:** per regulator; SFC renders its hub sections as sub-headings
  (`News — N items`, `Policy statements`, `High shareholding`, `Events`);
  HKMA stays flat. Each section shows its newest items (feed: newest 10 per
  regulator; SFC section order follows the hub).
- **Item card:** title (external link) · kind chip · date · status chip ·
  chunk count · impact summary (or "Impact summary pending.").
- Feed semantics: incremental, idempotent; fixture data never leaks into the
  live feed (fixture-only sources exist for offline tests only).

### 4.5 Email / `/summary` (mailbox workspace)

```
┌────────────────────────────────────┬──────────────────────────────────┐
│ COMPOSER panel                     │ RECENT MAIL panel                │
│  subject · to (optional)           │  mailbox label + demo tag        │
│  template chips: digest/monthly/   │  expandable rows: subject,       │
│    client/alert                    │  sender · time, preview,         │
│  tone chips: professional/         │  "Open in Outlook ↗"             │
│    friendly/formal                 ├──────────────────────────────────┤
│  instructions field                │ SAVED DRAFTS panel               │
│  [Draft with AI] [Write|Preview]   │  subject · to · saved date,      │
│  body textarea (markdown-lite)     │  demo tag, open-in-Outlook       │
│  OR full rendered email preview    │                                  │
│  [Save to Outlook drafts]          │                                  │
│  result note inline                │                                  │
└────────────────────────────────────┴──────────────────────────────────┘
```

- Drafts are composed from the platform report: deterministic templates
  always work; with an API key available the same button returns an AI
  refinement (`generated_by: "ai"`), otherwise a labeled template fallback.
- The reviewer edits subject/body freely, previews the rendered email, then
  saves to the user's real Outlook Drafts (nothing is ever sent).
- Without Graph credentials the whole page runs in **demo mode**, explicitly
  tagged (`demo@firm.local · demo`), drafts stored locally
  (`data/graph_drafts.db`).
- No report metrics cards, no agent breakdown, no raw markdown — the page is
  a mail tool.

### 4.6 Other surfaces

- **Eval:** accuracy dashboard; personal candidate (`cv_*`) questions are
  excluded at the API.
- **Config:** system status, features, agent types — read-only information.
- **Workbenches / Review Hub / Telemetry:** shared panel-card + chip language
  (see component inventory).

---

## 5. Key & Onboarding States

| State | Rule |
|---|---|
| No user key, no server key | Header shows `Add API key`; chat prompt disabled + inline unlock control; agent requests return structured `402 missing_api_key` surfaced as copy |
| User key saved | `My key active`; toast on save; key only in `localStorage`, sent as `X-API-Key`, never logged/stored server-side |
| Server key only | `Server key in use`; no prompts |
| Key invalid | Answer/error copy: "Your request was rejected by the model service. Check the API key in the header button — it may be invalid or out of credit." |

---

## 6. Copy & Content Rules

- No emojis; use typographic marks (`—`, `·`, `↗`) where needed.
- Provider-neutral: say "API key"; provider links are functional only.
- Tool surfaces use small-caps section eyebrows + sentence-case headings;
  labels (kinds, chips, table headers) are Title Case or uppercase-scoped per
  component pattern, never ALL-CAPS sentences.
- States: loading ("Loading mailbox...", "Generating…"), empty ("No chats
  yet. Start one below.", "Nothing on the radar yet."), demo ("demo" tag +
  one-line explanation), error (actionable, names the fix).
- Date display: `Sep 3, 2026`-style short dates in lists; full timestamps in
  metadata rows.

---

## 7. Accessibility & Interaction Standards

- Skip-to-content link; `:focus-visible` outline on interactive elements.
- Live regions: chat uses `role="log"` + `aria-live="polite"`; status
  changes (`streamingNode`) also polite.
- `prefers-reduced-motion`: animations (streaming dots, hover lifts) degrade
  to none.
- Targets: rail delete / day cells / chips meet ≥ ~24–32px hit areas; text
  never color-only (status adds text labels).
- Keyboard: mention popover supports arrows/enter/escape; dialogs use real
  buttons; selects for workspace.
- Semantics: list boxes/options roles for popovers; `aria-pressed` on agent
  pills; `aria-expanded` on drawers/popovers.

---

## 8. Component Inventory (frontend/src/components)

| Component | Purpose |
|---|---|
| `Header` / `Footer` | Global chrome; Footer auto-hides on `/chat` |
| `StatusBadge` | Health dot + label |
| `ApiKeyProvider` / `KeySettings` | Key state context, popover, toast, inline prompt actions |
| `ChatMessage` | Assistant/user bubbles (structured body, citations) |
| `StructuredOutput` | Sectioned JSON answers: bold rendering, pre-wrap, full card width |
| `CitationList` / `PipelineInspector` | Sources + trace/confidence panel |
| `EmailPreview` | Rendered email from markdown-lite (headings, tables, meta rows) |
| `EmailComposer` / `DraftsPanel` | `/summary` compose + saved-draft lists |
| `HomeDashboard` | Home calendar + latest + report card |
| `Launchpad` / `StatCard` / `PitchBand` | Homepage primitives |

---

## 9. Visual QA Checklist

On every release, verify per page:

- [ ] `/chat`: footer absent; composer at viewport bottom; hero order
      heading → copy → agent pills → suggestions; one brand mark; no
      duplicate API CTAs; no scroll jump when sending; no-key state renders
      the inline unlock control.
- [ ] `/summary`: two-column mailbox layout; template generate → preview →
      save → draft appears in Saved drafts; demo labels visible when
      unconfigured; no stats/agent/preview clutter.
- [ ] `/radar`: SFC sections ordered News → Policy → High shareholding →
      Events; newest per section; no fixture/fictional rows; links open the
      real SFC/HKMA pages.
- [ ] `/`: calendar marks item days; latest list shows real dates; report
      card matches the summary endpoint.
- [ ] Global: single API-key CTA in the header; toasts on key save;
      `npx tsc --noEmit` and the backend pytest set green.
