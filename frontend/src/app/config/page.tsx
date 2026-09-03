"use client";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";

interface Feature {
  name: string;
  description: string;
}
const FEATURES: Feature[] = [
  { name: "BM25 Hybrid Search", description: "Vector similarity blended with keyword BM25 retrieval" },
  { name: "Persistent Cache", description: "SQLite-backed LLM response cache with TTL expiry" },
  { name: "Streaming Responses", description: "Server-sent events with per-node pipeline status" },
  { name: "Audit Trail", description: "Tamper-evident, hash-chained query records" },
  { name: "RBAC", description: "Roles and per-document grants for read access" },
];

const AGENTS = [
  { label: "Due Diligence", type: "due_diligence" },
  { label: "Term Sheet", type: "term_sheet" },
  { label: "LP Report", type: "lp_report" },
  { label: "Compliance", type: "compliance" },
  { label: "Cross-Document", type: "cross_doc" },
];

export default function ConfigPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setFailed(false);
    const started = performance.now();
    fetchHealth()
      .then((h) => {
        setHealth(h);
        setLatency(Math.round(performance.now() - started));
      })
      .catch(() => setFailed(true));
  }, [tick]);

  if (failed)
    return (
      <section className="min-h-screen bg-neutral-50/50 p-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center">
          <p className="mb-5 text-sm text-neutral-500">
            Can't reach the backend for system status. Is the API server running?
          </p>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            Retry
          </button>
        </div>
      </section>
    );

  const operational = health?.status === "healthy";

  return (
    <section className="min-h-screen bg-neutral-50/50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Configuration
            </span>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-neutral-900">
              System overview.
            </h1>
            <p className="mb-0 mt-1 text-sm text-neutral-500">
              Current system status, active features, and registered agent types.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
          >
            Refresh
          </button>
        </div>

        {/* KPI bar */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* System status */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              System Status
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  operational ? "bg-emerald-600" : "bg-red-500"
                }`}
                aria-hidden="true"
              />
              <span className="text-lg font-semibold text-neutral-900">
                {operational ? "Operational" : health ? "Degraded" : "Checking…"}
              </span>
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              {latency !== null ? `${latency}ms avg` : "measuring latency…"}
            </div>
          </div>

          {/* API version */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              API Version
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold text-neutral-900">
                {health?.version || "n/a"}
              </span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-700 ring-1 ring-inset ring-neutral-200/80">
                Latest
              </span>
            </div>
            <div className="mt-1 text-xs text-neutral-400">deployment channel</div>
          </div>

          {/* Environment */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Workspace Environment
            </div>
            <div className="mt-2 text-lg font-semibold text-neutral-900">
              Production / Live
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              server key{" "}
              {health?.server_key_configured ? "configured" : "not set (BYOK)"}
            </div>
          </div>

          {/* Agents */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Active Agents
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold text-neutral-900">
                {AGENTS.length}/{AGENTS.length}
              </span>
              <span className="rounded-md border border-neutral-200/80 bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-700">
                Registered
              </span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">Routing ready</div>
          </div>
        </div>

        {/* Detailed grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Features */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-1 text-base font-bold tracking-tight text-neutral-900">
              Active Architecture Features
            </h2>
            <p className="mb-5 text-sm text-neutral-500">
              Capabilities enabled in the retrieval and governance stack.
            </p>
            <ul className="m-0 list-none space-y-3 p-0">
              {FEATURES.map((f) => (
                <li
                  key={f.name}
                  className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900">
                      {f.name}
                    </div>
                    <div className="text-xs text-neutral-400">{f.description}</div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-600">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Active
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Agent registry */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-1 text-base font-bold tracking-tight text-neutral-900">
              Agent Registry
            </h2>
            <p className="mb-5 text-sm text-neutral-500">
              Registered agent types and their backend routing identifiers.
            </p>
            <ul className="m-0 list-none divide-y divide-neutral-100 p-0">
              {AGENTS.map((a) => (
                <li
                  key={a.type}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-800">
                      {a.label}
                    </div>
                    <code className="font-mono text-xs text-neutral-400">
                      {a.type}
                    </code>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-600">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Active
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
