import type { TraceEntry } from "./types";

export function parseCitation(citation: string) {
  const result = { filename: citation, page: 1, line: 1 };
  const parts = citation.split(",").map((p) => p.trim());
  if (parts.length > 0) result.filename = parts[0];
  for (const part of parts.slice(1)) {
    const nums = part.match(/\d+/g);
    if (part.toLowerCase().includes("page") && nums)
      result.page = parseInt(nums[0], 10);
    else if (part.toLowerCase().includes("line") && nums)
      result.line = parseInt(nums[0], 10);
  }
  return result;
}

export function traceSummary(trace: TraceEntry[]) {
  const nodes = trace.map((e) => e.node);
  const totalMs = trace.reduce((s, e) => s + e.ms, 0);
  const bottleneck = trace.length
    ? trace.reduce((m, e) => (e.ms > m.ms ? e : m), trace[0]).node
    : null;
  return { path: nodes, totalMs, bottleneck };
}

export function formatMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Rounds to at most 1 decimal and drops a trailing ".0" (e.g. 94.4444 -> "94.4"). */
export function formatPercent(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Locale-aware integer with thousands separators; tolerates strings/floats. */
export function formatCount(value: number | string | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "--";
}
