import type { TraceEntry } from "@/lib/types";
import { traceSummary, formatMs } from "@/lib/utils";
import CitationList from "@/components/CitationList";
import StructuredOutput from "@/components/StructuredOutput";

interface Props {
  role: "user" | "assistant";
  content: string;
  agentType?: string;
  citations?: string[];
  trace?: TraceEntry[];
  /** Workspace label whose documents grounded this message, e.g. "JS&C › Personal". */
  scopeLabel?: string;
}

const scopeCaptionStyle = {
  fontSize: "0.68rem",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--color-muted)",
  opacity: 0.85,
  whiteSpace: "nowrap" as const,
};

export default function ChatMessage({
  role,
  content,
  agentType,
  citations = [],
  trace = [],
  scopeLabel,
}: Props) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            display: "grid",
            justifyItems: "end",
            gap: "0.28rem",
            maxWidth: "min(78%, 60rem)",
          }}
        >
          <div
            style={{
              padding: "0.65rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-accent)",
              color: "white",
              fontSize: "0.92rem",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {content}
          </div>
          {scopeLabel && <span style={scopeCaptionStyle}>{scopeLabel}</span>}
        </div>
      </div>
    );
  }

  const summary = traceSummary(trace);
  const agentName = agentType?.replace(/_/g, " ");

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-md)",
        padding: "0.9rem 1.1rem",
        maxWidth: "100%",
        fontSize: "0.92rem",
        lineHeight: 1.65,
        color: "var(--color-ink)",
      }}
    >
      {(agentName || scopeLabel) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.2rem 0.6rem",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.4rem",
          }}
        >
          {agentName && (
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 600,
                color: "var(--color-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {agentName}
            </span>
          )}
          {scopeLabel && (
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
                border: "1px solid var(--color-line)",
                borderRadius: "var(--radius-xs)",
                padding: "0.08rem 0.5rem",
                background: "var(--color-bg)",
                whiteSpace: "nowrap",
              }}
            >
              {scopeLabel}
            </span>
          )}
        </div>
      )}
      <StructuredOutput text={content} />

      {citations.length > 0 && (
        <div
          style={{
            marginTop: "0.7rem",
            paddingTop: "0.7rem",
            borderTop: "1px solid var(--color-line)",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--color-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Sources ({citations.length})
          </span>
          <div style={{ marginTop: "0.35rem" }}>
            <CitationList citations={citations} />
          </div>
        </div>
      )}

      {trace.length > 0 && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.7rem",
            color: "var(--color-muted)",
            opacity: 0.75,
          }}
        >
          {summary.path.join(" -> ")} ({formatMs(summary.totalMs)})
        </div>
      )}
    </div>
  );
}
