"use client";
import { useEffect, useState } from "react";
import { generateSummary } from "@/lib/api";
import type { SummaryResponse } from "@/lib/types";
import StatCard from "@/components/StatCard";
import { formatPercent, formatCount } from "@/lib/utils";

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
      setData(r);
    } catch {
      setError("Couldn't generate the report. Is the backend running?");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Load the default period on first visit so the page is never empty.
  useEffect(() => {
    load("week");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Summary</span>
          <h1 style={{ fontSize: "clamp(1.4rem, 3.8vw, 2rem)", fontFamily: "var(--font-display)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: "1rem" }}>
            Email reports.
          </h1>
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
        {data && !loading && data.total_queries === 0 && (
          <div
            className="panel-card"
            style={{
              textAlign: "center",
              padding: "2.5rem 1.5rem",
              color: "var(--color-muted)",
              fontSize: "0.9rem",
            }}
          >
            No activity in this period yet. Ask the agents a few questions and
            this report will reflect them.
          </div>
        )}
        {data && !loading && data.total_queries > 0 && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
              }}
            >
              <StatCard value={formatCount(data.total_queries)} label="Total Queries" />
              <StatCard
                value={`${formatPercent((data.avg_confidence ?? 0) * 100)}%`}
                label="Avg Confidence"
              />
              <StatCard value={formatCount(data.user_activity.length)} label="Active Users" />
              <StatCard
                value={formatCount(data.agent_breakdown.length)}
                label="Agent Types"
              />
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
                        style={{
                          minWidth: "3rem",
                          textAlign: "right",
                          flexShrink: 0,
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--color-muted)",
                        }}
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
                        <span
                          style={{
                            fontSize: "0.74rem",
                            color: "var(--color-muted)",
                            flexShrink: 0,
                            marginTop: "0.15rem",
                          }}
                        >
                          {q.agent}
                        </span>
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
