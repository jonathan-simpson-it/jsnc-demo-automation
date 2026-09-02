"use client";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";

const FEATURES = [
  "BM25 Hybrid Search",
  "Persistent Cache",
  "Streaming Responses",
  "Audit Trail",
  "RBAC",
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
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => {});
  }, []);

  return (
    <div className="container py-12">
      <h1 className="text-3xl mb-8 font-serif">Configuration</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="panel-card">
          <h3 className="text-sm font-medium mb-2">System Status</h3>
          <p className="text-xs text-muted">
            {health?.status === "healthy"
              ? "Healthy"
              : health
                ? "Degraded"
                : "Checking..."}
          </p>
        </div>
        <div className="panel-card">
          <h3 className="text-sm font-medium mb-2">API Version</h3>
          <p className="text-xs text-muted">{health?.version || "--"}</p>
        </div>
        <div className="panel-card">
          <h3 className="text-sm font-medium mb-2">Features</h3>
          <ul className="text-xs text-muted space-y-1">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="panel-card">
          <h3 className="text-sm font-medium mb-2">Agent Types</h3>
          <ul className="text-xs text-muted space-y-1">
            {AGENTS.map((a) => (
              <li key={a.type}>
                {a.label} ({a.type})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
