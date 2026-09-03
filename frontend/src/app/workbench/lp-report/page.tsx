"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import { WorkbenchPage, DocumentPicker, ResultPanel } from "@/components/Workbench";
import { executeAgent } from "@/lib/api";
import type { AgentResponse, DocumentInfo } from "@/lib/types";

const labelCell: CSSProperties = {
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
};

function humanLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function formatNumberish(value: number | string): string {
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (Number.isFinite(num) && String(value).trim() !== "") {
    return num.toLocaleString("en-US");
  }
  return String(value);
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter((item) => item.trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") {
    return [value];
  }
  return [];
}

function friendlyError(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw);
  if (/500|Stream/.test(text)) {
    return "The backend could not complete the report right now. Please try again in a moment.";
  }
  if (/401|403/.test(text)) {
    return "You are not authorized to run this agent. Please sign in again.";
  }
  if (/fetch|network|Connection/i.test(text)) {
    return "The backend is offline. Check that the API server is running, then try again.";
  }
  return "Something went wrong while generating the LP report. Please try again.";
}

function parseReport(resultText: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(resultText);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const hasKnownKey = [
    "quarter",
    "portfolio_highlights",
    "financial_summary",
    "risk_factors",
  ].some((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "");
  return hasKnownKey ? obj : null;
}

export default function LpReportWorkbenchPage() {
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResponse | null>(null);

  async function generate() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await executeAgent({
        query: "Generate a quarterly LP report from this document.",
        agent_type: "lp_report",
      });
      setResult(res);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  const report = result ? parseReport(result.result) : null;

  return (
    <WorkbenchPage
      eyebrow="Workbenches"
      title="LP report generator."
      description="Turn financial-model documents into investor-ready quarterly LP narratives."
    >
      <DocumentPicker onSelect={setDoc} />

      <button
        type="button"
        className="button button--solid"
        disabled={!doc || loading}
        onClick={generate}
      >
        {loading ? "Generating…" : "Generate LP report"}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            margin: "1rem 0 0 0",
            fontSize: "0.85rem",
            color: "var(--color-error)",
          }}
        >
          {error}
        </p>
      )}

      {loading && (
        <p style={{ margin: "1rem 0 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>
          Reading the document and drafting the quarterly narrative…
        </p>
      )}

      {report && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            display: "grid",
            gap: "1rem",
          }}
        >
          {typeof report.quarter === "string" && report.quarter.trim() !== "" && (
            <h2
              style={{
                margin: 0,                fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
                fontWeight: 400,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              {report.quarter}
            </h2>
          )}

          {(() => {
            const items = asList(report.portfolio_highlights);
            if (items.length === 0) return null;
            return (
              <div>
                <div style={{ ...labelCell, marginBottom: "0.4rem" }}>
                  Portfolio highlights
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.1rem",
                    display: "grid",
                    gap: "0.35rem",
                    color: "var(--color-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {(() => {
            const items = asList(report.risk_factors);
            if (items.length === 0) return null;
            return (
              <div>
                <div style={{ ...labelCell, marginBottom: "0.4rem" }}>
                  Risk factors
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.1rem",
                    display: "grid",
                    gap: "0.35rem",
                    color: "var(--color-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {report.financial_summary != null &&
            typeof report.financial_summary === "object" &&
            !Array.isArray(report.financial_summary) && (
              <div>
                <div style={{ ...labelCell, marginBottom: "0.4rem" }}>
                  Financial summary
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(9rem, 12rem) 1fr",
                    columnGap: "1.25rem",
                    rowGap: "0",
                    borderTop: "1px solid var(--color-line)",
                  }}
                >
                  {Object.entries(
                    report.financial_summary as Record<string, unknown>,
                  ).map(([key, value]) => {
                    if (value === undefined || value === null || value === "") {
                      return null;
                    }
                    const display =
                      typeof value === "number" || typeof value === "string"
                        ? formatNumberish(value)
                        : String(value);
                    return (
                      <div key={key} style={{ display: "contents" }}>
                        <div
                          style={{
                            ...labelCell,
                            padding: "0.65rem 0",
                            borderBottom: "1px solid var(--color-line)",
                          }}
                        >
                          {humanLabel(key)}
                        </div>
                        <div
                          style={{
                            padding: "0.65rem 0",
                            borderBottom: "1px solid var(--color-line)",
                            color: "var(--color-ink)",
                            fontSize: "0.9rem",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {display}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <ResultPanel
            resultText={result.result}
            citations={result.citations}
            confidence={result.confidence_score}
            agentType={result.agent_type}
          />
        </div>
      )}
    </WorkbenchPage>
  );
}
