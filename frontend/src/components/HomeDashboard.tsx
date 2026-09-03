"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
import RegulatorMark from "@/components/RegulatorMark";

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

interface CalendarDay {
  date: Date;
  key: string;
  radar: RegulatoryFeedItem[];
  mail: GraphEmail[];
  inMonth: boolean;
}

export default function HomeDashboard() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [feed, setFeed] = useState<RegulatoryFeedItem[] | null>(null);
  const [report, setReport] = useState<SummaryResponse | null>(null);
  const [emails, setEmails] = useState<GraphEmail[] | null>(null);
  const [mailStatus, setMailStatus] = useState<GraphMailStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
    const out: CalendarDay[] = [];
    for (let p = 0; p < startPad; p++) {
      const d = new Date(view.y, view.m, 1 - (startPad - p));
      out.push({ date: d, key: dayKey(d), radar: [], mail: [], inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(view.y, view.m, day);
      const k = dayKey(d);
      out.push({
        date: d,
        key: k,
        radar: byDate[k] || [],
        mail: mailByDate[k] || [],
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
    const y = t.getFullYear();
    const m = t.getMonth();
    setView({ y, m });
    setSelected(firstAvailableIn(y, m));
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

  const selRadar = selected ? byDate[selected] || [] : [];
  const selMail = selected ? mailByDate[selected] || [] : [];
  const loaded = feed !== null && emails !== null;

  const latest = useMemo(() => {
    return [...(feed ?? [])]
      .map((i) => ({ item: i, iso: toIso(i.issued_at) || "0000-00-00" }))
      .sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0))
      .map((x) => x.item)
      .slice(0, 6);
  }, [feed]);

  const topAgent =
    report && report.agent_breakdown.length ? report.agent_breakdown[0] : null;

  const navBtn: CSSProperties = {
    width: "1.7rem",
    height: "1.7rem",
    padding: 0,
    borderRadius: "999px",
    border: "none",
    background: "var(--color-accent-soft)",
    color: "var(--color-ink)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "1.05rem",
    lineHeight: 1,
    flexShrink: 0,
  };

  const mailSender = (email: GraphEmail) =>
    email.from && email.from_email && email.from !== email.from_email
      ? `${email.from} · ${email.from_email}`
      : email.from || email.from_email;

  const mailSummary = (email: GraphEmail) => {
    return (
      <>
        {mailSender(email)}
        {email.received_at
          ? ` · ${new Date(email.received_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}`
          : ""}
      </>
    );
  };

  const inboxEmails = (emails ?? []).slice(0, 5);

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
        <div
          className="section-intro"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <span className="section-eyebrow" style={{ marginBottom: "0.2rem" }}>
              Radar &amp; inbox
            </span>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
              {new Date(view.y, view.m, 1).toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              style={navBtn}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              style={navBtn}
            >
              ›
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToToday}
                style={{
                  ...navBtn,
                  width: "auto",
                  padding: "0 0.7rem",
                  fontSize: "0.74rem",
                }}
              >
                Today
              </button>
            )}
          </div>
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
            const has = cell.radar.length > 0 || cell.mail.length > 0;
            const counts = [
              ...(cell.radar.length
                ? [`${cell.radar.length} circular${cell.radar.length === 1 ? "" : "s"}`]
                : []),
              ...(cell.mail.length
                ? [`${cell.mail.length} email${cell.mail.length === 1 ? "" : "s"}`]
                : []),
            ];
            const label = `${cell.date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })} — ${counts.join(", ")}`;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => has && setSelected(cell.key)}
                disabled={!has}
                title={has ? label : undefined}
                aria-label={has ? label : undefined}
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
                      display: "flex",
                      gap: "0.14rem",
                      alignItems: "center",
                      height: "0.35rem",
                    }}
                  >
                    {cell.radar.length > 0 && (
                      <span
                        style={{
                          width: "0.35rem",
                          height: "0.35rem",
                          borderRadius: "999px",
                          background: isSel ? "var(--color-bg)" : "var(--color-accent)",
                        }}
                      />
                    )}
                    {cell.mail.length > 0 && (
                      <span
                        style={{
                          width: "0.35rem",
                          height: "0.35rem",
                          borderRadius: "999px",
                          background: isSel ? "var(--color-bg)" : "var(--color-ink)",
                        }}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {loaded && (
          <div style={{ marginTop: "0.6rem" }}>
            {selRadar.length > 0 || selMail.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                {selRadar.slice(0, 5).map((item, idx) => (
                  <li
                    key={`r-${item.id}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ flexShrink: 0, lineHeight: 0 }}>
                      <RegulatorMark code={item.regulator} size={14} link={false} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--color-ink)", textDecoration: "none" }}
                      >
                        {item.title}
                      </a>
                      <span
                        style={{
                          display: "block",
                          color: "var(--color-muted)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {item.regulator} · {item.kind}
                      </span>
                    </span>
                  </li>
                ))}
                {selMail.slice(0, 5).map((email) => (
                  <li
                    key={`m-${email.id}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        lineHeight: 0,
                        color: "var(--color-muted)",
                        paddingTop: "0.16rem",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2.5" />
                        <path d="m3.5 7.5 8.5 6 8.5-6" />
                      </svg>
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <a
                        href={email.web_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--color-ink)", textDecoration: "none" }}
                      >
                        {email.subject || "(no subject)"}
                      </a>
                      <span
                        style={{
                          display: "block",
                          color: "var(--color-muted)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {mailSummary(email)}
                      </span>
                      {email.body_preview && (
                        <span
                          style={{
                            display: "block",
                            color: "var(--color-muted)",
                            fontSize: "0.7rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {email.body_preview}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-muted)" }}>
                {selected
                  ? `No circulars or mail on ${fmtIso(selected)}.`
                  : "No circulars or mail in this month yet."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Inbox + report */}
      <div className="space-y-6">
        <div className="panel-card" style={{ padding: "1rem 1.1rem" }}>
          <div
            className="section-intro"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span className="section-eyebrow" style={{ marginBottom: "0.2rem" }}>
                Inbox
              </span>
              <h2
                style={{
                  fontSize: "1.1rem",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {mailStatus?.configured || mailStatus?.demo
                  ? `${mailStatus.mailbox || "Latest mail"}${mailStatus.demo ? " · demo" : ""}`
                  : "Mailbox not connected"}
              </h2>
            </div>
            <a
              href="/summary"
              style={{
                fontSize: "0.72rem",
                color: "var(--color-accent)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Email page →
            </a>
          </div>
          {mailStatus === null ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-muted)" }}>
              Checking mailbox status…
            </p>
          ) : !mailStatus.configured && !mailStatus.demo ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: "var(--color-muted)",
                lineHeight: 1.5,
              }}
            >
              Add GRAPH_TENANT_ID, GRAPH_CLIENT_ID and GRAPH_CLIENT_SECRET to .env to show
              mailbox activity on the calendar.
            </p>
          ) : mailStatus.demo && inboxEmails.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-muted)" }}>
              No demo messages yet.
            </p>
          ) : inboxEmails.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-muted)" }}>
              No messages in this mailbox yet.
            </p>
          ) : (
            <ul
              style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.5rem" }}
            >
              {inboxEmails.map((email) => (
                <li key={email.id} style={{ fontSize: "0.82rem", lineHeight: 1.4, minWidth: 0 }}>
                  <a
                    href={email.web_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--color-ink)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {email.subject || "(no subject)"}
                  </a>
                  <span
                    style={{
                      display: "block",
                      color: "var(--color-muted)",
                      fontSize: "0.7rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {mailSender(email)}
                    {email.received_at
                      ? ` · ${new Date(email.received_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {mailStatus?.demo && (emails ?? []).length > 0 && (
            <p
              style={{
                margin: "0.6rem 0 0",
                fontSize: "0.72rem",
                color: "var(--color-muted)",
                lineHeight: 1.5,
              }}
            >
              Demo mail — connect an Outlook mailbox via GRAPH_* to see real messages.
            </p>
          )}
        </div>

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
