"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRegulatoryFeed, generateSummary } from "@/lib/api";
import type { RegulatoryFeedItem, SummaryResponse } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Normalize issued_at (ISO or "03 Sep 2026" text) to an ISO date. */
function toIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (iso) return iso[1];
  const m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/.exec(raw.trim());
  if (m) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function fmtIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dayKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

interface CalendarDay {
  date: Date;
  key: string;
  items: RegulatoryFeedItem[];
  inMonth: boolean;
}

export default function HomeDashboard() {
  const [feed, setFeed] = useState<RegulatoryFeedItem[] | null>(null);
  const [report, setReport] = useState<SummaryResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchRegulatoryFeed()
      .then((r) => {
        const items = r.items ?? [];
        setFeed(items);
        if (!selected) {
          const today = dayKey(new Date());
          const dated = items
            .map((i) => toIso(i.issued_at))
            .filter((d): d is string => !!d)
            .sort()
            .reverse();
          setSelected(items.some((i) => toIso(i.issued_at) === today) ? today : dated[0] || today);
        }
      })
      .catch(() => setFeed([]));
    generateSummary("week")
      .then(setReport)
      .catch(() => setReport(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const byDate = useMemo(() => {
    const map: Record<string, RegulatoryFeedItem[]> = {};
    for (const item of feed ?? []) {
      const d = toIso(item.issued_at);
      if (d) (map[d] = map[d] || []).push(item);
    }
    return map;
  }, [feed]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: CalendarDay[] = [];
    for (let p = 0; p < startPad; p++) {
      const d = new Date(year, month, 1 - (startPad - p));
      out.push({ date: d, key: dayKey(d), items: [], inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const k = dayKey(d);
      out.push({ date: d, key: k, items: byDate[k] || [], inMonth: true });
    }
    return out;
  }, [year, month, byDate]);

  const selectedItems = selected ? byDate[selected] || [] : [];
  const hasItems = feed?.some((i) => !!toIso(i.issued_at)) ?? false;

  const latest = useMemo(() => {
    return [...(feed ?? [])]
      .map((i) => ({ item: i, iso: toIso(i.issued_at) || "0000-00-00" }))
      .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0))
      .map((x) => x.item)
      .slice(0, 6);
  }, [feed]);

  const topAgent =
    report && report.agent_breakdown.length ? report.agent_breakdown[0] : null;

  return (
    <div
      className="grid gap-6"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(19rem, 1fr))",
        alignItems: "start",
        marginTop: "1rem",
      }}
    >
      {/* Calendar */}
      <div className="panel-card" style={{ padding: "1rem 1.1rem" }}>
        <div className="section-intro" style={{ marginBottom: "0.5rem" }}>
          <span className="section-eyebrow">Regulatory calendar</span>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            {now.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.2rem",
            marginBottom: "0.35rem",
          }}
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontSize: "0.62rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              {w}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.2rem",
          }}
        >
          {cells.map((cell) => {
            const isSel = cell.key === selected;
            const has = cell.items.length > 0;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => has && setSelected(cell.key)}
                disabled={!has}
                title={
                  has
                    ? `${cell.items.length} item${cell.items.length === 1 ? "" : "s"} — ${cell.items[0].title}`
                    : undefined
                }
                style={{
                  aspectRatio: "1 / 1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.1rem",
                  fontSize: "0.74rem",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  cursor: has ? "pointer" : "default",
                  color: cell.inMonth
                    ? isSel
                      ? "var(--color-bg)"
                      : "var(--color-ink)"
                    : "transparent",
                  background: isSel
                    ? "var(--color-accent)"
                    : has
                      ? "var(--color-accent-soft)"
                      : "transparent",
                }}
              >
                <span>{cell.date.getDate()}</span>
                {has && (
                  <span
                    style={{
                      width: "0.35rem",
                      height: "0.35rem",
                      borderRadius: "999px",
                      background: isSel ? "var(--color-bg)" : "var(--color-accent)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {hasItems && (
          <div style={{ marginTop: "0.6rem" }}>
            {selectedItems.length ? (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.4rem" }}>
                {selectedItems.slice(0, 5).map((item, idx) => (
                  <li key={`${item.id}-${idx}`} style={{ fontSize: "0.8rem", lineHeight: 1.4 }}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-ink)", textDecoration: "none" }}
                    >
                      {item.title}
                    </a>
                    <span style={{ color: "var(--color-muted)", fontSize: "0.7rem" }}>
                      {" "}
                      · {item.regulator} · {item.kind}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-muted)" }}>
                No news on {selected ? new Date(selected).toDateString() : "this day"}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Latest + report */}
      <div className="space-y-6">
        <div className="panel-card" style={{ padding: "1rem 1.1rem" }}>
          <div className="section-intro" style={{ marginBottom: "0.5rem" }}>
            <span className="section-eyebrow">Latest from the radar</span>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>What’s new</h2>
          </div>
          {latest.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-muted)" }}>
              Nothing on the radar yet.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.55rem" }}>
              {latest.map((item) => (
                <li key={item.id} style={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--color-ink)", textDecoration: "none" }}
                  >
                    {item.title}
                  </a>
                  <div style={{ color: "var(--color-muted)", fontSize: "0.7rem" }}>
                    {item.regulator} · {item.kind} ·{" "}
                    {toIso(item.issued_at) ? fmtIso(toIso(item.issued_at)!) : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {report && report.total_queries > 0 && (
          <div className="panel-card" style={{ padding: "1rem 1.1rem" }}>
            <div className="section-intro" style={{ marginBottom: "0.5rem" }}>
              <span className="section-eyebrow">This week</span>
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Platform report</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 600 }}>{report.total_queries}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>queries</div>
              </div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 600 }}>
                  {Math.round((report.avg_confidence ?? 0) * 100)}%
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>avg confidence</div>
              </div>
            </div>
            {topAgent && (
              <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.6rem" }}>
                Top agent: <strong style={{ color: "var(--color-ink)" }}>{topAgent.agent}</strong>{" "}
                ({topAgent.count} queries)
              </div>
            )}
            <a
              href="/summary"
              style={{ fontSize: "0.8rem", color: "var(--color-accent)", display: "inline-block", marginTop: "0.5rem" }}
            >
              View email report →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
