"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAgents, fetchDocumentStats, fetchHealth } from "@/lib/api";
import type { AgentInfo, DocumentStats, HealthStatus } from "@/lib/types";

const TOOLS = [
  {
    href: "/chat",
    label: "AI Chat",
    desc: "Ask about PE deals, term sheets, compliance, or reports",
  },
  {
    href: "/documents",
    label: "Documents",
    desc: "Upload, manage, and browse the knowledge base",
  },
  {
    href: "/eval",
    label: "Eval Dashboard",
    desc: "View accuracy metrics across 180 test questions",
  },
  {
    href: "/config",
    label: "Configuration",
    desc: "System settings and feature flags",
  },
  {
    href: "/summary",
    label: "Email Summary",
    desc: "Weekly and monthly reports from the audit trail",
  },
];

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [docs, setDocs] = useState<DocumentStats | null>(null);

  useEffect(() => {
    fetchHealth()
      .catch(() => null)
      .then(setHealth);
    fetchAgents()
      .then((d) => setAgents(d.agents))
      .catch(() => {});
    fetchDocumentStats()
      .then(setDocs)
      .catch(() => {});
  }, []);

  return (
    <div className="container py-16">
      <div className="text-center mb-16">
        <span className="section-eyebrow">AI Engineering Platform</span>
        <h1 className="text-4xl sm:text-6xl mt-3 mb-4 font-serif">
          AI Engineering Platform
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto">
          Private Equity workflow automation with RAG and multi-agent systems.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-sm text-muted">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${health?.status === "healthy" ? "bg-green-500" : "bg-red-400"}`}
          />
          <span>
            {health?.status === "healthy" ? "System Ready" : "Offline"}
          </span>
        </div>
        {health && <span>API v{health.version}</span>}
        {docs && <span>{docs.total_documents} documents loaded</span>}
        <span>{agents.length} agents available</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="panel-card group text-center"
          >
            <h3 className="text-base mb-2 group-hover:text-accent transition-colors">
              {t.label}
            </h3>
            <p className="text-sm text-muted">{t.desc}</p>
          </Link>
        ))}
      </div>

      {agents.length > 0 && (
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl mb-6 font-serif">Available Agents</h2>
          <div className="space-y-3">
            {agents.map((a) => (
              <div key={a.type} className="panel-card flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{a.name}</h3>
                  <p className="text-xs text-muted mt-1">{a.description}</p>
                </div>
                <span className="chip text-xs">{a.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
