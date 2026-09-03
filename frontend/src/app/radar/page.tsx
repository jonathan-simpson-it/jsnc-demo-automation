"use client";
import { useCallback, useEffect, useState } from "react";
import {
  fetchRegulatoryFeed,
  fetchRegulatoryStatus,
  pollRegulatory,
} from "@/lib/api";
import type { RegulatoryFeedItem, RegulatoryState } from "@/lib/types";

const REGULATOR_ORDER: Record<string, number> = { SFC: 0, HKMA: 1 };

function fmtDate(iso: string | null): string {
  if (!iso) return "date unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date unknown";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RadarPage() {
  const [items, setItems] = useState<RegulatoryFeedItem[] | null>(null);
  const [state, setState] = useState<RegulatoryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [polling, setPolling] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setLoading(true);
    Promise.all([fetchRegulatoryFeed(), fetchRegulatoryStatus()])
      .then(([feed, st]) => {
        setItems(feed.items);
        setState(st);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checkNow = useCallback(async () => {
    setPolling(true);
    try {
      await pollRegulatory();
      const [feed, st] = await Promise.all([
        fetchRegulatoryFeed(),
        fetchRegulatoryStatus(),
      ]);
      setItems(feed.items);
      setState(st);
    } catch {
      setFailed(true);
    } finally {
      setPolling(false);
    }
  }, []);

  if (failed)
    return (
      <section className="section">
        <div className="container" style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: "1.25rem" }}>
            Couldn't load the regulatory feed. Is the backend running?
          </p>
          <button type="button" onClick={load} className="button button--solid">
            Retry
          </button>
        </div>
      </section>
    );

  const busy = polling || !!state?.running;
  const chipColors: Record<string, { bg: string; fg: string }> = {
    ok: { bg: "var(--color-accent-soft)", fg: "var(--color-accent)" },
    error: { bg: "transparent", fg: "var(--color-error)" },
    idle: { bg: "var(--color-accent-soft)", fg: "var(--color-ink)" },
  };
  const sc = chipColors[state?.last_status ?? "idle"] || chipColors.idle;

  const grouped: Record<string, RegulatoryFeedItem[]> = {};
  for (const item of items ?? []) {
    grouped[item.regulator] = grouped[item.regulator] || [];
    grouped[item.regulator].push(item);
  }
  const regulators = Object.keys(grouped).sort(
    (a, b) =>
      (REGULATOR_ORDER[a] ?? 2) - (REGULATOR_ORDER[b] ?? 2) ||
      a.localeCompare(b),
  );

  // SFC renders as its hub sections (news, policy statements, high
  // shareholding, events), each keeping its own newest items; the endpoint
  // already orders items section-by-section, so split on kind boundaries.
  const SFC_SECTION_LABEL: Record<string, string> = {
    news: "News",
    "policy statement": "Policy statements",
    "high shareholding": "High shareholding",
    event: "Events",
  };
  interface Segment {
    regulator: string;
    kind: string | null;
    label: string;
    items: RegulatoryFeedItem[];
    head: boolean;
  }
  const segments: Segment[] = [];
  for (const regulator of regulators) {
    const rows = grouped[regulator];
    if (regulator !== "SFC") {
      segments.push({ regulator, kind: null, label: regulator, items: rows, head: true });
      continue;
    }
    let first = true;
    const buckets: Record<string, RegulatoryFeedItem[]> = {};
    for (const it of rows) {
      const k = it.kind || "news";
      (buckets[k] = buckets[k] || []).push(it);
    }
    for (const [kind, its] of Object.entries(buckets)) {
      segments.push({
        regulator,
        kind,
        label: SFC_SECTION_LABEL[kind] || kind,
        items: its,
        head: first,
      });
      first = false;
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Compliance &amp; Risk</span>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              marginBottom: "1rem",
            }}
          >
            Regulatory radar.
          </h1>
          <p>
            Daily SFC and HKMA circulars, ingested into the knowledge base with
            recency-weighted retrieval.
          </p>
        </div>

        {/* Status strip */}
        <div
          className="panel-card"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.9rem 1.2rem",
            marginBottom: "2rem",
          }}
        >
          <div>
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}
            >
              <span style={{ fontWeight: 500 }}>
                Last run: {state?.last_run || "never"}
              </span>
              <span className="chip" style={{ background: sc.bg, color: sc.fg }}>
                {state?.last_status ?? "idle"}
              </span>
            </div>
            {state?.last_error && (
              <div
                style={{
                  marginTop: "0.35rem",
                  fontSize: "0.75rem",
                  color: "var(--color-muted)",
                }}
              >
                last error: {state.last_error}
              </div>
            )}
          </div>
          <button
            type="button"
            className="button button--solid button--small"
            disabled={busy}
            onClick={checkNow}
          >
            {busy ? "Checking…" : "Check now"}
          </button>
        </div>

        {loading && (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            Loading regulatory feed...
          </p>
        )}

        {!loading && !items?.length && (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.88rem",
            }}
          >
            Nothing on the radar yet — run Check now to fetch the latest
            circulars.
          </p>
        )}

        {!loading && !!items?.length && (
          <div className="space-y-2">
            {segments.map((segment) => (
              <div key={segment.regulator + (segment.kind || "")}>
                <div style={{ margin: segment.head ? "1.5rem 0 0.4rem" : "1.4rem 0 0.4rem" }}>
                  {segment.head && (
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.09em",
                        textTransform: "uppercase",
                        color: "var(--color-muted)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {segment.regulator}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: segment.kind ? "0.74rem" : "0.7rem",
                      fontWeight: 600,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: segment.kind ? "var(--color-accent)" : "var(--color-muted)",
                    }}
                  >
                    {segment.label} — {segment.items.length} item
                    {segment.items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="space-y-3">
                  {segment.items.map((item) => (
                    <div key={item.id} className="panel-card">
                      <h4 style={{ margin: "0 0 0.6rem" }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "0.92rem",
                            fontWeight: 500,
                            color: "var(--color-ink)",
                            textDecoration: "none",
                            transition: "color var(--transition-fast)",
                          }}
                        >
                          {item.title}{" "}
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--color-accent)",
                            }}
                          >
                            ↗
                          </span>
                        </a>
                      </h4>
                      <div
                        className="flex flex-wrap items-center gap-2"
                        style={{ marginBottom: "0.6rem" }}
                      >
                        <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                          {item.kind}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                          {fmtDate(item.issued_at)}
                        </span>
                        <span
                          className="chip"
                          style={
                            item.status === "ingested"
                              ? { background: "var(--color-accent-soft)", color: "var(--color-accent)" }
                              : item.status === "error"
                                ? { background: "transparent", color: "var(--color-error)" }
                                : undefined
                          }
                        >
                          {item.status}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                          {item.chunks} chunk{item.chunks === 1 ? "" : "s"}
                        </span>
                      </div>
                      {item.summary ? (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: "var(--color-muted)",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.summary}
                        </p>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: "var(--color-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Impact summary pending.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
