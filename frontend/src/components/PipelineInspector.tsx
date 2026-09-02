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
    <div className="border border-line rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 text-xs text-left text-muted hover:text-ink transition-colors flex justify-between"
      >
        <span>How I got this answer</span>
        <span>{open ? "^" : "v"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Confidence</span>
              <span className="text-ink font-medium">
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div className="h-2 bg-accent-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1">{confidenceLabel}</p>
          </div>
          <div className="text-xs text-muted">
            <span className="font-medium text-ink">Agent:</span> {agentType}
          </div>
          <div className="text-xs text-muted">
            <span className="font-medium text-ink">Path:</span>{" "}
            <code className="bg-bg px-1 rounded">
              {summary.path.join(" -> ")}
            </code>
          </div>
          <div className="text-xs text-muted">
            <span className="font-medium text-ink">Time:</span>{" "}
            {formatMs(summary.totalMs)} (
            {trace.filter((t) => LLM_NODES.has(t.node)).length} LLM calls)
          </div>
          <div className="space-y-1">
            {trace.map((e) => {
              const pct = Math.max(3, Math.round((e.ms / maxMs) * 100));
              const color =
                e.ms < 100 ? "#22c55e" : e.ms < 500 ? "#eab308" : "#ef4444";
              return (
                <div key={e.node} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-muted font-medium">
                    {e.node}
                    {e.node === summary.bottleneck && trace.length > 1
                      ? " *"
                      : ""}
                  </span>
                  <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-16 text-right text-muted">{e.ms}ms</span>
                </div>
              );
            })}
          </div>
          {summary.path.some((n) => n === "verify" || n === "wide_search") && (
            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
              Rescue path activated. The initial answer was incomplete and
              required re-examination.
            </div>
          )}
          <div className="text-xs text-muted">
            Sources cited: {citations.length}
          </div>
        </div>
      )}
    </div>
  );
}
