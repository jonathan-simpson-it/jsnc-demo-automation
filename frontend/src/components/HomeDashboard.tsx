"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchGraphMail,
  fetchGraphMailStatus,
  fetchRegulatoryFeed,
  generateSummary,
} from "@/lib/api";
import type {
  GraphEmail,
  GraphMailStatus,
  RegulatoryFeedItem,
  SummaryResponse,
} from "@/lib/types";

const FEED_SHOWN = 10;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

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

function whenLabel(raw: string | null | undefined): string {
  const iso = toIso(raw);
  if (!iso) return "";
  const today = dayKey(new Date());
  if (iso === today) return "Today";
  const then = new Date(`${iso}T12:00:00`);
  if (isNaN(then.getTime())) return iso;
  const diff = Math.round((Date.now() - then.getTime()) / 86400000);
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return fmtIso(iso);
}

function pickDefaultDay(radar: RegulatoryFeedItem[], mail: GraphEmail[]): string {
  const keys: string[] = [];
  for (const item of radar) {
    const d = toIso(item.issued_at);
    if (d) keys.push(d);
  }
  for (const email of mail) {
    const d = toIso(email.received_at);
    if (d) keys.push(d);
  }
  const today = dayKey(new Date());
  return keys.indexOf(today) >= 0 ? today : keys.sort().slice(-1)[0] || today;
}

