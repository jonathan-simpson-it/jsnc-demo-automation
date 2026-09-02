"use client";
import { useEffect, useState } from "react";
import { fetchEvalResults } from "@/lib/api";
import type { EvalResults, EvalQuestion } from "@/lib/types";

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
  const [docFilter, setDocFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchEvalResults()
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.error)
    return (
      <div className="container py-12 text-center text-muted">
        {data?.error || "Loading eval results..."}
      </div>
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
    <div className="container py-12">
      <h1 className="text-3xl mb-8 font-serif">Eval Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { v: `${meta.pct}%`, l: "Accuracy" },
          { v: String(meta.questions || questions.length), l: "Questions" },
          {
            v: `${meta.avg_latency_ms || meta.avg_ms_per_question || 0}ms`,
            l: "Avg Latency",
          },
          {
            v: meta.timestamp
              ? new Date(meta.timestamp).toLocaleDateString()
              : "--",
            l: "Last Run",
          },
        ].map((s) => (
          <div key={s.l} className="panel-card text-center">
            <div className="text-3xl font-bold text-accent">{s.v}</div>
            <div className="text-xs text-muted mt-1">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="h-3 bg-accent-soft rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-accent rounded-full"
          style={{ width: `${meta.pct}%` }}
        />
      </div>
      <h2 className="text-xl mb-4 font-serif">Per-Document Breakdown</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {Object.entries(byDoc)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, qs]) => {
            const p = qs.filter((q) => q.pass ?? q.passed).length;
            return (
              <div key={k} className="panel-card text-center">
                <div className="text-lg font-medium">
                  {qs.length ? Math.round((100 * p) / qs.length) : 0}%
                </div>
                <div className="text-xs text-muted mt-1">
                  {DOC_NAMES[k] || k}
                </div>
                <div className="text-xs text-muted">
                  {p}/{qs.length}
                </div>
              </div>
            );
          })}
      </div>
      <h2 className="text-xl mb-4 font-serif">Question Results</h2>
      <div className="flex gap-4 mb-6">
        <select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-line rounded-lg text-xs focus:outline-none focus:border-accent"
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
          className="px-3 py-2 bg-surface border border-line rounded-lg text-xs focus:outline-none focus:border-accent"
        >
          <option value="All">All statuses</option>
          <option value="Passed">Passed</option>
          <option value="Failed">Failed</option>
        </select>
        <span className="text-xs text-muted self-center">
          Showing {filtered.length} of {questions.length}
        </span>
      </div>
      <div className="space-y-2">
        {filtered.map((q, i) => {
          const ok = q.pass ?? q.passed ?? false;
          return (
            <details key={q.id || i} className="panel-card">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-sm font-medium">
                  {q.id || i + 1}. {q.query || q.question || ""}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                >
                  {ok ? "Pass" : "Fail"}
                </span>
              </summary>
              <div className="mt-3 text-xs text-muted space-y-1">
                <div>Document: {q.doc}</div>
                {q.expected && (
                  <div>
                    Expected:{" "}
                    <code className="bg-bg px-1 rounded">{q.expected}</code>
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
    </div>
  );
}
