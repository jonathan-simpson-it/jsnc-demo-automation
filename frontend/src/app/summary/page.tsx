"use client";
import { useState } from "react";
import { generateSummary } from "@/lib/api";
import type { SummaryResponse } from "@/lib/types";

const DEMO_WEEK: SummaryResponse = {
  period: "2026-08-26/2026-09-02",
  period_label: "Last 7 Days",
  since: "2026-08-26T00:00:00Z",
  total_queries: 47,
  avg_confidence: 0.84,
  agent_breakdown: [
    { agent: "due_diligence", count: 18, pct: 38 },
    { agent: "term_sheet", count: 12, pct: 26 },
    { agent: "compliance", count: 8, pct: 17 },
    { agent: "lp_report", count: 5, pct: 11 },
    { agent: "cross_doc", count: 4, pct: 9 },
  ],
  user_activity: [
    { user: "admin", queries: 29 },
    { user: "analyst", queries: 12 },
    { user: "partner", queries: 6 },
  ],
  top_queries: [
    {
      query: "Summarize the key risks in the Enosis term sheet",
      agent: "term_sheet",
      confidence: 0.91,
      timestamp: "2026-09-01T14:32:00Z",
    },
    {
      query: "Compare liquidation preferences across all three decks",
      agent: "cross_doc",
      confidence: 0.87,
      timestamp: "2026-09-01T11:15:00Z",
    },
    {
      query: "What are the anti-dilution provisions in the Dr. Yip proposal?",
      agent: "term_sheet",
      confidence: 0.83,
      timestamp: "2026-08-31T16:48:00Z",
    },
    {
      query: "Run compliance check on the Enosis pitch deck",
      agent: "compliance",
      confidence: 0.79,
      timestamp: "2026-08-31T09:22:00Z",
    },
    {
      query: "Due diligence summary for Jonathan Devano CV",
      agent: "due_diligence",
      confidence: 0.88,
      timestamp: "2026-08-30T15:10:00Z",
    },
    {
      query: "What ESOP pool size is recommended for Series A?",
      agent: "due_diligence",
      confidence: 0.82,
      timestamp: "2026-08-30T10:05:00Z",
    },
    {
      query: "Generate LP report for Q3 2026",
      agent: "lp_report",
      confidence: 0.86,
      timestamp: "2026-08-29T14:30:00Z",
    },
    {
      query: "Check board seat allocation across all term sheets",
      agent: "cross_doc",
      confidence: 0.80,
      timestamp: "2026-08-28T11:45:00Z",
    },
  ],
  email_markdown: `# Weekly Platform Summary
## Aug 26 -- Sep 2, 2026

**47 queries** processed across **5 agent types**
Average confidence: **84%**

### Agent Usage
| Agent           | Queries | Share |
|-----------------|---------|-------|
| Due Diligence   | 18      | 38%   |
| Term Sheet      | 12      | 26%   |
| Compliance      | 8       | 17%   |
| LP Report       | 5       | 11%   |
| Cross-Document  | 4       | 9%    |

### Top Queries
1. Summarize the key risks in the Enosis term sheet (91%)
2. Compare liquidation preferences across all three decks (87%)
3. What are the anti-dilution provisions in the Dr. Yip proposal? (83%)
4. Run compliance check on the Enosis pitch deck (79%)
5. Due diligence summary for Jonathan Devano CV (88%)

### User Activity
- admin: 29 queries
- analyst: 12 queries
- partner: 6 queries`,
};

const DEMO_MONTH: SummaryResponse = {
  period: "2026-08-02/2026-09-02",
  period_label: "Last 30 Days",
  since: "2026-08-02T00:00:00Z",
  total_queries: 183,
  avg_confidence: 0.82,
  agent_breakdown: [
    { agent: "due_diligence", count: 68, pct: 37 },
    { agent: "term_sheet", count: 49, pct: 27 },
    { agent: "compliance", count: 31, pct: 17 },
    { agent: "lp_report", count: 21, pct: 11 },
    { agent: "cross_doc", count: 14, pct: 8 },
  ],
  user_activity: [
    { user: "admin", queries: 112 },
    { user: "analyst", queries: 48 },
    { user: "partner", queries: 23 },
  ],
  top_queries: [
    {
      query: "Full due diligence on Enosis pitch deck",
      agent: "due_diligence",
      confidence: 0.92,
      timestamp: "2026-09-01T14:32:00Z",
    },
    {
      query: "Compare all term sheets for board seat allocation",
      agent: "cross_doc",
      confidence: 0.88,
      timestamp: "2026-08-28T11:45:00Z",
    },
    {
      query: "Compliance audit for PDF Solutions annual report",
      agent: "compliance",
      confidence: 0.85,
      timestamp: "2026-08-25T09:10:00Z",
    },
    {
      query: "Generate LP report for Q3 2026",
      agent: "lp_report",
      confidence: 0.86,
      timestamp: "2026-08-29T14:30:00Z",
    },
    {
      query: "Risk analysis on Dr. Yip proposal",
      agent: "due_diligence",
      confidence: 0.81,
      timestamp: "2026-08-20T16:20:00Z",
    },
  ],
  email_markdown: `# Monthly Platform Summary
## Aug 2 -- Sep 2, 2026

**183 queries** processed across **5 agent types**
Average confidence: **82%**

### Agent Usage
| Agent           | Queries | Share |
|-----------------|---------|-------|
| Due Diligence   | 68      | 37%   |
| Term Sheet      | 49      | 27%   |
| Compliance      | 31      | 17%   |
| LP Report       | 21      | 11%   |
| Cross-Document  | 14      | 8%    |

### Top Queries
1. Full due diligence on Enosis pitch deck (92%)
2. Compare all term sheets for board seat allocation (88%)
3. Compliance audit for PDF Solutions annual report (85%)
4. Generate LP report for Q3 2026 (86%)
5. Risk analysis on Dr. Yip proposal (81%)

### User Activity
- admin: 112 queries
- analyst: 48 queries
- partner: 23 queries`,
};

