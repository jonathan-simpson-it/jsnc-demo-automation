import type { TraceEntry } from "@/lib/types";
import { parseCitation, traceSummary, formatMs } from "@/lib/utils";

interface Props {
  role: "user" | "assistant";
  content: string;
  agentType?: string;
  citations?: string[];
  trace?: TraceEntry[];
}

export default function ChatMessage({
  role,
  content,
  agentType,
  citations = [],
  trace = [],
}: Props) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "70%",
            padding: "0.75rem 1rem",
            borderRadius: "1rem 1rem 0.25rem 1rem",
            background: "var(--color-accent)",
            color: "white",
            fontSize: "0.88rem",
            lineHeight: 1.6,
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  const summary = traceSummary(trace);

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          maxWidth: "85%",
          padding: "1rem 1.25rem",
          borderRadius: "1rem 1rem 1rem 0.25rem",
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          fontSize: "0.88rem",
          lineHeight: 1.6,
        }}
      >
        {agentType && (
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--color-accent)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            {agentType.replace(/_/g, " ")}
          </div>
        )}
        <div style={{ color: "var(--color-ink)", whiteSpace: "pre-wrap" }}>
          {content}
        </div>
        {citations.length > 0 && (
          <div
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--color-line)",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--color-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Sources
            </span>
            <div className="space-y-1" style={{ marginTop: "0.25rem" }}>
              {citations.map((c, i) => {
                const p = parseCitation(c);
                return (
                  <div
                    key={i}
                    style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}
                  >
                    {p.filename}, page {p.page}, line {p.line}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {trace.length > 0 && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.72rem",
              color: "var(--color-muted)",
              opacity: 0.7,
            }}
          >
            Pipeline: {summary.path.join(" -> ")} ({formatMs(summary.totalMs)})
          </div>
        )}
      </div>
    </div>
  );
}
