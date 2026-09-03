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

function friendlyError(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw);
  if (/500|Stream/.test(text)) {
    return "The backend could not complete the audit right now. Please try again in a moment.";
  }
  if (/401|403/.test(text)) {
    return "You are not authorized to run this agent. Please sign in again.";
  }
  if (/fetch|network|Connection/i.test(text)) {
    return "The backend is offline. Check that the API server is running, then try again.";
  }
  return "Something went wrong while running the compliance audit. Please try again.";
}

interface AuditIssue {
  text: string;
  severity?: string;
}

function parseAudit(resultText: string): Record<string, unknown> | null {
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
    "compliant",
    "issues",
    "jurisdiction",
    "regulations_checked",
  ].some((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "");
  return hasKnownKey ? obj : null;
}

function severityOf(value: string): string | null {
  if (/high/i.test(value)) return "high";
  if (/medium|moderate/i.test(value)) return "medium";
  if (/low/i.test(value)) return "low";
  return null;
}

function asIssue(value: unknown): AuditIssue | null {
  if (typeof value === "string") return { text: value };
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text !== "string") return null;
    const severity =
      typeof obj.severity === "string"
        ? obj.severity
        : typeof obj.level === "string"
          ? obj.level
          : "";
    const found = severityOf(severity) ?? severityOf(JSON.stringify(obj));
    return { text: obj.text, severity: found ?? undefined };
  }
  return null;
}

export default function ComplianceAuditWorkbenchPage() {
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResponse | null>(null);

  async function audit() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await executeAgent({
        query:
          "Audit this document for regulatory compliance issues and required corrective actions.",
        agent_type: "compliance",
      });
      setResult(res);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  const auditData = result ? parseAudit(result.result) : null;
  const compliant =
    auditData && typeof auditData.compliant === "boolean" ? auditData.compliant : null;
  const verdict =
    compliant === null ? null : compliant ? "PASS" : "ISSUES FOUND";
  const issues = auditData && Array.isArray(auditData.issues) ? auditData.issues : null;
  const regulations =
    auditData && Array.isArray(auditData.regulations_checked)
      ? auditData.regulations_checked
      : null;
  const jurisdiction =
    auditData && typeof auditData.jurisdiction === "string"
      ? auditData.jurisdiction
      : null;

  return (
    <WorkbenchPage
      eyebrow="Compliance & Risk"
      title="Compliance auditor."
      description="Audit documents against regulatory expectations — SFC, HKMA and AMLO-aware checks grounded in the knowledge base."
    >
      <DocumentPicker onSelect={setDoc} />

      <button
        type="button"
        className="button button--solid"
        disabled={!doc || loading}
        onClick={audit}
      >
        {loading ? "Auditing…" : "Run compliance audit"}
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
          Checking the document against SFC, HKMA and AMLO expectations…
        </p>
      )}

      {auditData && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "0.9rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "0.95rem",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
            >
              Audit result
            </h2>
            {jurisdiction && (
              <span
                style={{
                  ...labelCell,
                  fontSize: "0.7rem",
                  background: "var(--color-accent-soft)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "999px",
                  padding: "0.2rem 0.6rem",
                }}
              >
                {jurisdiction}
              </span>
            )}
          </div>

          {verdict && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.1rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-display)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "999px",
                  border: compliant
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-error)",
                  background: compliant
                    ? "var(--color-accent-soft)"
                    : "var(--color-surface)",
                  color: compliant
                    ? "var(--color-accent)"
                    : "var(--color-error)",
                }}
              >
                {verdict}
              </span>
              {jurisdiction && (
                <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  Jurisdiction: {jurisdiction}
                </span>
              )}
            </div>
          )}

          <p
            style={{
              margin: "0 0 1.1rem 0",
              fontSize: "0.78rem",
              color: "var(--color-muted)",
            }}
          >
            This audit reflects the documents available in the current workspace.
          </p>

          {issues && issues.length > 0 && (
            <div style={{ marginBottom: "1.1rem" }}>
              <h3
                style={{
                  ...labelCell,
                  margin: "0 0 0.6rem 0",
                  fontSize: "0.72rem",
                }}
              >
                Issues
              </h3>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: "1.35rem",
                  display: "grid",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--color-ink)",
                }}
              >
                {issues.map((raw, i) => {
                  const issue = asIssue(raw);
                  if (!issue) return null;
                  return (
                    <li key={i}>
                      <span style={{ overflowWrap: "anywhere" }}>{issue.text}</span>
                      {issue.severity && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            display: "inline-block",
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            padding: "0.12rem 0.45rem",
                            borderRadius: "999px",
                            border: "1px solid var(--color-line)",
                            color: "var(--color-muted)",
                            verticalAlign: "middle",
                          }}
                        >
                          {issue.severity}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {regulations && regulations.length > 0 && (
            <div>
              <h3
                style={{
                  ...labelCell,
                  margin: "0 0 0.6rem 0",
                  fontSize: "0.72rem",
                }}
              >
                Regulations checked
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {regulations.map((reg, i) => (
                  <span key={i} className="chip">
                    {String(reg)}
                  </span>
                ))}
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
