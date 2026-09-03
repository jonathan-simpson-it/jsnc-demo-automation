"use client";
import { useState } from "react";
import { parseCitation } from "@/lib/utils";

const DEFAULT_PREVIEW = 3;

interface Props {
  citations: string[];
  /** How many sources to show before the "show more" toggle appears. */
  previewCount?: number;
}

export default function CitationList({
  citations,
  previewCount = DEFAULT_PREVIEW,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const total = citations.length;
  if (total === 0) return null;

  const shown = expanded ? citations : citations.slice(0, previewCount);
  const hasMore = total > previewCount;

  return (
    <div style={{ display: "grid", gap: "0.2rem" }}>
      {shown.map((c, i) => {
        const p = parseCitation(c);
        return (
          <div
            key={i}
            style={{
              fontSize: "0.76rem",
              color: "var(--color-muted)",
              display: "flex",
              gap: "0.45rem",
            }}
          >
            <span style={{ flexShrink: 0 }}>{i + 1}.</span>
            <span style={{ overflowWrap: "anywhere", minWidth: 0 }}>
              {p.filename}, page {p.page}, line {p.line}
            </span>
          </div>
        );
      })}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            justifySelf: "start",
            marginTop: "0.1rem",
            padding: "0.15rem 0",
            background: "none",
            border: "none",
            fontSize: "0.76rem",
            fontWeight: 600,
            color: "var(--color-accent)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {expanded ? "Show fewer" : `Show all ${total} sources`}
        </button>
      )}
    </div>
  );
}
