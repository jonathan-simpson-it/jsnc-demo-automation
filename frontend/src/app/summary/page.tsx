"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchHealth,
  fetchGraphMail,
  fetchGraphMailStatus,
  fetchRegulatoryFeed,
  generateSummary,
} from "@/lib/api";
import type { GraphEmail, HealthStatus, RegulatoryFeedItem } from "@/lib/types";

/* ================= Date helpers ================= */

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Normalize issued_at (ISO or "03 Sep 2026" text) to a YYYY-MM-DD key. */
function toDay(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/.exec(raw.trim());
  if (m) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function dayKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function fmtDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ================= Feed model ================= */

type FeedKind = "radar" | "mail";
type BadgeTone = "sfc" | "hkma" | "mail";

interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  snippet: string;
  url: string;
  day: string;
  ts: number;
  meta: string;
  badge: BadgeTone;
  label: string;
}

const badgeStyles: Record<BadgeTone, string> = {
  sfc: "border border-neutral-200/80 bg-neutral-100 text-neutral-700",
  hkma: "border border-neutral-200/80 bg-neutral-100 text-neutral-700",
  mail: "border border-neutral-200/80 bg-white text-neutral-500",
};

function kindLabel(regulator: string | null | undefined, kindName: string | null | undefined): string {
  const reg = regulator === "HKMA" ? "HKMA" : "SFC";
  switch (kindName) {
    case "press release":
      return `${reg} Press`;
    case "policy statement":
      return `${reg} Policy`;
    case "high shareholding":
      return `${reg} Shareholding`;
    case "event":
      return `${reg} Event`;
    default:
      return `${reg} ${kindName ? kindName.charAt(0).toUpperCase() + kindName.slice(1) : "Update"}`;
  }
}

function radarTs(day: string | null): number {
  if (!day) return 0;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

/* ================= Small UI atoms ================= */

function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${badgeStyles[tone]}`}
    >
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-opacity ${
        loading ? "opacity-60" : ""
      }`}
    >
      <div className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

/* ================= Page ================= */

