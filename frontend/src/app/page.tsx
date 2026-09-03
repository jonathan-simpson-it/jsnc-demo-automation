"use client";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";
import { appsByCategory } from "@/lib/apps";
import { LaunchpadSection } from "@/components/Launchpad";
import HomeDashboard from "@/components/HomeDashboard";
import PitchBand from "@/components/PitchBand";

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
      ? { dot: "var(--color-ok)", label: "System Ready" }
      : { dot: "var(--color-muted)", label: "Checking" };

  return (
    <section
      className="section"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        paddingTop: "clamp(0.75rem, 2vw, 1.5rem)",
        paddingBottom: "clamp(2.5rem, 5vw, 4rem)",
      }}
    >
      <div className="container" style={{ maxWidth: "68rem" }}>
        {/* Masthead */}
        <div
          style={{
            marginBottom: "clamp(2rem, 4vw, 2.75rem)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: "44rem" }}>
            <img
              src="/jsco-logo.png"
              alt=""
              width={56}
              height={56}
              style={{
                borderRadius: "0.375rem",
                objectFit: "cover",
                marginBottom: "1rem",
                border: "1px solid var(--color-line)",
              }}
            />
            <p className="section-eyebrow" style={{ marginBottom: "0.5rem" }}>
              Live demo: AI for private markets
            </p>
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(1.7rem, 3.5vw, 2.4rem)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                lineHeight: 1.12,
                marginBottom: "0.75rem",
              }}
            >
              Jonathan Simpson &amp; Co.
            </h1>
            <p
              style={{
                color: "var(--color-muted)",
                fontSize: "0.92rem",
                maxWidth: "36rem",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Private-equity intelligence with the guardrails your firm needs:
              every answer grounded in your documents and cited, every change
              reviewable, every action on the record. This live demo runs the
              real system, built by Jonathan Simpson &amp; Co. for firms that move
              money.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                marginTop: "1.25rem",
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://jonathansimpson.co/contact/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                Start a project
              </a>
              <a
                href="https://www.linkedin.com/company/jonathan-simpson-co"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Schedule a demo
              </a>
            </div>
          </div>

          {/* Status */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.72rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-md)",
              padding: "0.55rem 0.9rem",
              whiteSpace: "nowrap",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: status.dot }}
            />
            <span>{status.label}</span>
          </div>
        </div>

        {/* Calendar + latest dashboard */}
        <div style={{ marginBottom: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          <HomeDashboard />
        </div>

        {/* Launchpad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "clamp(2.5rem, 5vw, 3.5rem)",
          }}
        >
          {appsByCategory().map(([title, apps]) => (
            <LaunchpadSection key={title} title={title} apps={apps} />
          ))}
        </div>

        <PitchBand />
      </div>
    </section>
  );
}
