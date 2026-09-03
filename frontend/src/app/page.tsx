"use client";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";
import { appsByCategory } from "@/lib/apps";
import { LaunchpadSection } from "@/components/Launchpad";

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then((h) => setHealth(h))
      .catch(() => setOffline(true));
  }, []);

  const status = offline
    ? { dot: "var(--color-error)", label: "Backend offline" }
    : health?.status === "healthy"
      ? { dot: "var(--color-accent)", label: "System Ready" }
      : { dot: "var(--color-muted)", label: "Checking..." };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "56rem" }}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: "clamp(2.5rem, 5vw, 3.5rem)" }}>
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
            AI-powered Private Equity workflow automation. Open an application
            to get started, or jump straight to a specialist agent.
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
              style={{ background: status.dot }}
            />
            <span>{status.label}</span>
          </div>
        </div>

        {/* Launchpad */}
        <div style={{ display: "grid", gap: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          {appsByCategory().map(([title, apps]) => (
            <LaunchpadSection key={title} title={title} apps={apps} />
          ))}
        </div>
      </div>
    </section>
  );
}
