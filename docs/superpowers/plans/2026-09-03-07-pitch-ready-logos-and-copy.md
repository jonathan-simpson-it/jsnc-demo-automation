# Pitch-Ready Demo: Regulator Logos, Naming & Copy Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live demo sell the service: put official SFC/HKMA logo marks next to every regulator name in the product demo UI and marketing site, reframe all names/copy around the marketing story ("we build this for firms like yours"), and land a restrained industry-polish pass — within the existing JS&C cream/sage editorial design system.

**Architecture:** Local logo assets committed under `frontend/public/pictures/` (demo source of truth; mirrored to `web/public/pictures/` for the Astro site). A small regulator registry + a `RegulatorMark` chip component render logo marks wherever regulator names appear (static copy, dynamic group headers, citations, result chips) and degrade gracefully to a monogram tile when an asset is missing. Copy pass follows DESIGN-jonathansimpson.md tone rules (outcomes not features, no invented numbers, direct).

**Tech Stack:** Next.js 14 (`frontend/`), Astro (`web/`), Tailwind + custom tokens in `globals.css`, Bash/curl + `sips` (macOS) for asset fetch/normalize. No backend changes.

**Spec:** `docs/superpowers/plans/UIplan.md`, `DESIGN-jonathansimpson.md`, `README.md` (UI tables), session decisions: logos in `frontend/public/pictures/`; placement = radar headers + intro, compliance auditor, chat citations/agent labels, marketing site; full copy pass; restrained polish.

## Global Constraints

- Design system only: cream `--color-bg:#f4f4ef`, surface white, near-black ink, sage accent `#80988f`; serif display (Georgia) for headings/brand, Inter body; no gradients/shadows/decorative motion; `prefers-reduced-motion` respected (see `DESIGN-jonathansimpson.md` §1–3, 10).
- Tone: direct, outcome-led, no buzzwords, **no invented metrics/client claims**, no fake quotes (DESIGN §12).
- Regulator marks are third-party official logos: always `alt`/aria text with full name, hyperlink to the official site (`target="_blank" rel="noopener noreferrer"`), plus a one-line attribution note where logos appear. AMLO has no logo (it is an ordinance) — text-only chip.
- All copy in British English, matching existing site ("analyse", "Summarise", "customise") except where US spelling is embedded in a proper name.
- No broken-image states anywhere: `RegulatorMark` must fall back to a monogram tile on missing/failed asset.
- Offline-safe demo: images are committed binaries; internet needed only once (Task 1).
- Verification standard: `npx tsc --noEmit` and `npm run build` in `frontend/`; `npm run build` in `web/`; live Playwright screenshots at 390 and 1440 width; clean console.

---

### Task 1: Fetch and commit regulator logo assets

**Files:**
- Create: `scripts/fetch-regulator-logos.sh`
- Create: `frontend/public/pictures/hkma-logo.png`, `frontend/public/pictures/sfc-logo.svg`
- Create: `web/public/pictures/hkma-logo.png`, `web/public/pictures/sfc-logo.svg` (mirrors)
- Create: `frontend/public/pictures/README.md` (sources + attribution)

**Steps:**
1. Write the fetch script with the verified official URLs.
2. Run it and validate downloads (`file`, `sips`). If a site is unreachable, use the monogram fallback path (no broken UI is possible since RegulatorMark degrades).
3. Mirror assets to `web/public/pictures/`; normalize HKMA jpg onto a white PNG (`python3` + Pillow, else `sips`; if Pillow is missing, keep jpg and rely on the white `.mark-tile` from Task 2).
4. Write the attribution README.
5. Visual check via Playwright `file://` + commit.

