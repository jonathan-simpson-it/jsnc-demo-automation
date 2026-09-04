"use client";

import type { ReactNode } from "react";

interface Props {
  /** Markdown produced by the summary generator. */
  text: string;
  /** Optional caption above the preview. */
  caption?: string;
}

const BOLD_RE = /\*\*(.+?)\*\*/g;
const ITALIC_RE = /_([^_]+)_/g;

function renderInline(raw: string, keyBase = "x"): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(BOLD_RE.source, "g");
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) nodes.push(renderItalic(raw.slice(last, m.index), `${keyBase}i${key}`));
    nodes.push(
      <strong key={`${keyBase}b${key++}`} style={{ fontWeight: 600 }}>
        {renderItalic(m[1], `${keyBase}ib${key}`)}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push(renderItalic(raw.slice(last), `${keyBase}t${key}`));
  return nodes.length ? nodes : [renderItalic(raw, `${keyBase}o`)];
}

/** Meta continuation lines ("· _agent_ | 91% confidence | ts"). */
function renderMeta(raw: string): ReactNode {
  const cleaned = raw
    .trim()
    .replace(/^·\s*/, "")
    .replace(/\s*\|\s*/g, " · ")
    .replace(/_([A-Za-z0-9_-]+)_/g, "$1")
    .replace(/_/g, " ");
  return renderInline(cleaned, "meta");
}

function renderItalic(raw: string, keyBase: string): ReactNode {
  const parts = raw.split(ITALIC_RE);
  if (parts.length === 1) return raw;
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out.push(<em key={`${keyBase}${i}`}>{part}</em>);
    } else if (part) {
      out.push(part);
    }
  });
  return out.length ? <>{out}</> : raw;
}

function parseTable(lines: string[]): string[][] {
  const cells = (line: string) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const rows: string[][] = [];
  for (const line of lines) {
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")) continue;
    rows.push(cells(line));
  }
  return rows;
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--color-accent)",
  margin: "1.25rem 0 0.55rem",
};

export default function EmailPreview({ text, caption }: Props) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("---")) {
      blocks.push(
        <div key={`sep${key++}`} style={{ borderTop: "1px solid var(--color-line)", margin: "1rem 0" }} />,
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1${key++}`} style={{ fontSize: "1.15rem", fontWeight: 600, letterSpacing: "-0.01em", margin: "0.25rem 0 0.35rem" }}>
          {renderInline(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2${key++}`} style={sectionTitle}>
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }
    // Table: consecutive | lines
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTable(tableLines);
      if (rows.length) {
        const [head, ...body] = rows;
        blocks.push(
          <table
            key={`t${key++}`}
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", margin: "0.2rem 0 0.4rem" }}
          >
            <thead>
              <tr>
                {head.map((c, ci) => (
                  <th key={ci} style={{ textAlign: "left", padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--color-ink)", color: "var(--color-ink)", fontWeight: 600 }}>
                    {renderInline(c, `th${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td key={ci} style={{ padding: "0.32rem 0.5rem", borderBottom: "1px solid var(--color-line)", verticalAlign: "top" }}>
                      {renderInline(c, `td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>,
        );
      }
      continue;
    }
    // Numbered or bulleted list
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    const bullet = line.match(/^-\s+(.*)$/);
    if (num || bullet) {
      const ordered: ReactNode[] = [];
      while (i < lines.length) {
        const cur = lines[i].trimEnd();
        const nm = cur.match(/^(\d+)\.\s+(.*)$/);
        const bm = cur.match(/^-\s+(.*)$/);
        if (!nm && !bm && !cur.startsWith("   ") && cur.trim()) break;
        if (nm || bm) {
          ordered.push(
            <li key={`li${key++}`} style={{ marginBottom: "0.3rem" }}>
              {renderInline((nm ? nm[2] : bm![1]))}
              {i + 1 < lines.length && /^\s{2,}·/.test(lines[i + 1]) ? (
                <div style={{ color: "var(--color-muted)", fontSize: "0.78rem", marginTop: "0.1rem" }}>
                  {renderMeta(lines[i + 1])}
                </div>
              ) : null}
            </li>,
          );
          if (i + 1 < lines.length && /^\s{2,}·/.test(lines[i + 1])) i++;
        } else if (cur.trim()) {
          ordered.push(
            <li key={`li${key++}`} style={{ marginBottom: "0.3rem", color: "var(--color-muted)", fontSize: "0.82rem" }}>
              {renderInline(cur.trim())}
            </li>,
          );
        }
        i++;
      }
      blocks.push(
        <ul key={`ul${key++}`} style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
          {ordered}
        </ul>,
      );
      continue;
    }
    // Plain paragraph
    blocks.push(
      <p key={`p${key++}`} style={{ margin: "0.3rem 0 0.5rem", fontSize: "0.88rem", lineHeight: 1.65, overflowWrap: "anywhere" }}>
        {renderInline(line, `p${key}`)}
      </p>,
    );
    i++;
  }

  return (
    <div className="panel-card" style={{ padding: "1.1rem 1.2rem", overflowX: "auto" }}>
      {caption && (
        <div style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "0.5rem" }}>
          {caption}
        </div>
      )}
      <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-line)", borderRadius: "var(--radius-md)", padding: "1rem 1.1rem" }}>
        {blocks}
      </div>
    </div>
  );
}
