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
  suggestions?: string[];
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

const SUGGESTIONS: Record<string, string[]> = {
  due_diligence: [
    "Summarize the key risks in the Enosis pitch deck",
    "What is the pre-money valuation?",
    "Who are the lead investors?",
  ],
  term_sheet: [
    "Extract the liquidation preference terms",
    "What anti-dilution provisions are included?",
    "List the protective provisions",
  ],
  lp_report: [
    "Generate a Q3 2026 LP report",
    "What are the portfolio highlights?",
    "Summarize the risk factors",
  ],
  compliance: [
    "Check regulatory compliance of the term sheet",
    "What jurisdictions are covered?",
    "Are there any compliance issues?",
  ],
  cross_doc: [
    "Compare liquidation preferences across all decks",
    "What are the key differences between proposals?",
    "Synthesize the board seat allocations",
  ],
  "": [
    "What are the key risks in the Enosis deal?",
    "Extract term sheet data from the Dr. Yip proposal",
    "Compare the three pitch decks",
  ],
};

function ChatInner() {
  const searchParams = useSearchParams();
  const initialAgent = searchParams.get("agent") || "";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: initialAgent
        ? `Hello! I'm your ${AGENT_NAMES[initialAgent] || initialAgent}. Ask me anything about the documents in the knowledge base.`
        : "Hello! I'm your PE AI assistant. Ask me about due diligence, term sheets, compliance, or any documents in the knowledge base.",
      suggestions: SUGGESTIONS[initialAgent] || SUGGESTIONS[""],
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

  // Update suggestions when agent changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === "welcome") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "welcome"
            ? { ...m, suggestions: SUGGESTIONS[agentType] || SUGGESTIONS[""] }
            : m,
        ),
      );
    }
  }, [agentType, messages]);

  async function handleSend(query?: string) {
    const q = (query || input).trim();
    if (!q || isStreaming) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: q },
    ]);
    setIsStreaming(true);
    setStreamingNode("");

    try {
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
      let final: AgentResponse | null = null;
      for await (const ev of streamAgent({
        query: q,
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
            content: "I wasn't able to generate a response. Try rephrasing your question or selecting a different agent.",
          },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      let friendly = "Something went wrong. Please try again.";
      if (msg.includes("500") || msg.includes("Stream")) {
        friendly = "The backend couldn't process this request. Make sure DEEPSEEK_API_KEY is configured in your .env file.";
      } else if (msg.includes("401") || msg.includes("403")) {
        friendly = "Authentication failed. Check your API key configuration.";
      } else if (msg.includes("fetch") || msg.includes("network")) {
        friendly = "Can't reach the backend. Make sure the API server is running on port 8000.";
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: friendly,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingNode("");
    }
  }

  const nodeLabels: Record<string, string> = {
    classify: "Classifying query",
    search: "Searching documents",
    narrow: "Selecting sources",
    answer: "Generating answer",
    verify: "Verifying answer",
    wide_search: "Deep search",
  };

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
          <span style={{ color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="streaming-dots" style={{ padding: 0 }}>
              <span /><span /><span />
            </span>
            {nodeLabels[streamingNode] || streamingNode}
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
                suggestions={m.suggestions}
                onSuggestionClick={(q) => handleSend(q)}
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

          {/* Streaming indicator */}
          {isStreaming && !streamingNode && (
            <div style={{ display: "flex" }}>
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "1rem 1rem 1rem 0.25rem",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                }}
              >
                <div className="streaming-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

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
            placeholder={
              agentType
                ? `Ask the ${AGENT_NAMES[agentType] || agentType}...`
                : "Ask about PE deals, term sheets, compliance..."
            }
            disabled={isStreaming}
            className="input flex-1"
            style={{ fontSize: "0.88rem" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="button button--solid"
            style={{ opacity: isStreaming || !input.trim() ? 0.4 : 1, minWidth: "5rem" }}
          >
            {isStreaming ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span className="streaming-dots" style={{ padding: 0 }}>
                  <span style={{ background: "white" }} /><span style={{ background: "white" }} /><span style={{ background: "white" }} />
                </span>
              </span>
            ) : (
              "Send"
            )}
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