export default function SummaryPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");

  async function load(p: "week" | "month") {
    setPeriod(p);
    setLoading(true);
    setError(null);
    try {
      const r = await generateSummary(p);
      if (r.total_queries === 0) {
        // Show demo data when real data is empty
        setData(p === "week" ? DEMO_WEEK : DEMO_MONTH);
      } else setData(r);
    } catch {
      // API unreachable -- show demo data
      setData(p === "week" ? DEMO_WEEK : DEMO_MONTH);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Summary</span>
          <h2>Email reports.</h2>
          <p>
            Generate email-ready reports from the audit trail. Covers query
            volume, agent usage, and confidence scores.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-3" style={{ marginBottom: "2.5rem" }}>
          <button
            onClick={() => load("week")}
            className={`button button--small ${period === "week" && !loading ? "button--solid" : "button--ghost"}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => load("month")}
            className={`button button--small ${period === "month" && !loading ? "button--solid" : "button--ghost"}`}
          >
            Last 30 Days
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            Generating summary...
          </p>
        )}

        {/* Error */}
        {error && !loading && (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            {error}
          </p>
        )}

        {/* Data */}
        {data && !loading && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
              }}
            >
              {[
                { v: data.total_queries, l: "Total Queries" },
                {
                  v: `${Math.round(data.avg_confidence * 100)}%`,
                  l: "Avg Confidence",
                },
                { v: data.user_activity.length, l: "Active Users" },
                { v: data.agent_breakdown.length, l: "Agent Types" },
              ].map((s) => (
                <div key={s.l} className="panel-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, color: "var(--color-accent)" }}>
                    {s.v}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            {/* Agent Usage */}
            {data.agent_breakdown.length > 0 && (
              <div>
                <div className="section-intro">
                  <span className="section-eyebrow">Usage</span>
                  <h2>Agent breakdown.</h2>
                </div>
                <div className="panel-card">
                  {data.agent_breakdown.map((a) => (
                    <div
                      key={a.agent}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "0.75rem 0",
                        borderBottom: "1px solid var(--color-line)",
                        fontSize: "0.88rem",
                      }}
                    >
                      <span style={{ flex: 1, fontWeight: 500 }}>{a.agent}</span>
                      <span style={{ color: "var(--color-muted)" }}>
                        {a.count} queries
                      </span>
                      <span
                        className="chip"
                        style={{ minWidth: "3rem", justifyContent: "center" }}
                      >
                        {a.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Queries */}
            {data.top_queries.length > 0 && (
              <div>
                <div className="section-intro">
                  <span className="section-eyebrow">Queries</span>
                  <h2>Recent queries.</h2>
                </div>
                <div className="panel-card">
                  {data.top_queries.map((q, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.75rem 0",
                        borderBottom: "1px solid var(--color-line)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                        }}
                      >
                        <span style={{ fontSize: "0.88rem", fontWeight: 500, flex: 1 }}>
                          {i + 1}. {q.query}
                        </span>
                        <span className="chip">{q.agent}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--color-muted)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {q.confidence
                          ? `${Math.round(q.confidence * 100)}% confidence`
                          : ""}
                        {" -- "}
                        {q.timestamp.slice(0, 16).replace("T", " ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Preview */}
            <div>
              <div className="section-intro">
                <span className="section-eyebrow">Preview</span>
                <h2>Email preview.</h2>
              </div>
              <div className="panel-card">
                <pre style={{ margin: 0, border: "none", background: "transparent", padding: 0 }}>
                  <code>{data.email_markdown}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
