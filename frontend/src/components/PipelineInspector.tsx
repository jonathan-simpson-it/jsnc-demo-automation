"use client";
import { useState } from "react";
import type { TraceEntry } from "@/lib/types";
import { traceSummary, formatMs } from "@/lib/utils";

interface Props {
  trace: TraceEntry[];
  citations: string[];
  agentType: string;
  confidence: number;
}

const LLM_NODES = new Set(["classify", "answer", "verify", "wide_search"]);

export default function PipelineInspector({
  trace,
  citations,
  agentType,
  confidence,
}: Props) {
  const [open, setOpen] = useState(false);
  const summary = traceSummary(trace);
  const maxMs = Math.max(...trace.map((e) => e.ms), 1);
  const confidenceLabel =
    confidence >= 0.8
      ? "High confidence"
      : confidence >= 0.5
        ? "Moderate -- verify key facts"
        : "Low -- treat with caution";

  return (
    <div
      style={{
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          fontSize: "0.72rem",
          textAlign: "left",
          color: "var(--color-muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          transition: "color var(--transition-fast)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--color-ink)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--color-muted)")
        }
      >
        <span>How I got this answer</span>
        <span>{open ? "\u2212" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 1rem 1rem" }} className="space-y-3">
          {/* Confidence */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.78rem",
                marginBottom: "0.25rem",
              }}
            >
              <span style={{ color: "var(--color-muted)" }}>Confidence</span>
              <span style={{ fontWeight: 500 }}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div
              style={{
                height: "0.5rem",
                background: "var(--color-accent-soft)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "var(--color-accent)",
                  borderRadius: "999px",
                  width: `${confidence * 100}%`,
                  transition: "width 300ms ease",
                }}
              />
            </div>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--color-muted)",
                marginTop: "0.25rem",
              }}
            >
              {confidenceLabel}
            </p>
          </div>

          {/* Agent */}
          <div style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-ink)" }}>Agent:</strong>{" "}
            {agentType}
          </div>

          {/* Path */}
          <div style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-ink)" }}>Path:</strong>{" "}
            <code>{summary.path.join(" -> ")}</code>
          </div>

          {/* Time */}
          <div style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-ink)" }}>Time:</strong>{" "}
            {formatMs(summary.totalMs)} (
            {trace.filter((t) => LLM_NODES.has(t.node)).length} LLM calls)
          </div>

          {/* Trace Bars */}
          <div className="space-y-1">
            {trace.map((e) => {
              const pct = Math.max(3, Math.round((e.ms / maxMs) * 100));
              const color =
                e.ms < 100
                  ? "#22c55e"
                  : e.ms < 500
                    ? "#eab308"
                    : "#ef4444";
              return (
                <div
                  key={e.node}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.72rem",
                  }}
                >
                  <span
                    style={{
                      width: "6rem",
                      color: "var(--color-muted)",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {e.node}
                    {e.node === summary.bottleneck && trace.length > 1
                      ? " *"
                      : ""}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "0.5rem",
                      background: "var(--color-bg)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "999px",
                        width: `${pct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: "4rem",
                      textAlign: "right",
                      color: "var(--color-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {e.ms}ms
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rescue Path Warning */}
          {summary.path.some((n) => n === "verify" || n === "wide_search") && (
            <div
              style={{
                fontSize: "0.78rem",
                color: "#92400e",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 0.75rem",
              }}
            >
              Rescue path activated. The initial answer was incomplete and
              required re-examination.
            </div>
          )}

          {/* Sources Count */}
          <div style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
            Sources cited: {citations.length}
          </div>
        </div>
      )}
    </div>
  );
}
