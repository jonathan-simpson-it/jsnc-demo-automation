"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

const AGENT_NAMES: Record<string, string> = {
  due_diligence: "Due Diligence Agent",
  term_sheet: "Term Sheet Extractor",
  lp_report: "LP Report Generator",
  compliance: "Compliance Checker",
  cross_doc: "Cross-Document Comparison",
};

function ChatInner() {
  const searchParams = useSearchParams();
  const initialAgent = searchParams.get("agent") || "";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: initialAgent
        ? `Hello! I'm your ${AGENT_NAMES[initialAgent] || initialAgent}. How can I help?`
        : "Hello! I'm your PE AI assistant. Ask me about due diligence, term sheets, compliance, or any documents in the knowledge base.",
    },
  ]);
  const [input, setInput] = useState("");
  const [agentType, setAgentType] = useState(initialAgent);
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
      {/* Chat Header */}
      <div
        className="flex items-center gap-4 px-6"
        style={{
          height: "3rem",
          borderBottom: "1px solid var(--color-line)",
          background: "var(--color-surface)",
          fontSize: "0.78rem",
          color: "var(--color-muted)",
        }}
      >
        <StatusBadge />
        <span style={{ color: "var(--color-line)" }}>|</span>
        <span>
          Agent: <strong style={{ color: "var(--color-ink)" }}>{agentType || "Auto-route"}</strong>
        </span>
        {streamingNode && (
          <span style={{ color: "var(--color-accent)" }}>
            {streamingNode}...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "var(--color-bg)" }}>
        <div className="max-w-3xl mx-auto space-y-4">
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
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: "1px solid var(--color-line)",
          background: "var(--color-surface)",
          padding: "1rem 1.5rem",
        }}
      >
        <div className="flex gap-3 max-w-3xl mx-auto">
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="select"
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
            className="input flex-1"
            style={{ fontSize: "0.88rem" }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="button button--solid"
            style={{ opacity: isStreaming || !input.trim() ? 0.4 : 1 }}
          >
            {isStreaming ? "Processing..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 3.5rem)",
            color: "var(--color-muted)",
            fontSize: "0.88rem",
          }}
        >
          Loading...
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
