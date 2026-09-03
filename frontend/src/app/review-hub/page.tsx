"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchReviewQueue, approveReview, rejectReview } from "@/lib/api";
import type { ReviewItem } from "@/lib/types";
import { parseCitation, traceSummary, formatMs } from "@/lib/utils";

const REASON_LABELS: [string, string][] = [
  ["rescue", "Rescue path"],
  ["low_confidence", "Low confidence"],
  ["error", "Backend error"],
  ["human review", "Human review"],
];

function reasonLabel(reason: string): string {
  if (!reason) return reason;
  const hit = REASON_LABELS.find(([needle]) =>
    reason.toLowerCase().includes(needle),
  );
  return hit ? hit[1] : reason;
}

function formatConfidence(confidence: number | null): string {
  return confidence == null ? "n/a" : `${Math.round(confidence * 100)}%`;
}

export default function ReviewHubPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchReviewQueue()
      .then((data) => {
        setItems(data.items);
        setEditingId(null);
        setEditText("");
      })
      .catch(() =>
        setError("Couldn't load the review queue. Is the backend running?"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (item: ReviewItem) => {
    setEditingId(item.id);
    setEditText(item.edited_answer ?? item.draft_answer);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const act = async (id: number, fn: () => Promise<unknown>) => {
    if (busyId != null) return;
    setBusyId(id);
    try {
      await fn();
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (editingId === id) cancelEdit();
    } catch {
      setError("That action failed. Check the backend and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const approve = (item: ReviewItem) =>
    act(item.id, () => approveReview(item.id));

  const approveEdited = (item: ReviewItem) =>
    act(item.id, () => approveReview(item.id, editText));

  const reject = (item: ReviewItem) => {
    if (window.confirm("Reject this answer? It will not be delivered.")) {
      act(item.id, () => rejectReview(item.id));
    }
  };

  if (error && items.length === 0)
    return (
      <section className="section">
        <div className="container" style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: "1.25rem" }}>
            {error}
          </p>
          <button type="button" onClick={load} className="button button--solid">
            Retry
          </button>
        </div>
      </section>
    );

  const pendingCount = items.length;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "56rem" }}>
        <div className="section-intro">
          <span className="section-eyebrow">Compliance & Risk</span>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 3.8vw, 2rem)",
                            fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              marginBottom: "1rem",
            }}
          >
            Review queue.
          </h1>
          <p>
            Low-confidence or verification-failed answers wait here for human
            review before delivery. When enabled, every answer passes through
            this queue.
          </p>
          <div
            className="flex items-center gap-3"
            style={{ marginTop: "1.25rem" }}
          >
            <span className="chip">
              {pendingCount} pending
            </span>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="button button--ghost button--small"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: "var(--color-error)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-error)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
            }}
          >
            {error}
          </p>
        )}

        {loading && items.length === 0 ? (
          <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "3rem 0" }}>
            Loading review queue...
          </p>
        ) : items.length === 0 ? (
          <p
            style={{
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "3rem 0",
              fontSize: "0.9rem",
            }}
          >
            Nothing waiting for review.
          </p>
        ) : (
          items.map((item) => {
            const isBusy = busyId === item.id;
            const isEditing = editingId === item.id;
            const trace = traceSummary(item.trace);
            return (
              <article
                key={item.id}
                className="panel-card"
                style={{ marginBottom: "1rem" }}
              >
                <div style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--color-ink)" }}>
                  {item.query}
                </div>
                <div
                  className="flex flex-wrap items-center gap-2"
                  style={{ marginTop: "0.35rem", marginBottom: "1rem", fontSize: "0.78rem", color: "var(--color-muted)" }}
                >
                  <span>#{item.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.agent_type ?? "auto"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatConfidence(item.confidence)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="chip">{reasonLabel(item.reason)}</span>
                </div>

                {isEditing ? (
                  <textarea
                    className="input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    aria-label="Edited answer"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.82rem",
                      lineHeight: 1.6,
                      minHeight: "8rem",
                      resize: "vertical",
                      marginBottom: "1rem",
                    }}
                  />
                ) : (
                  <pre
                    style={{
                      maxHeight: "16rem",
                      overflow: "auto",
                      marginBottom: "1rem",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.draft_answer}
                  </pre>
                )}

                {item.citations.length > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        color: "var(--color-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Sources ({item.citations.length})
                    </div>
                    <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {item.citations.map((c, i) => {
                        const parsed = parseCitation(c);
                        return (
                          <li
                            key={i}
                            style={{
                              fontSize: "0.76rem",
                              color: "var(--color-muted)",
                            }}
                          >
                            {parsed.filename}, page {parsed.page}, line{" "}
                            {parsed.line}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}

                {item.trace.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--color-muted)" }}>
                      Pipeline: {trace.path.join(" -> ")} ({formatMs(trace.totalMs)})
                    </div>
                    <details style={{ marginTop: "0.25rem" }}>
                      <summary
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--color-muted)",
                          cursor: "pointer",
                          listStyle: "none",
                        }}
                      >
                        Node timing
                      </summary>
                      <ul
                        className="space-y-1"
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: "0.5rem 0 0",
                          fontSize: "0.76rem",
                          color: "var(--color-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.trace.map((t, i) => (
                          <li key={i} style={{ display: "flex", gap: "0.5rem" }}>
                            <span style={{ flex: 1 }}>{t.node}</span>
                            <span style={{ flexShrink: 0 }}>
                              · {formatMs(t.ms)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}

                <div
                  className="flex items-center justify-end gap-2"
                  style={{ marginTop: "0.25rem" }}
                >
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => approveEdited(item)}
                        disabled={isBusy}
                        className="button button--solid button--small"
                      >
                        {isBusy ? "Working…" : "Save approved edit"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isBusy}
                        className="button button--ghost button--small"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => approve(item)}
                        disabled={isBusy}
                        className="button button--solid button--small"
                      >
                        {isBusy ? "Working…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={isBusy}
                        className="button button--ghost button--small"
                      >
                        Edit & approve
                      </button>
                      <button
                        type="button"
                        onClick={() => reject(item)}
                        disabled={isBusy}
                        className="button button--ghost button--small"
                        style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
                      >
                        {isBusy ? "Working…" : "Reject"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
