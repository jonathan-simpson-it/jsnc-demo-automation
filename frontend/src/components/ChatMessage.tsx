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
      <div className="flex justify-end">
        <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-br-sm bg-accent text-white text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  const summary = traceSummary(trace);

  return (
    <div className="flex">
      <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-surface border border-line text-sm leading-relaxed">
        {agentType && (
          <div className="text-xs text-accent uppercase tracking-wider mb-2 font-medium">
            {agentType.replace(/_/g, " ")}
          </div>
        )}
        <div className="text-ink whitespace-pre-wrap">{content}</div>
        {citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-line">
            <span className="text-xs text-muted font-medium">Sources</span>
            <div className="mt-1 space-y-1">
              {citations.map((c, i) => {
                const p = parseCitation(c);
                return (
                  <div key={i} className="text-xs text-muted">
                    {p.filename}, page {p.page}, line {p.line}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {trace.length > 0 && (
          <div className="mt-2 text-xs text-muted opacity-60">
            Pipeline: {summary.path.join(" -> ")} ({formatMs(summary.totalMs)})
          </div>
        )}
      </div>
    </div>
  );
}
