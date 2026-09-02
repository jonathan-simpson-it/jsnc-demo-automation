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
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Configuration</span>
          <h2>System overview.</h2>
          <p>
            Current system status, active features, and registered agent types.
          </p>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          }}
        >
          {/* System Status */}
          <div className="panel-card">
            <h4 style={{ marginBottom: "0.75rem" }}>System Status</h4>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    health?.status === "healthy" ? "#22c55e" : "var(--color-muted)",
                }}
              />
              <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                {health?.status === "healthy"
                  ? "Healthy"
                  : health
                    ? "Degraded"
                    : "Checking..."}
              </span>
            </div>
          </div>

          {/* API Version */}
          <div className="panel-card">
            <h4 style={{ marginBottom: "0.75rem" }}>API Version</h4>
            <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
              {health?.version || "--"}
            </span>
          </div>

          {/* Features */}
          <div className="panel-card">
            <h4 style={{ marginBottom: "0.75rem" }}>Features</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="space-y-1">
              {FEATURES.map((f) => (
                <li
                  key={f}
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--color-accent)", flexShrink: 0 }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Agent Types */}
          <div className="panel-card">
            <h4 style={{ marginBottom: "0.75rem" }}>Agent Types</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="space-y-1">
              {AGENTS.map((a) => (
                <li
                  key={a.type}
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--color-accent)", flexShrink: 0 }}
                  />
                  {a.label}{" "}
                  <code style={{ fontSize: "0.72rem" }}>{a.type}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
