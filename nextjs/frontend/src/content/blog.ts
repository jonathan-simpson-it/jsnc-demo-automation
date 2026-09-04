/** Blog posts ported verbatim from the Astro content collections (2026-09-04).
    Bodies keep their original markdown; MarketingProse renders the subset
    actually used. The compliance post's inline logo figure becomes the
    [[regulator-logos]] token. */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: string; // ISO date, e.g. "2026-09-01"
  author: string;
  tags: string[];
  body: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ai-in-pe-due-diligence",
    title: "Why PE Deal Teams Need AI-Native Workflows",
    description: "The case for building AI into the deal process from day one.",
    pubDate: "2026-09-01",
    author: "Jonathan Simpson",
    tags: ["Private Equity", "AI", "Workflow Automation"],
    body: `Private equity deal teams spend 60% of their time on repetitive document analysis. Term sheet extraction, covenant monitoring, LP reporting — these are pattern-matching tasks that machines do better than humans.

Yet most firms still rely on spreadsheets and manual review.

The difference between "AI-assisted" and "AI-native" is architectural. AI-assisted means you paste a document into ChatGPT. AI-native means the AI is woven into your document management, reporting, and compliance systems — running automatically, consistently, with full audit trails.

Our PE AI Engineering Platform uses LangGraph to orchestrate specialized agents for due diligence, term sheet extraction, compliance checking, and LP reporting. After deploying for a mid-market PE firm:

- **80% reduction** in manual data entry
- **3x faster** LP report generation
- **Zero compliance misses** in 6 months

AI in PE isn't about replacing analysts. It's about eliminating the 3 hours of manual morning data pulls so analysts can focus on judgment and deal strategy.`,
  },
  {
    slug: "building-compliance-from-day-one",
    title: "Building Compliance Into AI Systems",
    description: "Why HKMA and SFC compliance should be a first-class architectural concern.",
    pubDate: "2026-08-15",
    author: "Jonathan Simpson",
    tags: ["Compliance", "HKMA", "SFC", "Architecture"],
    body: `Most AI systems treat compliance as a wrapper. Build the system, then add logging and audit trails after. This fails because bolt-on compliance misses edge cases — PII leaking through cache, audit gaps in streaming responses, model version drift.

When we build AI systems for SME financial institutions, compliance is Layer 0.

[[regulator-logos]]

**Immutable Audit Trail** — Every query logged with SHA-256 hash chain. Tamper-evident without external dependencies.

**PII Redaction** — Before data touches logs, cache, or exports, our redaction layer detects and masks emails, HKIDs, phone numbers, bank accounts, and credit cards.

**Model Version Pinning** — HKMA requires firms to freeze model versions. Our system tracks model name, version, config hash, and deployment timestamp.

**Document-Level RBAC** — Not just "who can query" but "who can query which documents."

A system that's compliant by construction, not by exception.`,
  },
];

export function getBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
  );
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
