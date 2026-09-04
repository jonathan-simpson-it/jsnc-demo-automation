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

  const byDoc: Record<string, EvalQuestion[]> = {};
  for (const q of questions) {
    byDoc[q.doc] = byDoc[q.doc] || [];
    byDoc[q.doc].push(q);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <span className="section-eyebrow" style={{ marginBottom: "0.5rem" }}>
          Evaluation
        </span>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">
          Accuracy dashboard.
        </h1>
        <p className="mb-0 max-w-2xl text-sm text-neutral-500">
          Performance metrics across {meta.questions || questions.length} test
          questions, updated{" "}
          {meta.timestamp
            ? new Date(meta.timestamp).toLocaleDateString()
            : "unknown"}
          .
        </p>
      </div>

      {/* Overview metric cards (accuracy bar lives inside the first card) */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          value={`${formatPercent(meta.pct)}%`}
          label="Accuracy"
          bar={Number(meta.pct) || 0}
        />
        <StatCard
          value={formatCount(meta.questions || questions.length)}
          label="Questions"
        />
        <StatCard
          value={`${formatCount(meta.avg_latency_ms || meta.avg_ms_per_question || 0)}ms`}
          label="Avg Latency"
        />
        <StatCard
          value={meta.llm_node_calls ? formatCount(meta.llm_node_calls) : "n/a"}
          label="LLM Calls"
        />
      </div>

      {/* Per-document breakdown */}
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">
        Per-document breakdown.
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Object.entries(byDoc)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, qs]) => {
            const p = qs.filter((q) => q.pass ?? q.passed).length;
            const pct = qs.length ? Math.round((100 * p) / qs.length) : 0;
            const name = DOC_NAMES[k] || k;
            return (
              <div
                key={k}
                title={`${name}: ${p}/${qs.length} passed`}
                className="flex h-full flex-col justify-between rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-colors hover:border-neutral-300"
              >
                <div className="truncate text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {name}
                </div>
                <div className="my-1 text-2xl font-bold text-neutral-900">
                  {pct}%
                </div>
                <div className="text-xs font-mono font-medium text-neutral-600">
                  {p}/{qs.length}
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 100 ? "bg-emerald-600" : "bg-neutral-900"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Compact footer */}
      <footer className="mt-12 flex items-center justify-between border-t border-neutral-200/80 pt-6 text-xs text-neutral-500">
        <span>
          Accuracy dashboard · {meta.questions || questions.length} questions
        </span>
        <span>&copy; {new Date().getFullYear()} Jonathan Simpson &amp; Co.</span>
      </footer>
    </div>
  );
}