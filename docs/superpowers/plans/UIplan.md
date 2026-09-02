# Jonathan Simpson & Co. — Astro + Next.js Website Plan

**Goal:** Build marketing site (Astro) + AI tool (Next.js) following DESIGN-jonathansimpson.md.

**Architecture:** Monorepo with `web/` (Astro) and `ai-tool/` (Next.js), proxied to FastAPI backend.

---

## Tasks

### Phase 1: Scaffolding
- [x] Task 1: Initialize Astro project in `web/`
- [x] Task 2: Initialize Next.js project in `ai-tool/`

### Phase 2: Design System
- [x] Task 3: Create `web/src/styles/global.css` with design tokens
- [x] Task 4: Create `web/src/data/siteConfig.ts`
- [x] Task 5: Create `BaseLayout.astro`, `HeaderNav.astro`, `Footer.astro`
- [x] Task 6: Create `StructuredData.astro`, `SkipLink.astro`
- [x] Task 7: Create `SectionIntro.astro`, `PanelCard.astro`, `ChipList.astro`, `ProcessSteps.astro`, `CtaBand.astro`

### Phase 3: Marketing Pages
- [x] Task 8: Build homepage (hero, services, capabilities, process, CTA)
- [x] Task 9: Build services page
- [x] Task 10: Build work/case studies page + `[slug].astro`
- [x] Task 11: Build blog with content collections + `[slug].astro`
- [x] Task 12: Build products page
- [x] Task 13: Build applications page
- [x] Task 14: Build contact page
- [x] Task 15: Build support/FAQ page
- [x] Task 16: Create sitemap.xml.ts and robots.txt.ts

### Phase 4: Next.js AI Tool
- [x] Task 17: Create landing page (tool card grid)
- [x] Task 18: Build chat page with SSE streaming
- [x] Task 19: Build document manager page
- [x] Task 20: Build eval dashboard page
- [x] Task 21: Build configuration page

### Phase 5: Integration
- [x] Task 22: Wire API proxy in next.config.ts
- [x] Task 23: Verify builds

### Post-Plan
- [x] Email summary feature (`src/compliance/summary.py`, `/api/summary`, `/summary` page)