export default function SummaryPage() {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const [health, setHealth] = useState<"up" | "down" | "loading">("loading");
  const [report, setReport] = useState<{
    total: number;
    avgConfidence: number;
  } | null>(null);
  const [feedItems, setFeedItems] = useState<RegulatoryFeedItem[]>([]);
  const [emails, setEmails] = useState<GraphEmail[]>([]);
  const [mailState, setMailState] = useState<{
    connected: boolean;
    demo?: boolean;
    mailbox?: string;
    reason?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchHealth(),
      generateSummary("week").catch(() => null),
      fetchRegulatoryFeed().catch(() => ({ items: [] as RegulatoryFeedItem[] })),
      fetchGraphMailStatus().catch(() => null),
    ])
      .then(([h, rep, feed, mail]: [HealthStatus, unknown, { items: RegulatoryFeedItem[] }, unknown]) => {
        if (!alive) return;
        setHealth(h?.status === "healthy" ? "up" : "down");
        const r = rep as {
          total_queries?: number;
          avg_confidence?: number;
        } | null;
        setReport(
          r && typeof r.total_queries === "number"
            ? { total: r.total_queries, avgConfidence: r.avg_confidence ?? 0 }
            : null,
        );
        setFeedItems(feed.items ?? []);
        const st = mail as {
          configured?: boolean;
          demo?: boolean;
          mailbox?: string;
          reason?: string;
        } | null;
        setMailState(
          st
            ? {
                connected: !!st.configured,
                demo: st.demo,
                mailbox: st.mailbox,
                reason: st.reason,
              }
            : null,
        );
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Mailbox messages (feed + calendar need them once the mailbox is active).
  useEffect(() => {
    if (!mailState?.connected && !mailState?.demo) return;
    let alive = true;
    fetchGraphMail(40)
      .then((r) => alive && setEmails(r.emails ?? []))
      .catch(() => alive && setEmails([]));
    return () => {
      alive = false;
    };
  }, [mailState?.connected, mailState?.demo]);

  /* ---- Unified, deduped feed ---- */

  const feed = useMemo<FeedItem[]>(() => {
    const byKey = new Map<string, FeedItem>();
    const put = (item: FeedItem) => {
      const key = normTitle(item.title);
      const existing = byKey.get(key);
      if (!existing || item.ts > existing.ts) byKey.set(key, item);
    };
    for (const it of feedItems) {
      const day = toDay(it.issued_at);
      if (!day || !it.title) continue;
      put({
        id: `r-${it.id}`,
        kind: "radar",
        title: it.title,
        snippet: it.summary || "",
        url: it.url || "#",
        day,
        ts: radarTs(day),
        meta: fmtShort(day),
        badge: it.regulator === "HKMA" ? "hkma" : "sfc",
        label: kindLabel(it.regulator, it.kind),
      });
    }
    for (const m of emails) {
      const day = toDay(m.received_at);
      if (!day || !m.subject) continue;
      const ts = new Date(m.received_at as string).getTime() || Date.now();
      const time = new Date(ts).toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      put({
        id: `m-${m.id}`,
        kind: "mail",
        title: m.subject,
        snippet: m.body_preview || (m.from ? `From ${m.from}` : ""),
        url: m.web_link || "#",
        day,
        ts,
        meta: `${fmtShort(day)} · ${time}`,
        badge: "mail",
        label: "Email",
      });
    }
    return Array.from(byKey.values()).sort((a, b) => {
      if (b.ts !== a.ts) return b.ts - a.ts;
      return a.title.localeCompare(b.title);
    });
  }, [feedItems, emails]);

  /* ---- Calendar ---- */

  const byDay = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    for (const it of feed) {
      const list = map.get(it.day) || [];
      list.push(it);
      map.set(it.day, list);
    }
    return map;
  }, [feed]);

  const availableDays = useMemo(
    () => Array.from(byDay.keys()).sort(),
    [byDay],
  );

  const daysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const pad = first.getDay();
    const out: { day: string; inMonth: boolean }[] = [];
    for (let p = 0; p < pad; p++) {
      const d = new Date(view.y, view.m, 1 - (pad - p));
      out.push({ day: dayKey(d), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth(view.y, view.m); day++) {
      const d = new Date(view.y, view.m, day);
      out.push({ day: dayKey(d), inMonth: true });
    }
    return out;
  }, [view]);

  useEffect(() => {
    if (selected || availableDays.length === 0) return;
    const today = dayKey(new Date());
    const target = availableDays.includes(today) ? today : availableDays[availableDays.length - 1];
    const [y, m] = target.split("-").map(Number);
    setView({ y, m: m - 1 });
    setSelected(target);
  }, [availableDays, selected]);

  const shiftMonth = (delta: number) => {
    const t = new Date(view.y, view.m + delta, 1);
    const y = t.getFullYear();
    const m = t.getMonth();
    const prefix = `${y}-${`${m + 1}`.padStart(2, "0")}`;
    const days = availableDays.filter((d) => d.startsWith(prefix));
    setView({ y, m });
    setSelected(days.length ? days[days.length - 1] : null);
  };

  const goToToday = () => {
    const n = new Date();
    setView({ y: n.getFullYear(), m: n.getMonth() });
    setSelected(dayKey(n));
  };

  const isCurrentMonth =
    view.y === now.getFullYear() && view.m === now.getMonth();

  const dayItems = (selected ? byDay.get(selected) || [] : []).sort(
    (a, b) => b.ts - a.ts,
  );

  /* ---- Feed tabs ---- */

  const [tab, setTab] = useState<"all" | "radar" | "mail">("all");
  const radarCount = feed.filter((f) => f.kind === "radar").length;
  const mailCount = feed.filter((f) => f.kind === "mail").length;
  const tabItems =
    tab === "all" ? feed : feed.filter((f) => f.kind === tab);

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all", label: "All updates", count: feed.length },
    { key: "radar", label: "Regulatory radar", count: radarCount },
    { key: "mail", label: "Mail", count: mailCount },
  ];

  /* ---- KPIs ---- */

  const latestDay = availableDays[availableDays.length - 1] ?? null;
  const circularsToday = latestDay ? (byDay.get(latestDay) || []).filter((i) => i.kind === "radar").length : 0;

  const mailBadge =
    mailState == null
      ? { label: "n/a", cls: "border border-neutral-200/80 bg-neutral-100 text-neutral-500" }
      : mailState.demo
        ? { label: "Demo mode", cls: "border border-neutral-200/80 bg-neutral-100 text-neutral-600" }
        : mailState.connected
          ? { label: "Connected", cls: "" }
          : { label: "Not connected", cls: "border border-neutral-200/80 bg-neutral-100 text-neutral-500" };

  /* ---- Render ---- */

  return (
    <div className="min-h-screen bg-neutral-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* ============ Header ============ */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Intelligence Overview
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Regulatory and client-mail activity across your workspace, on one
              screen.
            </p>
          </div>

          {/* System status */}
          <div className="flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
            {health === "up" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                <span className="text-xs font-semibold text-neutral-900">
                  System Ready
                </span>
              </>
            ) : (
              <>
                <span
                  className="inline-flex h-2 w-2 rounded-full"
                  style={{ background: "var(--color-error)" }}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-neutral-500">
                  {health === "loading" ? "Checking" : "Offline"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ============ Quick metrics ============ */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            label="Total queries"
            value={report ? report.total.toLocaleString("en-US") : "n/a"}
            sub="This week"
            loading={loading}
          />
          <MetricCard
            label="Avg confidence"
            value={report ? `${Math.round(report.avgConfidence * 100)}%` : "n/a"}
            sub="Grounded answers"
            loading={loading}
          />
          <MetricCard
            label="SFC / HKMA circulars"
            value={loading ? "n/a" : circularsToday.toLocaleString("en-US")}
            sub={
              latestDay
                ? `Latest release · ${fmtDay(latestDay)}`
                : "Waiting for the radar"
            }
          />
          <div
            className={`rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm ${
              loading ? "opacity-60" : ""
            }`}
          >
            <div className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Mail sync
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {mailState?.connected ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                  <span className="text-xs font-semibold text-neutral-900">Connected</span>
                </span>
              ) : (
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${mailBadge.cls}`}
                >
                  {mailBadge.label}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-neutral-500">
              {mailState?.mailbox
                ? mailState.mailbox
                : mailState?.reason
                  ? "Connect Graph mail to sync a mailbox"
                  : "No mailbox configured"}
            </div>
          </div>
        </div>

        {/* ============ Main grid ============ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* -------- Left: calendar & daily log -------- */}
          <div className="lg:col-span-4">
            <section className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Activity calendar
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {new Date(view.y, view.m, 1).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <span aria-hidden="true">&lsaquo;</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                  {!isCurrentMonth && (
                    <button
                      type="button"
                      onClick={goToToday}
                      className="ml-1 rounded-md border border-neutral-200 px-2.5 py-1 text-[0.68rem] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>

              {/* Weekday header */}
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-center text-[0.6rem] font-semibold uppercase tracking-wide text-neutral-400"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell) => {
                  const has = (byDay.get(cell.day)?.length ?? 0) > 0;
                  const isSel = cell.day === selected;
                  return (
                    <button
                      key={cell.day}
                      type="button"
                      onClick={() => setSelected(cell.day)}
                      aria-label={`${fmtDay(cell.day)}${has ? ", has activity" : ""}`}
                      aria-pressed={isSel}
                      className={`relative flex aspect-square items-center justify-center rounded-md text-[0.74rem] tabular-nums transition-colors ${
                        !cell.inMonth
                          ? "pointer-events-none text-transparent"
                          : isSel
                            ? "bg-neutral-900 font-semibold text-white"
                            : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {Number(cell.day.slice(-2))}
                      {has && (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                            isSel ? "bg-white/80" : "bg-neutral-400"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-3 text-[0.66rem] text-neutral-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                  Activity
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
                  Selected
                </span>
              </div>
            </section>

            {/* Daily log */}
            <section className="mt-4 rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">
                {selected ? `Events for ${fmtDay(selected)}` : "Events"}
              </h2>
              {selected && dayItems.length > 0 ? (
                <ul className="mt-3 divide-y divide-neutral-100">
                  {dayItems.map((it) => (
                    <li key={it.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-2.5">
                        <Badge tone={it.badge} label={it.label} />
                        <div className="min-w-0 flex-1">
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[0.82rem] font-medium leading-snug text-neutral-900 hover:underline"
                          >
                            {it.title}
                          </a>
                          <div className="mt-0.5 truncate text-xs text-neutral-500">
                            {it.kind === "mail" ? it.snippet : it.meta}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">
                  {selected
                    ? "No circulars or mail on this date."
                    : "No activity in this month yet."}
                </p>
              )}
            </section>
          </div>

          {/* -------- Right: consolidated feed -------- */}
          <div className="lg:col-span-8">
            <section className="rounded-xl border border-neutral-200/80 bg-white shadow-sm">
              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-100 px-3 pt-2">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    aria-pressed={tab === t.key}
                    className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.8rem] font-medium transition-colors ${
                      tab === t.key
                        ? "border-neutral-900 text-neutral-900"
                        : "border-transparent text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    {t.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold tabular-nums ${
                        tab === t.key
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Feed list */}
              {tabItems.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-medium text-neutral-900">
                    No updates to show yet.
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Radar circulars and mailbox messages will appear here as
                    they arrive.
                  </p>
                </div>
              ) : (
                <ul className="max-h-[46rem] divide-y divide-neutral-100 overflow-y-auto">
                  {tabItems.map((it) => (
                    <li
                      key={it.id}
                      className="group px-4 py-3.5 transition-colors hover:bg-neutral-50 sm:px-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={it.badge} label={it.label} />
                            <a
                              href={it.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={it.title}
                              className="min-w-0 max-w-full truncate text-[0.88rem] font-semibold text-neutral-900 transition-colors group-hover:underline hover:text-black"
                            >
                              {it.title}
                            </a>
                          </div>
                          {it.snippet && (
                            <p className="mt-1 max-w-xl truncate text-sm text-neutral-500">
                              {it.snippet}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 pt-0.5 text-xs whitespace-nowrap text-neutral-400">
                          {it.meta}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Mail CTA */}
              <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
                <p className="text-xs text-neutral-500">
                  {mailCount > 0
                    ? `${mailCount} unique mail items in the unified feed.`
                    : "Mailbox activity appears here once mail sync is active."}
                </p>
                <a
                  href="/mailbox"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-[0.72rem] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                >
                  Open mailbox
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
