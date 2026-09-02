"use client";
import { useState, useRef, useEffect } from "react";
import { streamAgent } from "@/lib/api";
import type { AgentResponse, TraceEntry } from "@/lib/types";
import ChatMessage from "@/components/ChatMessage";
import PipelineInspector from "@/components/PipelineInspector";
import StatusBadge from "@/components/StatusBadge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: string;
  citations?: string[];
  trace?: TraceEntry[];
  confidence?: number;
}

const AGENTS = [
  { value: "", label: "Auto-route" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "term_sheet", label: "Term Sheet" },
  { value: "lp_report", label: "LP Report" },
  { value: "compliance", label: "Compliance" },
  { value: "cross_doc", label: "Cross-Document" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your PE AI assistant. Ask me about due diligence, term sheets, compliance, or any documents in the knowledge base.",
    },
  ]);
  const [input, setInput] = useState("");
  const [agentType, setAgentType] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingNode, setStreamingNode] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const query = input.trim();
    if (!query || isStreaming) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: query },
    ]);
    setIsStreaming(true);
    setStreamingNode("");

    try {
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
      let final: AgentResponse | null = null;
      for await (const ev of streamAgent({
        query,
        agent_type: agentType || null,
        conversation_history: history,
      })) {
        if (ev.done && ev.response) final = ev.response;
        else if (ev.node) setStreamingNode(ev.node);
      }
      if (final) {
        let content = final.result;
        try {
          content = JSON.stringify(JSON.parse(final.result), null, 2);
        } catch {
          /* keep */
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content,
            agentType: final!.agent_type,
            citations: final!.citations,
            trace: (final!.metadata?.trace as TraceEntry[]) || [],
            confidence: final!.confidence_score,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: "No response generated. Please try again.",
          },
        ]);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingNode("");
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-4 px-4 py-2 bg-surface border-b border-line text-xs text-muted">
        <StatusBadge />
        <span>Agent: {agentType || "Auto-route"}</span>
        {streamingNode && (
          <span className="text-accent">{streamingNode}...</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((m) => (
          <div key={m.id}>
            <ChatMessage
              role={m.role}
              content={m.content}
              agentType={m.agentType}
              citations={m.citations}
              trace={m.trace}
            />
            {m.role === "assistant" && m.trace && m.trace.length > 0 && (
              <div className="max-w-[85%] mt-2">
                <PipelineInspector
                  trace={m.trace}
                  citations={m.citations || []}
                  agentType={m.agentType || "unknown"}
                  confidence={m.confidence || 0.8}
                />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line bg-surface px-4 py-3">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="px-3 py-2 bg-bg border border-line rounded-lg text-xs text-ink focus:outline-none focus:border-accent"
          >
            {AGENTS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about PE deals, term sheets, compliance..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 bg-bg border border-line rounded-lg text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="button button--solid disabled:opacity-40"
          >
            {isStreaming ? "Processing..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
