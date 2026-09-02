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
    <div className="container py-12">
      <h1 className="text-3xl mb-2 font-serif">Email Summary</h1>
      <p className="text-sm text-muted mb-8">
        Generate email-ready reports from the audit trail.
      </p>
      <div className="flex gap-3 mb-8">
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
      {loading && (
        <p className="text-sm text-muted text-center py-12">
          Generating summary...
        </p>
      )}
      {error && !loading && (
        <p className="text-sm text-muted text-center py-12">{error}</p>
      )}
      {data && !loading && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { v: data.total_queries, l: "Total Queries" },
              {
                v: `${Math.round(data.avg_confidence * 100)}%`,
                l: "Avg Confidence",
              },
              { v: data.user_activity.length, l: "Active Users" },
              { v: data.agent_breakdown.length, l: "Agent Types" },
            ].map((s) => (
              <div key={s.l} className="panel-card text-center">
                <div className="text-2xl font-bold text-accent">{s.v}</div>
                <div className="text-xs text-muted mt-1">{s.l}</div>
              </div>
            ))}
          </div>
          {data.agent_breakdown.length > 0 && (
            <div>
              <h2 className="text-xl mb-4 font-serif">Agent Usage</h2>
              <div className="panel-card space-y-2">
                {data.agent_breakdown.map((a) => (
                  <div
                    key={a.agent}
                    className="flex items-center gap-3 text-sm py-2 border-b border-line last:border-0"
                  >
                    <span className="flex-1 font-medium">{a.agent}</span>
                    <span className="text-muted">{a.count} queries</span>
                    <span className="text-accent font-medium">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.top_queries.length > 0 && (
            <div>
              <h2 className="text-xl mb-4 font-serif">Recent Queries</h2>
              <div className="panel-card space-y-2">
                {data.top_queries.map((q, i) => (
                  <div
                    key={i}
                    className="py-2 border-b border-line last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium flex-1">
                        {i + 1}. {q.query}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-bg border border-line">
                        {q.agent}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {q.confidence
                        ? `${Math.round(q.confidence * 100)}% confidence`
                        : ""}{" "}
                      -- {q.timestamp.slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="text-xl mb-4 font-serif">Email Preview</h2>
            <div className="panel-card">
              <pre className="text-xs text-muted whitespace-pre-wrap leading-relaxed">
                {data.email_markdown}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