Source URLs (verified live 2026-09-03 from each regulator's own homepage):
- SFC: `https://www.sfc.hk/assets/images/common/logo.svg`
- HKMA: `https://www.hkma.gov.hk/statics/assets/img/logo.jpg`

Commit: `assets: add official SFC and HKMA logo marks for demo UI`

---

### Task 2: Regulator registry + RegulatorMark chip, wired into the Radar page

**Files:**
- Create: `frontend/src/lib/regulators.ts`
- Create: `frontend/src/components/RegulatorMark.tsx`
- Modify: `frontend/src/app/radar/page.tsx` (group headers ~:236-265, intro ~:154-157)
- Modify: `frontend/src/app/globals.css` (append mark styles)

**Interfaces:**
- Consumes: Task 1 assets at `/pictures/sfc-logo.svg`, `/pictures/hkma-logo.png`.
- Produces: `regulatorByCode(code: string): RegulatorMeta | null`, `regulatorForFilename(filename: string): RegulatorMeta | null` (`/^reg-(sfc|hkma)-/i`), `regulatorInText(text: string): RegulatorMeta | null` (word-boundary match), and component `<RegulatorMark code="SFC" size={20} withName={false} link={false} />` — used by Tasks 3–4.

Registry content: SFC (name "Securities and Futures Commission (SFC)", url `https://www.sfc.hk/en/`, logo `/pictures/sfc-logo.svg`, tile "SFC"); HKMA (name "Hong Kong Monetary Authority (HKMA)", url `https://www.hkma.gov.hk/eng/`, logo `/pictures/hkma-logo.png`, tile "HKMA"); AMLO (name "Anti-Money Laundering and Counter-Terrorist Financing Ordinance (AMLO)", url `https://www.elegislation.gov.hk/hk/cap615`, logo `null`, tile "AMLO").

Component behavior: renders logo `<img>` with alt = full name inside `.reg-mark`; on error OR when `meta.logo` is null, falls back to `.reg-mark-tile` monogram; optional `withName` label; wraps in official-site link when `link` is true (default).

globals.css additions: `.reg-mark`, `.reg-mark img` (white surface bg, line border, radius 0.4rem, contain), `.reg-mark-tile` (accent-soft pill), `.reg-mark-name` (uppercase micro-label).

Radar wiring: group header row becomes flex with `<RegulatorMark code={segment.regulator} size={20} />` before the existing uppercase "CODE — N items" text; unknown regulators still render via monogram fallback. Intro copy replaced (see plan copy) plus "Sources:" row with `<RegulatorMark code="SFC" withName />` and HKMA.

Verify: tsc, next build, seed two rows in `data/platform.db` (`sfc_circulars`/`hkma_press`, external_id `demo-sfc-1`/`demo-hkma-1`), Playwright screenshots at 1440 + 390 on `/radar`.

Commit: `feat(ui): show official SFC and HKMA logos in regulatory radar`

---

### Task 3: Compliance Auditor page — regulator marks and outcome copy

**Files:**
- Modify: `frontend/src/app/workbench/compliance-audit/page.tsx`
- Modify: `frontend/src/components/Workbench.tsx:23-64`

**Interfaces:** Consumes `RegulatorMark`, `regulatorInText` (Task 2). Produces no new API.

Steps:
1. Widen `WorkbenchPage` `description` prop type `string` → `ReactNode` (import already exists).
2. New description JSX (ReactNode fragment) naming regulators, with a "flex wrap" row of `<RegulatorMark code="SFC" withName />`, `<RegulatorMark code="HKMA" withName />`, `<RegulatorMark code="AMLO" withName />` (registry renders the AMLO tile).
3. Loading copy → `Running the audit against SFC, HKMA and AMLO expectations…`
4. Result chips map each regulation string via `regulatorInText`; when it matches, render small `<RegulatorMark code={...} size={14} link={false} />` before the raw text inside the existing `.chip`.
5. Typecheck + build; screenshot `/workbench/compliance-audit` at 390/1440.

Commit: `feat(ui): regulator logos and outcome copy on compliance auditor`

---

### Task 4: Chat — welcome copy, agent naming, and regulator marks on regulatory citations

**Files:**
- Modify: `frontend/src/app/chat/page.tsx` (welcome ~:231-234, `AGENT_NAMES` ~:48-54, `AGENTS` pill label ~:44, `SUGGESTIONS` ~:151-198)
- Modify: `frontend/src/components/CitationList.tsx`

**Interfaces:** Consumes `regulatorForFilename`, `RegulatorMark` (Task 2).

Steps:
1. Default welcome: `"Hello — I'm the Jonathan Simpson & Co. AI analyst for private markets. Ask me about due diligence, term sheets, LP reports, or SFC- and HKMA-aware compliance — grounded in the documents in this workspace."`
2. Agent-scoped welcome: `"Hello — I'm your ${AGENT_NAMES[...]}, tuned for private markets. Ask me anything about the documents in this workspace — every answer comes with its sources."`
3. Reviewer correction (executed): do NOT rename the chat compliance agent to "Compliance Auditor" — the chat agent corresponds to the Specialist-Agents launchpad tile "Compliance Checker" (apps.tsx key `compliance`), while the workbench page is the separate "Compliance Auditor" app. Keep `AGENT_NAMES.compliance` = "Compliance Checker" and the pill label "Compliance". 
4. `SUGGESTIONS.compliance` → `["Audit the term sheet for SFC, HKMA and AMLO gaps", "Which jurisdictions and regulations apply to this document?", "List the corrective actions the audit requires"]`.
5. `CitationList`: when `regulatorForFilename(p.filename)` matches, render `<RegulatorMark code={meta.code} size={12} link={false} />` inline before the filename text.
6. Reviewer addition: the welcome-message strings are never rendered as bubbles (hero replaces the single-welcome state), so also surface the pitch line in the hero subtitle paragraph — show the JS&C analyst sentence when no agent is selected (`agentType` falsy) and keep the original "You're chatting with X in Y" text for agent-scoped views.
7. Typecheck + build; Playwright check at 390/1440; live citation test if API key present, else structural check.

Commit: `feat(ui): pitch copy and regulator logos in chat welcome and citations`

---

### Task 5: Home page hero polish + pitch strip (demo frontend)

**Files:**
- Create: `frontend/src/components/PitchBand.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`

**Interfaces:** Produces `<PitchBand />` (no props).

PitchBand content (exact): eyebrow `Built by Jonathan Simpson & Co.`; h2 `This platform can be built for your firm.`; body paragraph: `We design, build, and deploy bespoke AI systems for regulated financial firms — grounded answers, human-in-the-loop review, and audit-ready trails, engineered around your documents and your regulators.`; buttons `Start a project` → `https://jonathansimpson.co/contact/` (siteConfig.siteUrl) and `Talk on LinkedIn` → `https://www.linkedin.com/company/jonathan-simpson-co` (siteConfig.socialLinks). Styled as a surface card (bg surface, 1px line border, `--radius-lg`, centered text) on the cream page.

```tsx
export default function PitchBand() {
  return (
    <section
      className="section--tight"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(1.5rem, 4vw, 2.5rem)",
        textAlign: "center",
        marginTop: "clamp(2rem, 5vw, 3.5rem)",
      }}
    >
      <p className="section-eyebrow" style={{ marginBottom: "0.5rem" }}>Built by Jonathan Simpson &amp; Co.</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(1.3rem, 3vw, 1.8rem)", letterSpacing: "-0.01em", color: "var(--color-ink)", margin: "0 0 0.6rem" }}>
        This platform can be built for your firm.
      </h2>
      <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", maxWidth: "34rem", margin: "0 auto 1.4rem", lineHeight: 1.6 }}>
        We design, build, and deploy bespoke AI systems for regulated financial
        firms — grounded answers, human-in-the-loop review, and audit-ready
        trails, engineered around your documents and your regulators.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <a className="button button--solid" href="https://jonathansimpson.co/contact/">Start a project</a>
        <a className="button button--ghost" href="https://www.linkedin.com/company/jonathan-simpson-co">Talk on LinkedIn</a>
      </div>
    </section>
  );
}
```

Home hero (exact): inside the centered text block, add above the h1: the brand avatar `<img src="/jsco-logo.png" alt="" width={72} height={72} style={{ borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }} />` then `<p className="section-eyebrow" style={{ marginBottom: "0.6rem" }}>Live demo — AI for private markets</p>`. h1 unchanged. New subtitle paragraph:

```tsx
Private-equity intelligence with the guardrails your firm needs: every
answer grounded in your documents and cited, every change reviewable,
every action on the record. This live demo runs the real system — built
by Jonathan Simpson &amp; Co. for firms that move money.
```

Status pill unchanged. Render `<PitchBand />` after the launchpad grid, inside the container.

Verify: tsc, build, Playwright `/` at 390/1440.

Commit: `feat(ui): pitch band and home hero polish for live demos`

---

### Task 6: Launchpad copy pass (apps.tsx) + README sync

**Files:**
- Modify: `frontend/src/lib/apps.tsx`
- Modify: `README.md` (app tables ~:83-87)

Names stay; replace each tile's `description` with exactly:

| key | final description |
|---|---|
| chat | "Grounded answers across your workspace — every one cited, with pipeline transparency and saved history." |
| documents | "Upload, tag, and assign documents to clients and projects — the knowledge base behind every answer." |
| eval | "Question-level accuracy metrics with a per-document breakdown, so you can show the system earns your trust." |
| email | "Weekly or monthly email-ready reports drawn from the tamper-evident audit trail." |
| config | "System status, active features, and registered agent types — full observability." |
| due_diligence | "Analyse investment opportunities and surface the risks a senior analyst would catch." |
| term_sheet | "Extract structured term-sheet data in seconds, not spreadsheets." |
| lp_report | "Quarterly LP reports drafted from the documents you already hold." |
| compliance | "Regulatory compliance checks grounded in the knowledge base — SFC, HKMA and AMLO-aware." |
| cross_doc | "Compare and synthesise across documents — find the differences that change a deal." |
| term_sheet_workbench | "Extract and analyse term sheets with a guided, reviewable workflow." |
| lp_report_workbench | "Draft quarterly LP reports and investor narratives from uploaded documents." |
| compliance_audit | "Audit documents against SFC, HKMA and AMLO expectations with cited findings and corrective actions." |
| review_hub | "Approve, edit, or reject AI answers before anything is delivered — humans in the loop." |
| filing_cabinet | "Ingest and route target-company files into the right project workspaces." |
| telemetry | "Live pipeline traces, token usage, and DeepSeek cost analytics." |
| radar | "Live SFC and HKMA circulars with recency-weighted retrieval — grounded in today's guidance." |

README sync: update `README.md` rows (lines ~83-87 and any mirror of the tile descriptions) to match the new text for the apps whose descriptions changed.

Verify: `cd frontend && npx tsc --noEmit`; grep the old phrases (`"Chat with the PE AI assistant"`, `"Extract structured data from term sheets"`, `"Generate quarterly LP reports"`, `"Check regulatory compliance of documents"`) to confirm none remain.
Commit: `copy: outcome-led launchpad descriptions for client pitches`

---

### Task 7: Marketing site (web/) — regulator logos + hire-us copy

**Files:**
- Modify: `web/src/content/blog/building-compliance-from-day-one.md`
- Modify: `web/src/pages/products.astro`
- Modify: `web/src/pages/applications.astro`
- Modify: `web/src/data/siteConfig.ts`

**Step 1 — Blog figure** (`building-compliance-from-day-one.md`, right after the intro paragraph — insert before the section that begins "**Model Version Pinning**"):

```html
<figure style="display:flex;gap:1.5rem;align-items:center;margin:2rem 0;background:var(--color-surface);border:1px solid var(--color-line);border-radius:var(--radius-lg);padding:1.5rem;flex-wrap:wrap;">
  <a href="https://www.sfc.hk/en/" target="_blank" rel="noopener noreferrer"><img src="/pictures/sfc-logo.svg" alt="Securities and Futures Commission (SFC) logo" style="height:36px;width:auto;background:#fff;border-radius:6px;padding:4px 8px;border:1px solid var(--color-line);"/></a>
  <a href="https://www.hkma.gov.hk/eng/" target="_blank" rel="noopener noreferrer"><img src="/pictures/hkma-logo.png" alt="Hong Kong Monetary Authority (HKMA) logo" style="height:36px;width:auto;background:#fff;border-radius:6px;padding:4px 8px;border:1px solid var(--color-line);"/></a>
  <figcaption style="font-size:0.8rem;color:var(--color-muted);line-height:1.5;flex:1;min-width:12rem;">We build compliance-first systems against the standards these regulators publish. Logos belong to their owners and identify official sources.</figcaption>
</figure>
```

**Step 2 — Products page copy** (replace the `products` array in `products.astro`):

```ts
const products = [
  { title: "PE AI Engineering Platform", desc: "A production-grade AI workspace for private-equity firms: retrieval-grounded answers, human review, and a tamper-evident audit trail. A live demo ships with every engagement.", tags: ["Live demo", "Multi-agent", "Audit-ready"], status: "In Production" },
  { title: "Compliance Toolkit", desc: "Compliance infrastructure your regulators expect: immutable audit trails, PII redaction, explainability exports, and jurisdiction-aware checks — SFC, HKMA and AMLO first.", tags: ["Audit Trail", "PII Redaction", "SFC · HKMA · AMLO"], status: "In Production" },
  { title: "Financial Operations Suite", desc: "Covenant monitoring, cash-flow forecasting, and multi-currency handling — the operational layer behind the numbers.", tags: ["Forecasting", "Multi-Currency", "Monitoring"], status: "Beta" },
];
```

**Step 3 — Applications page:** intro `SectionIntro` description → `"Every application below runs live — we'll walk you through it on your own documents."`; AI Chat card desc → `"Natural-language analysis of your documents with cited, reviewable answers."`

**Step 4 — siteConfig capabilities** (replace the two entries):

```ts
{ title: "Private Equity Workflow Automation", description: "Term-sheet analysis, covenant monitoring, LP reporting — retrieval-grounded AI that your team actually trusts.", tags: ["RAG", "Multi-Agent", "Grounded Answers"] },
{ title: "Regulatory Compliance Systems", description: "SFC, HKMA and AMLO-aware compliance built into your tools — with audit trails, explainability exports, and human review.", tags: ["Audit", "Explainability", "Human Review"] },
```

Verify: `cd web && npm run build` PASS; `npm run preview` + Playwright on the blog post page at 390/1440 — logos visible, no broken images.
Commit: `copy(site): hire-us value prop and regulator logos across marketing site`

---

### Task 8: Full demo QA sweep and readme/polish commit

- Full builds: frontend tsc + next build, web astro build — PASS.
- Live Playwright sweep `/`, `/chat`, `/radar`, `/workbench/compliance-audit`, `/review-hub`, `/documents` at 390 and 1440: marks render, no horizontal overflow, no console errors, chips wrap.
- Clean up demo seed rows from Task 2 (`DELETE FROM regulatory_feed WHERE external_id LIKE 'demo-%';`) if still present.
- `git status` clean of unintended files; commit any leftover fixes.

## Self-review notes

- Spec coverage: regulator logos at every requested location (radar headers + intro; compliance auditor; chat welcome/citations; marketing blog + capability pages); full copy pass; pitch strip; restrained polish.
- No placeholders: every step carries real copy/code; only conditional is asset-fetch fallback (network) with defined monogram path.
- Type consistency: one registry (`regulators.ts`) + one component (`RegulatorMark`) shared by Tasks 2–4; `regulatorForFilename`/`regulatorInText` signatures fixed in Task 2 and used identically later; Workbench `description` widened to `ReactNode`; citation filename pattern `reg-<code>-` matches backend contract (plan 2026-09-03-05).
