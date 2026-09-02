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
    <>
      {/* Hero Section */}
      <section className="section" style={{ paddingBottom: "clamp(3rem, 6vw, 5rem)" }}>
        <div className="container">
          <div className="section-intro" style={{ maxWidth: "48rem" }}>
            <span className="section-eyebrow">AI Engineering Platform</span>
            <h1>Private Equity workflow automation.</h1>
            <p>
              RAG-powered multi-agent system for due diligence, term sheet
              analysis, compliance checks, and cross-document comparison.
            </p>
          </div>

          {/* Status Bar */}
          <div
            className="flex flex-wrap items-center gap-6"
            style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    health?.status === "healthy"
                      ? "#22c55e"
                      : "var(--color-muted)",
                }}
              />
              <span>
                {health?.status === "healthy" ? "System Ready" : "Checking..."}
              </span>
            </div>
            {health && <span>API v{health.version}</span>}
            {docs && <span>{docs.total_documents} documents loaded</span>}
            <span>{agents.length} agents available</span>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="section--tight" style={{ borderTop: "1px solid var(--color-line)" }}>
        <div className="container">
          <div className="section-intro">
            <span className="section-eyebrow">Tools</span>
            <h2>Your workflow, automated.</h2>
            <p>
              Each tool connects to the same multi-agent backend. Start anywhere.
            </p>
          </div>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            }}
          >
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="panel-card group">
                <h3
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: "0.5rem",
                  }}
                  className="group-hover:text-accent transition-colors"
                >
                  {t.label}
                </h3>
                <p style={{ color: "var(--color-muted)", fontSize: "0.88rem" }}>
                  {t.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Agents Section */}
      {agents.length > 0 && (
        <section className="section--tight" style={{ borderTop: "1px solid var(--color-line)" }}>
          <div className="container">
            <div className="section-intro">
              <span className="section-eyebrow">Agents</span>
              <h2>Built for specialization.</h2>
              <p>
                Each agent is optimized for a specific PE workflow. The router
                selects the right one automatically.
              </p>
            </div>

            <div className="space-y-3">
              {agents.map((a) => (
                <div key={a.type} className="panel-card flex items-start gap-4">
                  <div className="flex-1">
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                      {a.name}
                    </h3>
                    <p
                      style={{
                        color: "var(--color-muted)",
                        fontSize: "0.85rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {a.description}
                    </p>
                  </div>
                  <span className="chip">{a.type}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
