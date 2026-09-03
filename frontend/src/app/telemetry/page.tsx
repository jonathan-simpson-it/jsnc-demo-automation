"use client";
import { useEffect, useState, useCallback } from "react";
import {
  fetchTelemetryRuns,
  fetchTelemetryCost,
  resetTelemetry,
} from "@/lib/api";
import type { TelemetryRun, CostSummary } from "@/lib/types";
import { traceSummary, formatMs } from "@/lib/utils";

function relativeTime(tsSec: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - tsSec));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function TelemetryPage() {
  const [runs, setRuns] = useState<TelemetryRun[]>([]);
  const [cost, setCost] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setLoading(true);
    Promise.all([fetchTelemetryRuns(), fetchTelemetryCost()])
      .then(([r, c]) => {
        setRuns(r.runs || []);
        setCost(c);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReset = async () => {
    if (!window.confirm("Reset cost totals and run history?")) return;
    setResetting(true);
    try {
      await resetTelemetry();
      load();
    } catch {
      setFailed(true);
    } finally {
      setResetting(false);
    }
  };

  if (failed)
    return (
      <section className="section">
        <div className="container" style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: "1.25rem" }}>
            Couldn't load telemetry data. Is the backend running?
          </p>
          <button type="button" onClick={load} className="button button--solid">
            Retry
          </button>
        </div>
      </section>
    );

  if (loading)
    return (
      <section className="section">
        <div
          className="container"
          style={{ textAlign: "center", color: "var(--color-muted)" }}
        >
          Loading telemetry...
        </div>
      </section>
    );

  const nodeEntries = cost ? Object.entries(cost.by_node) : [];
  const totalTokens =
    (cost?.total_input_tokens || 0) + (cost?.total_output_tokens || 0);
  const avgCost =
    cost && cost.calls > 0
      ? `$${(cost.total_cost / cost.calls).toFixed(4)}`
      : "—";
  const sortedRuns = [...runs].sort((a, b) => b.ts - a.ts);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "56rem" }}>
        <div className="section-intro">
          <span className="section-eyebrow">Developer</span>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              marginBottom: "1rem",
            }}
          >
            Pipeline &amp; cost dashboard.
          </h1>
          <p>
            Live traces and token spend for every agent run in this session.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={load}
            className="button button--ghost button--small"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="button button--ghost button--small"
            style={{ color: "var(--color-error)" }}
          >
            {resetting ? "Resetting..." : "Reset"}
          </button>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
            marginBottom: "2.5rem",
          }}
        >
          <div
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
              style={{
                fontSize: "clamp(1.6rem, 3.2vw, 2rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--color-ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cost ? `$${cost.total_cost.toFixed(4)}` : "—"}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              Total cost
            </div>
          </div>
          <div
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
              style={{
                fontSize: "clamp(1.6rem, 3.2vw, 2rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--color-ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cost ? cost.calls.toLocaleString("en-US") : "—"}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              Calls
            </div>
          </div>
          <div
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
              style={{
                fontSize: "clamp(1.6rem, 3.2vw, 2rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--color-ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cost ? totalTokens.toLocaleString("en-US") : "—"}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              Tokens
            </div>
          </div>
          <div
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
              style={{
                fontSize: "clamp(1.6rem, 3.2vw, 2rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--color-ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {avgCost}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              Avg cost/call
            </div>
          </div>
        </div>

        <div className="section-intro">
          <span className="section-eyebrow">By Node</span>
          <h2>Cost per node.</h2>
        </div>
        <div className="panel-card" style={{ marginBottom: "2.5rem" }}>
          {nodeEntries.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: 0 }}>
              No node usage recorded yet.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {nodeEntries.map(([node, stats]) => (
                  <tr
                    key={node}
                    style={{
                      borderTop: "1px solid var(--color-line)",
                      fontSize: "0.88rem",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.5rem 0.75rem 0.5rem 0",
                        color: "var(--color-ink)",
                        fontWeight: 500,
                      }}
                    >
                      {node}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.75rem",
                        textAlign: "right",
                        color: "var(--color-muted)",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {stats.calls}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.75rem",
                        textAlign: "right",
                        color: "var(--color-muted)",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {stats.tokens.toLocaleString("en-US")}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0 0.5rem 0.75rem",
                        textAlign: "right",
                        color: "var(--color-ink)",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ${stats.cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section-intro">
          <span className="section-eyebrow">Runs</span>
          <h2>Recent pipeline runs.</h2>
        </div>
        {sortedRuns.length === 0 ? (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            No pipeline runs yet — send a message in the chat to see traces here.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedRuns.map((run) => {
              const summary = traceSummary(run.trace);
              return (
                <details key={run.ts} className="panel-card">
                  <summary
                    style={{
                      display: "block",
                      cursor: "pointer",
                      listStyle: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "1rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.92rem",
                          fontWeight: 500,
                          color: "var(--color-ink)",
                        }}
                      >
                        {run.query}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "0.75rem",
                          color: "var(--color-muted)",
                        }}
                      >
                        {relativeTime(run.ts)}
                      </span>
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-2"
                      style={{ marginTop: "0.5rem" }}
                    >
                      <span className="chip">{run.agent_type}</span>
                      <span className="chip">{run.routing_method || "auto"}</span>
                      <span className="chip">
                        conf {Math.round(run.confidence * 100)}%
                      </span>
                      <span className="chip">{formatMs(run.total_ms)}</span>
                      <span className="chip">
                        ${run.cost.toFixed(4)}
                      </span>
                      {run.error && (
                        <span className="chip" style={{ color: "var(--color-error)" }}>
                          error
                        </span>
                      )}
                    </div>
                  </summary>
                  {run.trace.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div
                        style={{
                          background: "var(--color-bg)",
                          borderRadius: "var(--radius-lg)",
                          padding: "0.75rem",
                        }}
                      >
                        {run.trace.map((entry) => (
                          <div
                            key={entry.node}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "1rem",
                              fontSize: "0.82rem",
                              padding: "0.2rem 0",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <span style={{ color: "var(--color-ink)" }}>
                              {entry.node}
                              {summary.bottleneck === entry.node ? (
                                <span
                                  style={{ color: "var(--color-accent)" }}
                                  aria-label="bottleneck"
                                >
                                  {" "}
                                  *
                                </span>
                              ) : null}
                            </span>
                            <span style={{ color: "var(--color-muted)" }}>
                              {formatMs(entry.ms)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
