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
      ? { dot: "var(--color-accent)", label: "System Ready" }
      : { dot: "var(--color-muted)", label: "Checking..." };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "68rem" }}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          <img src="/jsco-logo.png" alt="" width={72} height={72} style={{ borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }} />
          <p className="section-eyebrow" style={{ marginBottom: "0.6rem" }}>Live demo — AI for private markets</p>
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
            Private-equity intelligence with the guardrails your firm needs:
            every answer grounded in your documents and cited, every change
            reviewable, every action on the record. This live demo runs the
            real system — built by Jonathan Simpson &amp; Co. for firms that move
            money.
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

        {/* Calendar + latest dashboard */}
        <div style={{ marginBottom: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          <HomeDashboard />
        </div>

        {/* Launchpad */}
        <div style={{ display: "grid", gap: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          {appsByCategory().map(([title, apps]) => (
            <LaunchpadSection key={title} title={title} apps={apps} />
          ))}
        </div>

        <PitchBand />
      </div>
    </section>
  );
}
