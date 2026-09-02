"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";

interface AgentCard {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const AGENTS: AgentCard[] = [
  {
    type: "due_diligence",
    name: "Due Diligence Agent",
    description: "Analyze investment opportunities and conduct due diligence",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="14" r="8" />
        <line x1="20" y1="20" x2="28" y2="28" />
        <line x1="11" y1="14" x2="17" y2="14" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
  },
  {
    type: "term_sheet",
    name: "Term Sheet Extractor",
    description: "Extract structured data from term sheets",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="20" height="24" rx="2" />
        <line x1="10" y1="10" x2="22" y2="10" />
        <line x1="10" y1="15" x2="22" y2="15" />
        <line x1="10" y1="20" x2="18" y2="20" />
      </svg>
    ),
  },
  {
    type: "lp_report",
    name: "LP Report Generator",
    description: "Generate quarterly LP reports",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="18" width="6" height="10" rx="1" />
        <rect x="13" y="12" width="6" height="16" rx="1" />
        <rect x="22" y="6" width="6" height="22" rx="1" />
        <line x1="4" y1="4" x2="28" y2="4" />
      </svg>
    ),
  },
  {
    type: "compliance",
    name: "Compliance Checker",
    description: "Check regulatory compliance of documents",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3 L28 9 L28 17 C28 23 22 28 16 30 C10 28 4 23 4 17 L4 9 Z" />
        <polyline points="11,16 14,19 21,12" />
      </svg>
    ),
  },
  {
    type: "cross_doc",
    name: "Cross-Document Comparison",
    description: "Compare and synthesize information across multiple documents",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="12" height="16" rx="2" />
        <rect x="17" y="6" width="12" height="16" rx="2" />
        <line x1="6" y1="11" x2="12" y2="11" />
        <line x1="6" y1="15" x2="12" y2="15" />
        <line x1="20" y1="11" x2="26" y2="11" />
        <line x1="20" y1="15" x2="26" y2="15" />
        <path d="M15 12 L17 12" strokeDasharray="2 2" />
        <path d="M15 16 L17 16" strokeDasharray="2 2" />
      </svg>
    ),
  },
];

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetchHealth().catch(() => null).then(setHealth);
  }, []);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "56rem" }}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: "clamp(2.5rem, 5vw, 4rem)" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto" }}>
              <rect width="48" height="48" rx="12" fill="var(--color-ink)" />
              <text x="24" y="30" textAnchor="middle" fontFamily="Georgia, serif" fontSize="20" fontWeight="400" fill="var(--color-surface)" letterSpacing="-0.02em">
                JS
              </text>
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            Jonathan Simpson & Co.
          </h1>
          <p
            style={{
              color: "var(--color-muted)",
              fontSize: "0.95rem",
              maxWidth: "32rem",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            AI-powered Private Equity workflow automation. Pick an agent to
            get started.
          </p>

          {/* Status */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "1.25rem",
              fontSize: "0.78rem",
              color: "var(--color-muted)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: health?.status === "healthy" ? "#22c55e" : "var(--color-muted)",
              }}
            />
            <span>{health?.status === "healthy" ? "System Ready" : "Checking..."}</span>
          </div>
        </div>

        {/* Agent Grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          }}
        >
          {AGENTS.map((a) => (
            <Link
              key={a.type}
              href={`/chat?agent=${a.type}`}
              className="panel-card group"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                textDecoration: "none",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  transition: "background var(--transition-fast)",
                }}
              >
                {a.icon}
              </div>

              {/* Name + Type */}
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                    color: "var(--color-ink)",
                  }}
                >
                  {a.name}
                </h3>
                <span
                  className="chip"
                  style={{ fontSize: "0.68rem" }}
                >
                  {a.type}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  color: "var(--color-muted)",
                  fontSize: "0.85rem",
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {a.description}
              </p>

              {/* Button */}
              <div
                className="button button--ghost button--small"
                style={{
                  alignSelf: "flex-start",
                  marginTop: "auto",
                  transition: "all var(--transition-fast)",
                }}
              >
                Open
              </div>
            </Link>
          ))}
        </div>

        {/* Utility Links */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            marginTop: "clamp(2rem, 4vw, 3rem)",
            paddingTop: "2rem",
            borderTop: "1px solid var(--color-line)",
          }}
        >
          {[
            { href: "/documents", label: "Documents" },
            { href: "/eval", label: "Eval" },
            { href: "/summary", label: "Summary" },
            { href: "/config", label: "Config" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: "0.78rem",
                color: "var(--color-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textDecoration: "none",
                transition: "color var(--transition-fast)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