function agentLabel(agent: string): string {
  const known: Record<string, string> = {
    due_diligence: "Due Diligence",
    term_sheet: "Term Sheet",
    lp_report: "LP Report",
    compliance: "Compliance Checker",
    cross_doc: "Cross-Document",
  };
  if (known[agent]) return known[agent];
  return agent.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SourceBadge({ source }: { source: string }) {
  const key = source.toLowerCase();
  const cls =
    key === "hkma"
      ? "bg-neutral-700 text-white"
      : key === "email" || key === "mail"
        ? "bg-neutral-200 text-neutral-700 border border-neutral-300"
        : "bg-neutral-900 text-white";
  return (
    <span
      className={`inline-flex h-5 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {key === "email" || key === "mail" ? "Email" : key}
    </span>
  );
}

function ExternalArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-neutral-300"
      aria-hidden="true"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export default function HomeDashboard() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [feed, setFeed] = useState<RegulatoryFeedItem[] | null>(null);
  const [report, setReport] = useState<SummaryResponse | null>(null);
  const [emails, setEmails] = useState<GraphEmail[] | null>(null);
  const [mailStatus, setMailStatus] = useState<GraphMailStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"radar" | "mail">("radar");
  const picked = useRef(false);

  useEffect(() => {
    fetchRegulatoryFeed()
      .then((r) => setFeed(r.items ?? []))
      .catch(() => setFeed([]));
    fetchGraphMailStatus()
      .then((st) => {
        setMailStatus(st);
        if (st.configured || st.demo) {
          fetchGraphMail(50)
            .then((r) => setEmails(r.emails))
            .catch(() => setEmails([]));
        } else {
          setEmails([]);
        }
      })
      .catch(() => {
        setMailStatus(null);
        setEmails([]);
      });
    generateSummary("week")
      .then(setReport)
      .catch(() => setReport(null));
  }, []);

  useEffect(() => {
    if (picked.current || feed === null || emails === null) return;
    setSelected(pickDefaultDay(feed, emails));
    picked.current = true;
  }, [feed, emails]);

  const byDate = useMemo(() => {
    const map: Record<string, RegulatoryFeedItem[]> = {};
    for (const item of feed ?? []) {
      const d = toIso(item.issued_at);
      if (d) (map[d] = map[d] || []).push(item);
    }
    return map;
  }, [feed]);

  const mailByDate = useMemo(() => {
    const map: Record<string, GraphEmail[]> = {};
    for (const email of emails ?? []) {
      const d = toIso(email.received_at);
      if (d) (map[d] = map[d] || []).push(email);
    }
    return map;
  }, [emails]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: { date: Date; key: string; radar: number; mail: number; inMonth: boolean }[] = [];
    for (let p = 0; p < startPad; p++) {
      const d = new Date(view.y, view.m, 1 - (startPad - p));
      out.push({ date: d, key: dayKey(d), radar: 0, mail: 0, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(view.y, view.m, day);
      const k = dayKey(d);
      out.push({
        date: d,
        key: k,
        radar: (byDate[k] || []).length,
        mail: (mailByDate[k] || []).length,
        inMonth: true,
      });
    }
    return out;
  }, [view, byDate, mailByDate]);

  const firstAvailableIn = (y: number, m: number): string | null => {
    const prefix = `${y}-${`${m + 1}`.padStart(2, "0")}`;
    const keys = Object.keys(byDate)
      .concat(Object.keys(mailByDate))
      .filter((k) => k.startsWith(prefix))
      .sort();
    return keys[0] || null;
  };

  const shiftMonth = (delta: number) => {
    const t = new Date(view.y, view.m + delta, 1);
    setView({ y: t.getFullYear(), m: t.getMonth() });
    setSelected(firstAvailableIn(t.getFullYear(), t.getMonth()));
    picked.current = true;
  };

  const goToToday = () => {
    const n = new Date();
    setView({ y: n.getFullYear(), m: n.getMonth() });
    setSelected(pickDefaultDay(feed ?? [], emails ?? []));
    picked.current = true;
  };

  const nowDate = new Date();
  const isCurrentMonth = view.y === nowDate.getFullYear() && view.m === nowDate.getMonth();
  const loaded = feed !== null && emails !== null;
  const selRadar = selected ? byDate[selected] || [] : [];
  const selMail = selected ? mailByDate[selected] || [] : [];
  const todayKey = dayKey(nowDate);

  const radarRows = useMemo(
    () =>
      [...(feed ?? [])]
        .map((item, idx) => ({ item, idx, iso: toIso(item.issued_at) || "0000-00-00" }))
        .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : a.idx - b.idx))
        .map((x) => x.item),
    [feed],
  );

  const mailRows = useMemo(
    () =>
      [...(emails ?? [])]
        .map((email, idx) => ({ email, idx, iso: toIso(email.received_at) || "0000-00-00" }))
        .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : a.idx - b.idx))
        .map((x) => x.email),
    [emails],
  );

  const topAgent =
    report && report.agent_breakdown.length ? report.agent_breakdown[0] : null;
  const agentCount = topAgent?.count ?? 0;
  const agentName = topAgent ? agentLabel(topAgent.agent) : "—";
  const queries = report?.total_queries != null ? String(report.total_queries) : "—";
  const confidence = report?.avg_confidence != null ? `${Math.round(report.avg_confidence * 100)}%` : "—";

  const mailSender = (email: GraphEmail) =>
    email.from && email.from_email && email.from !== email.from_email
      ? `${email.from} · ${email.from_email}`
      : email.from || email.from_email;

  const mailHref = (email: GraphEmail) => (email.web_link ? email.web_link : null);

  const calendarTitle = new Date(view.y, view.m, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid grid-cols-1 gap-6 bg-neutral-50/50 p-6 min-h-screen lg:grid-cols-12">
      {/* Left column: calendar + day log */}
      <div className="min-w-0 space-y-6 lg:col-span-5">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Radar &amp; inbox
              </p>
              <h3 className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
                {calendarTitle}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
              >
                ›
              </button>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-400"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const isSel = cell.key === selected;
                const isToday = cell.key === todayKey;
                const has = cell.radar > 0 || cell.mail > 0;
                const label = has
                  ? `${cell.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}: ${cell.radar} circular${cell.radar === 1 ? "" : "s"}, ${cell.mail} email${cell.mail === 1 ? "" : "s"}`
                  : undefined;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!has}
                    onClick={() => has && setSelected(cell.key)}
                    title={label}
                    aria-label={label}
                    className={`relative flex aspect-square items-center justify-center rounded-lg text-xs transition ${
                      isSel
                        ? "bg-neutral-900 font-semibold text-white"
                        : isToday
                          ? "bg-neutral-200/70 font-semibold text-neutral-900 hover:bg-neutral-300/70"
                          : has
                            ? "bg-neutral-100 font-medium text-neutral-900 hover:bg-neutral-200"
                            : cell.inMonth
                              ? "text-neutral-400"
                              : "text-transparent"
                    }`}
                  >
                    {cell.date.getDate()}
                    {has && (
                      <span className="absolute bottom-1 flex h-1 items-center gap-0.5">
                        {cell.radar > 0 && (
                          <span
                            className={`h-1 w-1 rounded-full ${isSel ? "bg-white" : "bg-neutral-900"}`}
                          />
                        )}
                        {cell.mail > 0 && (
                          <span
                            className={`h-1 w-1 rounded-full ${isSel ? "bg-emerald-300" : "bg-emerald-500"}`}
                          />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 border-t border-neutral-100 pt-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" aria-hidden="true" />
                Radar circulars
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Mail
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 px-4 py-3">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
              {selected ? `Updates for ${fmtIso(selected)}` : "Updates"}
            </h3>
            {loaded && selected && (
              <span className="shrink-0 text-xs text-neutral-400">
                {selRadar.length} circular{selRadar.length === 1 ? "" : "s"} ·{" "}
                {selMail.length} email{selMail.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {!loaded ? (
            <p className="px-4 py-6 text-sm text-neutral-400">
              Loading updates…
            </p>
          ) : selRadar.length === 0 && selMail.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-400">
              {selected
                ? `No circulars or mail on ${fmtIso(selected)}.`
                : "Select a highlighted date to see its updates."}
            </p>
          ) : (
            <div className="space-y-3 px-4 py-3">
              {selRadar.length > 0 && (
                <div>
                  <h4 className="pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                    Circulars · {selRadar.length}
                  </h4>
                  <ul className="space-y-2">
                    {selRadar.slice(0, 5).map((item, idx) => (
                      <li
                        key={`r-${item.id}-${idx}`}
                        className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white p-2.5"
                      >
                        <SourceBadge source={item.regulator} />
                        <div className="min-w-0 flex-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm font-medium text-neutral-900 transition hover:text-neutral-600"
                          >
                            {item.title}
                          </a>
                          <p className="truncate text-xs text-neutral-400">
                            {item.kind} · {whenLabel(item.issued_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selMail.length > 0 && (
                <div>
                  <h4 className="pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                    Mail · {selMail.length}
                  </h4>
                  <ul className="space-y-2">
                    {selMail.slice(0, 5).map((email) => {
                      const href = mailHref(email);
                      const subject = email.subject || "(no subject)";
                      return (
                        <li
                          key={`m-${email.id}`}
                          className="min-w-0 rounded-lg border border-neutral-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm font-semibold text-neutral-900 transition hover:text-neutral-600"
                              >
                                {subject}
                              </a>
                            ) : (
                              <span className="truncate text-sm font-semibold text-neutral-900">
                                {subject}
                              </span>
                            )}
                            <SourceBadge source="Email" />
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 min-w-0">
                            <span className="max-w-[70%] truncate rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
                              {mailSender(email)}
                            </span>
                            <span className="shrink-0 text-[11px] text-neutral-400">
                              {email.received_at
                                ? whenLabel(email.received_at)
                                : ""}
                            </span>
                          </div>
                          {email.body_preview && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                              {email.body_preview}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Right column: metrics + activity feed */}
      <div className="min-w-0 space-y-6 lg:col-span-7">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="px-4 pt-3 pb-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              This week
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
            <div className="min-w-0 px-4 py-3.5">
              <div className="truncate text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
                {queries}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-400">
                Queries this week
              </div>
              {report && report.total_queries > 0 && (
                <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                  {(report.agent_breakdown.length
                    ? report.agent_breakdown
                    : [{ agent: "", count: report.total_queries }]
                  )
                    .slice(0, 7)
                    .map((a, i) => (
                      <span
                        key={`q-${i}`}
                        className="w-1.5 rounded-sm bg-neutral-200 first:bg-neutral-900"
                        style={{
                          height: `${Math.max(
                            12,
                            Math.round(
                              (a.count / report.total_queries) * 36,
                            ),
                          )}px`,
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
            <div className="min-w-0 px-4 py-3.5">
              <div className="truncate text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
                {confidence}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-400">
                Avg confidence rate
              </div>
              {report?.avg_confidence != null && (
                <div
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
                  role="img"
                  aria-label={`Average confidence ${Math.round(report.avg_confidence * 100)} percent`}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.round(report.avg_confidence * 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="min-w-0 px-4 py-3.5">
              <div className="truncate text-2xl font-semibold tracking-tight text-neutral-900">
                {agentName}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-400">
                Top agent{agentCount ? ` · ${agentCount} queries` : ""}
              </div>
              {agentCount > 0 && report && report.total_queries > 0 && (
                <div
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
                  role="img"
                  aria-label={`Top agent handles ${Math.round((agentCount / report.total_queries) * 100)} percent of queries`}
                >
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{
                      width: `${Math.round((agentCount / report.total_queries) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="space-y-3 border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
                Activity feed
              </h3>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <a
                  href="/radar"
                  className="text-neutral-400 transition hover:text-neutral-900"
                >
                  Radar ↗
                </a>
                <a
                  href="/mailbox"
                  className="text-neutral-400 transition hover:text-neutral-900"
                >
                  Email ↗
                </a>
              </div>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5">
              <button
                type="button"
                onClick={() => setTab("radar")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === "radar"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                All Radar Alerts
                {feed !== null && (
                  <span className="ml-1.5 text-[10px] font-medium tabular-nums text-neutral-400">
                    {feed.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab("mail")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === "mail"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Mail
                {emails !== null && (
                  <span className="ml-1.5 text-[10px] font-medium tabular-nums text-neutral-400">
                    {emails.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {tab === "radar" ? (
            feed === null ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">
                Loading radar alerts…
              </p>
            ) : radarRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">
                No radar alerts yet. Sync on the Radar page to fetch the latest
                circulars.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-neutral-100">
                  {radarRows.slice(0, FEED_SHOWN).map((item, idx) => (
                  <li
                    key={`rf-${item.id}-${idx}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-neutral-50"
                  >
                    <SourceBadge source={item.regulator} />
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium text-neutral-900 transition hover:text-neutral-600"
                      >
                        {item.title}
                      </a>
                      <p className="truncate text-xs text-neutral-400">
                        {item.regulator} · {item.kind} · {whenLabel(item.issued_at)}
                      </p>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="shrink-0 rounded-md p-1 text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <ExternalArrow />
                    </a>
                  </li>
                ))}
                </ul>
                {radarRows.length > FEED_SHOWN && (
                  <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-2.5">
                    <span className="text-xs text-neutral-400">
                      Latest {FEED_SHOWN} of {radarRows.length} alerts
                    </span>
                    <a
                      href="/radar"
                      className="shrink-0 text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
                    >
                      View all on Radar ↗
                    </a>
                  </div>
                )}
              </>
            )
          ) : mailStatus === null ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              Loading mail…
            </p>
          ) : !mailStatus.configured && !mailStatus.demo ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              Connect an Outlook mailbox to see messages here.
            </p>
          ) : mailRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">
              No messages in this mailbox yet.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-neutral-100">
                {mailRows.slice(0, FEED_SHOWN).map((email) => {
                const href = mailHref(email);
                const subject = email.subject || "(no subject)";
                return (
                  <li
                    key={`mf-${email.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-neutral-50"
                  >
                    <SourceBadge source="Email" />
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-medium text-neutral-900 transition hover:text-neutral-600"
                        >
                          {subject}
                        </a>
                      ) : (
                        <span className="block truncate text-sm font-medium text-neutral-900">
                          {subject}
                        </span>
                      )}
                      <p className="truncate text-xs text-neutral-400">
                        {mailSender(email)} · {email.received_at ? whenLabel(email.received_at) : ""}
                      </p>
                    </div>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${subject}`}
                        className="shrink-0 rounded-md p-1 text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-900"
                      >
                        <ExternalArrow />
                      </a>
                    ) : (
                      <span className="shrink-0 p-1 text-neutral-300">
                        <ExternalArrow />
                      </span>
                    )}
                  </li>
                );
              })}
              </ul>
              {mailRows.length > FEED_SHOWN && (
                <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-2.5">
                  <span className="text-xs text-neutral-400">
                    Latest {FEED_SHOWN} of {mailRows.length} messages
                  </span>
                  <a
                    href="/mailbox"
                    className="shrink-0 text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
                  >
                    View all mail ↗
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
