"use client";
import { useState } from "react";
import { parseCitation } from "@/lib/utils";
import RegulatorMark from "@/components/RegulatorMark";
import { regulatorForFilename } from "@/lib/regulators";

const DEFAULT_PREVIEW = 3;

interface Props {
  citations: string[];
  /** How many sources to show before the "show more" toggle appears. */
  previewCount?: number;
}

function CitationRow({ index, citation }: { index: number; citation: string }) {
  const p = parseCitation(citation);
  const meta = regulatorForFilename(p.filename);
  return (
    <div
      style={{
        fontSize: "0.76rem",
        color: "var(--color-muted)",
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
      }}
    >
      <span style={{ flexShrink: 0 }}>{index + 1}.</span>
      {meta && (
        <span style={{ display: "inline-flex", flexShrink: 0 }}>
          <RegulatorMark code={meta.code} size={12} link={false} />
        </span>
      )}
      <span style={{ overflowWrap: "anywhere", minWidth: 0 }}>
        {p.filename}, page {p.page}, line {p.line}
      </span>
    </div>
  );
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
      {shown.map((c, i) => (
        <CitationRow key={i} index={i} citation={c} />
      ))}
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
