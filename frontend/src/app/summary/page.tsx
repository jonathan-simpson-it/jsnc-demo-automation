"use client";
import { useState } from "react";
import { generateSummary } from "@/lib/api";
import type { SummaryResponse } from "@/lib/types";

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
        setData(null);
        setError(
          "No data yet. Use the AI Chat to generate some queries first.",
        );
      } else setData(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
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

        {/* Error / Empty */}
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
