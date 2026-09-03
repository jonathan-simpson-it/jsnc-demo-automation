"use client";

import type { SavedDraft } from "@/lib/types";

interface Props {
  drafts: SavedDraft[];
  demo?: boolean;
}

export default function DraftsPanel({ drafts, demo }: Props) {
  return (
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
          Saved drafts
        </span>
        {demo && (
          <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
            demo
          </span>
        )}
      </div>
      {drafts.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>
          No drafts saved yet — compose one on the left.
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          {drafts.map((draft) => (
            <li
              key={draft.id}
              style={{ borderBottom: "1px solid var(--color-line)", padding: "0.4rem 0.1rem" }}
            >
              <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--color-ink)", overflowWrap: "anywhere" }}>
                {draft.subject}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                {draft.to ? `To: ${draft.to} · ` : ""}
                {draft.created_at
                  ? new Date(draft.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
                {draft.draft_link && (
                  <>
                    {" · "}
                    <a
                      href={draft.draft_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Open in Outlook ↗
                    </a>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
