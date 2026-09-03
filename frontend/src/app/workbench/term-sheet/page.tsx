"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import { WorkbenchPage, DocumentPicker, ResultPanel } from "@/components/Workbench";
import { executeAgent } from "@/lib/api";
import type { AgentResponse, DocumentInfo } from "@/lib/types";

const FIELD_ORDER = [
  "company_name",
  "round_type",
  "pre_money_valuation",
  "investment_amount",
  "liquidation_preference",
  "anti_dilution",
  "board_seats",
  "price_per_share",
  "esop_pool",
  "governing_law",
  "lead_investor",
  "exclusivity",
] as const;

const CURRENCY_FIELDS = new Set(["pre_money_valuation", "investment_amount"]);

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const labelCell: CSSProperties = {
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
};

function humanLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function formatValue(key: string, value: unknown): string {
  if (CURRENCY_FIELDS.has(key) && typeof value === "number" && Number.isFinite(value)) {
    return currency.format(value);
  }
  return String(value);
}

function friendlyError(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw);
  if (/500|Stream/.test(text)) {
    return "The backend could not complete extraction right now. Please try again in a moment.";
  }
  if (/401|403/.test(text)) {
    return "You are not authorized to run this agent. Please sign in again.";
  }
  if (/fetch|network|Connection/i.test(text)) {
    return "The backend is offline. Check that the API server is running, then try again.";
  }
  return "Something went wrong while extracting the term sheet. Please try again.";
}

function parseGrid(resultText: string): Record<string, unknown> | null {
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
    "company_name",
    "liquidation_preference",
    "anti_dilution",
    "round_type",
  ].some((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "");
  return hasKnownKey ? obj : null;
}

export default function TermSheetWorkbenchPage() {
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResponse | null>(null);

  async function extract() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await executeAgent({
        query: "Extract the full term sheet data from this document.",
        agent_type: "term_sheet",
      });
      setResult(res);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  const grid = result ? parseGrid(result.result) : null;

  return (
    <WorkbenchPage
      eyebrow="Workbenches"
      title="Term sheet extractor."
      description="Extract structured term-sheet data from an investment memo or draft term sheet, then compare terms across deals."
    >
      <DocumentPicker onSelect={setDoc} />

      <button
        type="button"
        className="button button--solid"
        disabled={!doc || loading}
        onClick={extract}
      >
        {loading ? "Extracting…" : "Extract term sheet"}
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
          Reading the document and mapping terms…
        </p>
      )}

      {grid && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
          }}
        >
          <h2
            style={{
              margin: "0 0 0.9rem 0",
              fontFamily: "var(--font-display)",
              fontSize: "0.95rem",
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            Extracted terms
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(9rem, 11rem) 1fr",
              columnGap: "1.25rem",
              rowGap: "0",
              borderTop: "1px solid var(--color-line)",
            }}
          >
            {FIELD_ORDER.map((key) => {
              const raw = grid[key];
              if (raw === undefined || raw === null || raw === "") return null;
              const display =
                CURRENCY_FIELDS.has(key) &&
                typeof raw === "string" &&
                raw.trim() !== "" &&
                Number.isFinite(Number(raw))
                  ? currency.format(Number(raw))
                  : formatValue(key, raw);
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
