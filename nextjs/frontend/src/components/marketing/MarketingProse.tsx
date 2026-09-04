import type { ReactNode } from "react";
import RegulatorLogosFigure from "./RegulatorLogosFigure";

const BOLD_RE = /\*\*(.+?)\*\*/g;
const ITALIC_RE = /_([^_]+)_/g;

function renderInline(raw: string, keyBase = "x"): ReactNode {
  const nodes: ReactNode[] = [];
  const re = new RegExp(BOLD_RE.source, "g");
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last)
      nodes.push(renderItalic(raw.slice(last, m.index), `${keyBase}i${key}`));
    nodes.push(
      <strong key={`${keyBase}b${key++}`}>{renderItalic(m[1], `${keyBase}ib`)}</strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push(renderItalic(raw.slice(last), `${keyBase}t${key}`));
  return nodes.length ? nodes : [renderItalic(raw, `${keyBase}o`)];
}

function renderItalic(raw: string, keyBase: string): ReactNode {
  const parts = raw.split(ITALIC_RE);
  if (parts.length === 1) return raw;
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) out.push(<em key={`${keyBase}${i}`}>{part}</em>);
    else if (part) out.push(part);
  });
  return out.length ? <>{out}</> : raw;
}

function parseTable(lines: string[]): string[][] {
  const cells = (line: string) =>
    line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const rows: string[][] = [];
  for (const line of lines) {
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")) continue;
    rows.push(cells(line));
  }
  return rows;
}

/** Renders the markdown bodies stored in frontend/src/content/. */
export default function MarketingProse({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("[[regulator-logos]]")) {
      blocks.push(<RegulatorLogosFigure key={`fig${key++}`} />);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2${key++}`} style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h2)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.2, margin: "2.5rem 0 1rem", color: "var(--color-ink)" }}>
          {renderInline(line.slice(3), `h2${key}`)}
        </h2>,
      );
      i++;
      continue;
    }
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
          <div key={`t${key++}`} style={{ overflowX: "auto", margin: "1.5rem 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr>
                  {head.map((c, ci) => (
                    <th key={ci} style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-ink)", color: "var(--color-ink)", fontWeight: 600 }}>
                      {renderInline(c, `th${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td key={ci} style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-line)", verticalAlign: "top" }}>
                        {renderInline(c, `td${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }
    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(
          <li key={`li${key++}`} style={{ marginBottom: "0.5rem" }}>
            {renderInline(lines[i].trim().slice(2), `li${key}`)}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ul key={`ul${key++}`} style={{ paddingLeft: "1.5rem", margin: "0 0 1.25rem" }}>
          {items}
        </ul>,
      );
      continue;
    }
    blocks.push(
      <p key={`p${key++}`} style={{ margin: "0 0 1.25rem" }}>
        {renderInline(line, `p${key}`)}
      </p>,
    );
    i++;
  }

  return <div className="prose">{blocks}</div>;
}
