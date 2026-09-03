"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchGraphDrafts,
  fetchGraphMail,
  fetchGraphMailStatus,
} from "@/lib/api";
import type { GraphEmail, SavedDraft } from "@/lib/types";
import EmailComposer from "@/components/EmailComposer";
import DraftsPanel from "@/components/DraftsPanel";

export default function SummaryPage() {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const [mailStatus, setMailStatus] = useState<{
    configured: boolean;
    demo?: boolean;
    reason?: string;
    mailbox?: string;
  } | null>(null);
  const [mailEmails, setMailEmails] = useState<GraphEmail[]>([]);
  const [mailLoading, setMailLoading] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);

  const mailActive = !!mailStatus && (!!mailStatus.configured || !!mailStatus.demo);

  const refreshDrafts = useCallback(async () => {
    if (!mailActive) return;
    try {
      const res = await fetchGraphDrafts(20);
      setDrafts(res.drafts);
    } catch {
      setDrafts([]);
    }
  }, [mailActive]);

  useEffect(() => {
    let alive = true;
    fetchGraphMailStatus()
      .then((st) => {
        if (!alive) return;
        setMailStatus(st);
        if (!st.configured && !st.demo) return;
        setMailLoading(true);
        fetchGraphMail(30)
          .then((r) => alive && setMailEmails(r.emails))
          .catch(() => alive && setMailError("Couldn't load the mailbox."))
          .finally(() => alive && setMailLoading(false));
      })
      .catch(() =>
        alive && setMailStatus({ configured: false, reason: "Graph mail unavailable." }),
      );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (mailActive) refreshDrafts();
  }, [mailActive, refreshDrafts]);

  return (
    <section className="section">
      <div className="container">
        <div className="section-intro">
          <span className="section-eyebrow">Email</span>
          <h1>Outlook mailbox.</h1>
          <p
            style={{
              color: "var(--color-muted)",
              fontSize: "0.92rem",
              maxWidth: "40rem",
              lineHeight: 1.6,
            }}
          >
            Draft platform reports with AI, review and edit them, then save to
            your Outlook Drafts via the Microsoft Graph API — nothing is sent
            until you send it.
          </p>
        </div>

        {/* Period toggle */}
        <div style={{ display: "flex", gap: "0.5rem", margin: "1rem 0 1.25rem" }}>
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`button button--small ${period === "week" ? "button--solid" : "button--ghost"}`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`button button--small ${period === "month" ? "button--solid" : "button--ghost"}`}
          >
            Last 30 Days
          </button>
        </div>

        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(22rem, 1fr))",
            alignItems: "start",
          }}
        >
          <EmailComposer
            period={period}
            mailActive={mailActive}
            demo={mailStatus?.demo}
            onSaved={refreshDrafts}
          />

          <div className="space-y-6">
            {/* Recent mail */}
            <div className="panel-card" style={{ padding: "1rem 1.1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--color-muted)",
                  }}
                >
                  Recent mail
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
                  {mailStatus?.mailbox}
                  {mailStatus?.demo ? " · demo" : ""}
                </span>
              </div>

              {mailLoading && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  Loading mailbox...
                </p>
              )}
              {!mailLoading && mailError && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-error)" }}>
                  {mailError}
                </p>
              )}
              {!mailLoading && mailActive && mailEmails.length === 0 && !mailError && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  No messages in the mailbox yet.
                </p>
              )}
              {mailActive && mailEmails.length > 0 && (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gap: "0.15rem",
                  }}
                >
                  {mailEmails.map((email) => (
                    <li key={email.id} style={{ borderBottom: "1px solid var(--color-line)" }}>
                      <button
                        type="button"
                        onClick={() => setOpenEmail(openEmail === email.id ? null : email.id)}
                        style={{
                          width: "100%",
                          background: "none",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          padding: "0.6rem 0.15rem",
                          display: "grid",
                          gap: "0.15rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.86rem",
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {email.subject || "(no subject)"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                          {email.from}
                          {email.received_at
                            ? " · " +
                              new Date(email.received_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </button>
                      {openEmail === email.id && (
                        <div
                          style={{
                            padding: "0 0.4rem 0.7rem",
                            fontSize: "0.82rem",
                            color: "var(--color-muted)",
                            lineHeight: 1.5,
                          }}
                        >
                          {email.body_preview || "No preview."}
                          {email.web_link && (
                            <div style={{ marginTop: "0.4rem" }}>
                              <a
                                href={email.web_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: "0.78rem", color: "var(--color-accent)" }}
                              >
                                Open in Outlook ↗
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!mailLoading && mailStatus && !mailActive && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--color-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {mailStatus.reason || "Mailbox access is not configured."}
                </p>
              )}
            </div>

            <DraftsPanel drafts={drafts} demo={mailStatus?.demo} />
          </div>
        </div>
      </div>
    </section>
  );
}
