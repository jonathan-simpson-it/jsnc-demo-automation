/** Case studies ported verbatim from the Astro content collections
    (2026-09-04). Bodies keep their original markdown. */

export interface ProjectCase {
  slug: string;
  title: string;
  client: string;
  description: string;
  pubDate: string;
  tags: string[];
  featured: boolean;
  body: string;
}

export const PROJECTS: ProjectCase[] = [
  {
    slug: "pe-deal-flow-automation",
    title: "PE Deal Flow Automation",
    client: "Mid-Market PE Firm",
    description:
      "Automated term sheet analysis, covenant monitoring, and LP reporting for a 12-person deal team.",
    pubDate: "2026-08-01",
    tags: ["LangGraph", "RAG", "Compliance", "Automation"],
    featured: true,
    body: `## The Challenge

A mid-market PE firm was drowning in manual document processing. Their 12-person deal team spent 40% of their time on repetitive tasks.

## What We Built

A multi-agent AI system that automates the entire document analysis pipeline:

- **Term Sheet Analysis** — Extracts 19 structured fields from financing documents
- **Covenant Monitoring** — Tracks debt/EBITDA and current ratio against thresholds
- **LP Reporting** — Pulls data from multiple sources, generates quarterly reports

## Results

| Metric | Before | After |
|--------|--------|-------|
| Term sheet analysis | 2 hours | 15 minutes |
| LP report generation | 3 days | 4 hours |
| Compliance misses | 2-3 per quarter | 0 |
| Manual data entry | 60% of team time | <10% |`,
  },
  {
    slug: "sme-lending-platform",
    title: "SME Lending Platform",
    client: "Regional Bank",
    description:
      "Credit assessment platform with automated PII redaction, audit trails, and jurisdiction-aware compliance.",
    pubDate: "2026-07-15",
    tags: ["FastAPI", "RBAC", "Audit Trail", "Compliance"],
    featured: false,
    body: `## The Challenge

A regional bank was processing SME loan applications manually. Credit analysts spent hours reviewing financial statements and checking compliance across jurisdictions.

## What We Built

- **Automated Document Analysis** — Upload financial statements, KYC documents, loan applications
- **Compliance Engine** — Jurisdiction-aware regulatory checks, PII redaction, immutable audit trail
- **Credit Assessment** — Automated covenant checking, cash flow forecasting, risk scoring

## Results

| Metric | Before | After |
|--------|--------|-------|
| Application processing | 5 days | 4 hours |
| Compliance check coverage | 60% | 100% |
| PII exposure risk | High | Near-zero |`,
  },
];

export function getProjects(): ProjectCase[] {
  return [...PROJECTS].sort(
    (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
  );
}

export function getProject(slug: string): ProjectCase | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
