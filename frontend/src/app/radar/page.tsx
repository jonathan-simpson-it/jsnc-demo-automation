"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchRegulatoryFeed,
  fetchRegulatoryStatus,
  pollRegulatory,
} from "@/lib/api";
import type { RegulatoryFeedItem, RegulatoryState } from "@/lib/types";
import RegulatorMark from "@/components/RegulatorMark";

function relativeWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const SFC_SECTION_LABEL: Record<string, string> = {
  news: "News",
  "policy statement": "Policy statements",
  "high shareholding": "High shareholding",
  event: "Events",
};

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
        <div className="container text-center py-12">
          <p className="text-neutral-500 mb-5 text-sm">
            Couldn't load the regulatory feed. Is the backend running?
          </p>
          <button type="button" onClick={load} className="button button--solid">
            Retry
          </button>
        </div>
      </section>
    );

  const busy = polling || !!state?.running;
  const rows = items ?? [];

  // Split the feed into the two regulator columns, preserving feed order.
  const sfcRows = rows.filter((i) => i.regulator === "SFC");
  const hkmaRows = rows.filter((i) => i.regulator === "HKMA");

  // SFC renders as its hub sections (news, policy statements, high
  // shareholding, events). Buckets keep first-seen (feed) order.
  function sfcSegments(): { label: string; items: RegulatoryFeedItem[] }[] {
    const buckets: { label: string; items: RegulatoryFeedItem[] }[] = [];
    const index = new Map<string, number>();
    for (const it of sfcRows) {
      const kind = it.kind || "news";
      const label = SFC_SECTION_LABEL[kind] || kind;
      let idx = index.get(kind);
      if (idx === undefined) {
        idx = buckets.length;
        index.set(kind, idx);
        buckets.push({ label, items: [] });
      }
      buckets[idx].items.push(it);
    }
    return buckets;
  }
  const sfcSegmentsList = sfcSegments();

  const sfcError = state?.last_status === "error";
  const dotColor = busy
    ? "bg-amber-400"
    : sfcError
      ? "bg-red-500"
      : "bg-emerald-500";

  const statusPill = (status?: string) => {
    if (status === "ingested")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "error")
      return "bg-red-50 text-red-600 border-red-200";
    return "bg-neutral-100 text-neutral-500 border-neutral-200";
  };

  function ColumnHeader({
    code,
    title,
    count,
  }: {
    code: string;
    title: string;
    count: number;
  }) {
    return (
      <div className="sticky top-14 z-10 -mx-4 px-4 py-3 backdrop-blur bg-neutral-50/85 border-b border-neutral-200 flex items-center gap-3">
        <RegulatorMark code={code} size={32} withName />
        <div className="min-w-0 flex-1">
          <div className="text-[0.95rem] font-bold text-neutral-900 tracking-tight leading-tight">
            {title}
          </div>
          <div className="text-xs text-neutral-400">
            Official circulars &amp; news
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 tabular-nums">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  function FeedCard({ item }: { item: RegulatoryFeedItem }) {
    return (
      <article className="group bg-white border border-neutral-200 rounded-lg p-4 transition hover:border-neutral-300 hover:shadow-sm">
        <h4 className="m-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.92rem] leading-snug font-semibold text-neutral-900 hover:text-neutral-950 inline-flex items-start gap-1.5"
          >
            <span className="overflow-hidden">{item.title}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-1 text-neutral-300 group-hover:text-neutral-900"
              aria-hidden="true"
            >
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </h4>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 capitalize">
            {item.kind}
          </span>
          <span className="text-xs text-neutral-400">{fmtDate(item.issued_at)}</span>
          <span className="flex-1" />
          <span className="text-xs text-neutral-400 tabular-nums">
            {item.chunks} chunk{item.chunks === 1 ? "" : "s"}
          </span>
          {!item.summary && (
            <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              Pending impact
            </span>
          )}
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium capitalize ${statusPill(item.status)}`}
          >
            {item.status}
          </span>
        </div>
        {item.summary && (
          <p
            className="mt-2 mb-0 text-sm leading-relaxed text-neutral-500"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.summary}
          </p>
        )}
      </article>
    );
  }

  return (
    <section className="section">
      <div className="container">
        {/* Hero */}
        <div className="mb-6">
          <span className="section-eyebrow">Compliance &amp; Risk</span>
          <h1 className="mt-1 mb-2 text-2xl font-semibold tracking-tight text-neutral-900">
            Regulatory radar.
          </h1>
          <p className="mb-0 text-sm text-neutral-500 max-w-2xl leading-relaxed">
            Live SFC and HKMA circulars, ingested into the knowledge base with
            recency-weighted retrieval, grounded in today's guidance.
          </p>
        </div>

        {/* Utility row */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-neutral-600">
            <span
              className={`h-2 w-2 rounded-full ${dotColor} animate-pulse`}
              aria-hidden="true"
            />
            {busy ? (
              <span className="font-medium text-neutral-700">Syncing…</span>
            ) : (
              <span className="font-medium text-neutral-700">
                Updated{" "}
                {relativeWhen(state?.last_run || null) || "never"}
              </span>
            )}
          </span>
          <span className="text-xs text-neutral-400">
            {state?.last_status ?? "idle"}
          </span>
          {state?.last_error && (
            <span className="text-xs text-red-500 break-all">
              last error: {state.last_error}
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60"
            disabled={busy}
            onClick={checkNow}
          >
            {busy ? "Checking…" : "Sync / Check now"}
          </button>
        </div>

        {loading && (
          <p className="py-12 text-center text-sm text-neutral-400">
            Loading regulatory feed...
          </p>
        )}

        {!loading && rows.length === 0 && (
          <p className="py-12 text-center text-sm text-neutral-400">
            Nothing on the radar yet. Run Sync / Check now to fetch the latest
            circulars.
          </p>
        )}

        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* SFC column */}
            <div className="min-w-0">
              <ColumnHeader
                code="SFC"
                title="SFC Circulars & News"
                count={sfcRows.length}
              />
              <div className="mt-4 space-y-4">
                {sfcSegmentsList.map((seg) => (
                  <div key={seg.label}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      {seg.label} · {seg.items.length}
                    </div>
                    <div className="space-y-3">
                      {seg.items.map((item) => (
                        <FeedCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HKMA column */}
            <div className="min-w-0">
              <ColumnHeader
                code="HKMA"
                title="HKMA Circulars & News"
                count={hkmaRows.length}
              />
              <div className="mt-4 space-y-3">
                {hkmaRows.map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

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
