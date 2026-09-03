"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchEvalResults } from "@/lib/api";
import type { EvalResults, EvalQuestion } from "@/lib/types";
import StatCard from "@/components/StatCard";
import { formatPercent, formatCount } from "@/lib/utils";

const DOC_NAMES: Record<string, string> = {
  cv: "CV (Jonathan Devano)",
  dr_yip: "Dr. Yip Proposal",
  enosis: "Enosis Pitch Deck",
  syllabus: "Syllabus (JMSC2043)",
  annual_report: "Annual Report (PDF Solutions)",
  lifexp: "LifeXP PRD",
};

export default function EvalPage() {
  const [data, setData] = useState<EvalResults | null>(null);
  const [failed, setFailed] = useState(false);
  const [docFilter, setDocFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    fetchEvalResults()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed)
    return (
      <section className="section">
        <div className="container" style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: "1.25rem" }}>
            Couldn't load eval results. Is the backend running?
          </p>
          <button type="button" onClick={load} className="button button--solid">
            Retry
          </button>
        </div>
      </section>
    );

  if (!data || data.error)
    return (
      <section className="section">
        <div className="container" style={{ textAlign: "center", color: "var(--color-muted)" }}>
          {data?.error || "Loading eval results..."}
        </div>
      </section>
    );

  const { meta, questions } = data;
  let filtered = questions;
  if (docFilter !== "All")
    filtered = filtered.filter((q) => q.doc === docFilter);
  if (statusFilter === "Passed")
    filtered = filtered.filter((q) => q.pass ?? q.passed);
  else if (statusFilter === "Failed")
    filtered = filtered.filter((q) => !(q.pass ?? q.passed));

  const uniqueDocs = Array.from(new Set(questions.map((q) => q.doc))).sort();
  const byDoc: Record<string, EvalQuestion[]> = {};
  for (const q of questions) {
    byDoc[q.doc] = byDoc[q.doc] || [];
    byDoc[q.doc].push(q);
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Evaluation</span>
          <h1 style={{ fontSize: "clamp(1.4rem, 3.8vw, 2rem)", fontFamily: "var(--font-display)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: "1rem" }}>
            Accuracy dashboard.
          </h1>
          <p>
            Performance metrics across {meta.questions || questions.length} test
            questions, updated{" "}
            {meta.timestamp
              ? new Date(meta.timestamp).toLocaleDateString()
              : "unknown"}
            .
          </p>
        </div>

        {/* Metric Cards */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
            marginBottom: "2.5rem",
          }}
        >
          <StatCard value={`${formatPercent(meta.pct)}%`} label="Accuracy" />
          <StatCard
            value={formatCount(meta.questions || questions.length)}
            label="Questions"
          />
          <StatCard
            value={`${formatCount(meta.avg_latency_ms || meta.avg_ms_per_question || 0)}ms`}
            label="Avg Latency"
          />
          <StatCard
            value={meta.llm_node_calls ? formatCount(meta.llm_node_calls) : "--"}
            label="LLM Calls"
          />
        </div>

        {/* Accuracy Bar */}
        <div
          style={{
            height: "0.5rem",
            background: "var(--color-accent-soft)",
            borderRadius: "999px",
            overflow: "hidden",
            marginBottom: "2.5rem",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "var(--color-accent)",
              borderRadius: "999px",
              width: `${Math.min(100, Math.max(0, Number(meta.pct) || 0))}%`,
              transition: "width 600ms ease",
            }}
          />
        </div>

        {/* Per-Document Breakdown */}
        <div className="section-intro">
          <span className="section-eyebrow">By Document</span>
          <h2>Per-document breakdown.</h2>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
            marginBottom: "2.5rem",
          }}
        >
          {Object.entries(byDoc)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, qs]) => {
              const p = qs.filter((q) => q.pass ?? q.passed).length;
              const pct = qs.length ? Math.round((100 * p) / qs.length) : 0;
              const name = DOC_NAMES[k] || k;
              return (
                <div
                  key={k}
                  className="panel-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    minHeight: "7.5rem",
                    padding: "1.25rem 1rem",
                  }}
                >
                  <div
                    title={name}
                    style={{
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: "var(--color-muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(1.5rem, 3vw, 1.9rem)",
                      fontWeight: 700,
                      lineHeight: 1.15,
                      letterSpacing: "-0.02em",
                      color: "var(--color-ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {pct}%
                  </div>
                  <div
                    style={{
                      marginTop: "0.25rem",
                      fontSize: "0.72rem",
                      color: "var(--color-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p}/{qs.length}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Question Results */}
        <div className="section-intro">
          <span className="section-eyebrow">Results</span>
          <h2>Question results.</h2>
        </div>

        {/* Filters */}
        <div
          className="flex flex-wrap items-center gap-4"
          style={{ marginBottom: "1.5rem" }}
        >
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            aria-label="Filter by document"
            className="select"
          >
            <option value="All">All documents</option>
            {uniqueDocs.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="select"
          >
            <option value="All">All statuses</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
          <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
            Showing {filtered.length} of {questions.length}
          </span>
        </div>

        {/* Question List */}
        <div className="space-y-2">
          {filtered.map((q, i) => {
            const ok = q.pass ?? q.passed ?? false;
            return (
              <details key={q.id || i} className="panel-card">
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    listStyle: "none",
                  }}
                >
                  <span style={{ fontSize: "0.88rem", fontWeight: 500, flex: 1 }}>
                    {q.id || i + 1}. {q.query || q.question || ""}
                  </span>
                  <span
                    className="chip"
                    style={{
                      background: ok
                        ? "var(--color-accent-soft)"
                        : "transparent",
                      color: ok ? "var(--color-accent)" : "var(--color-error)",
                      flexShrink: 0,
                    }}
                  >
                    {ok ? "Pass" : "Fail"}
                  </span>
                </summary>
                <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--color-muted)" }} className="space-y-1">
                  <div>Document: {q.doc}</div>
                  {q.expected && (
                    <div>
                      Expected: <code>{q.expected}</code>
                    </div>
                  )}
                  {q.actual && <div>Actual: {q.actual.slice(0, 500)}</div>}
                  {q.latency_ms && <div>Latency: {q.latency_ms}ms</div>}
                  {q.trace && (
                    <div>Pipeline: {q.trace.map((t) => t.node).join(" -> ")}</div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            No questions match the selected filters.
          </p>
        )}
      </div>
    </section>
  );
}
