import type { CSSProperties, ReactNode } from "react";

interface Props {
  text: string;
}

/** "regulatory_deadline" -> "Regulatory deadline" */
function humanLabel(key: string): string {
  const words = key.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : words;
}

const BOLD_RE = /\*\*(.+?)\*\*/g;

/**
 * Renders model text with lightweight inline formatting: `**bold**` becomes
 * <strong>, everything else stays plain text (React escapes, so this is safe).
 * Unmatched asterisks are left untouched rather than dropped.
 */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(BOLD_RE.source, "g");
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <strong key={`b${key++}`} style={{ fontWeight: 600 }}>
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length > 0 ? nodes : [text];
}

function scalarText(value: string | number | boolean): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : String(value);
}

const scalarStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.88rem",
  lineHeight: 1.6,
  color: "var(--color-ink)",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  // Override the global 40rem paragraph cap so answers fill their card
  // instead of wrapping early and leaving a large empty gutter.
  maxWidth: "none",
};

const rowLabelStyle: CSSProperties = {
  fontSize: "0.66rem",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
};

/**
 * Renders a JSON agent answer as readable sections instead of a raw blob:
 * object keys become labeled sections, string arrays become bullet lists,
 * and nested objects become label/value rows. Non-JSON text falls back to a
 * plain pre-wrapped paragraph.
 */
export default function StructuredOutput({ text }: Props) {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not JSON — plain text below */
  }

  const isRecord =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  const entries = isRecord
    ? Object.entries(parsed as Record<string, unknown>)
    : [];

  // Fallback: plain text (also covers scalar/array JSON, which reads fine raw)
  if (!isRecord || entries.length === 0) {
    return (
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {text}
      </div>
    );
  }

  const renderValue = (value: unknown, depth: number): ReactNode | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      return value.trim() === "" ? null : <p style={scalarStyle}>{renderInline(value)}</p>;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return <p style={scalarStyle}>{scalarText(value)}</p>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      const allScalars = value.every(
        (v) =>
          v === null ||
          v === undefined ||
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean",
      );
      if (allScalars) {
        const items = value.filter(
          (v) =>
            v !== null &&
            v !== undefined &&
            (typeof v !== "string" || v.trim() !== ""),
        );
        if (items.length === 0) return null;
        return (
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.15rem",
              display: "grid",
              gap: "0.3rem",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              color: "var(--color-ink)",
            }}
          >
            {items.map((item, i) => (
              <li key={i} style={{ overflowWrap: "anywhere" }}>
                {renderInline(scalarText(item as string | number | boolean))}
              </li>
            ))}
          </ul>
        );
      }
      // Mixed / structured items: render each on its own block
      return (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {value.map((item, i) => {
            const body = renderValue(item, depth + 1);
            return body === null ? null : (
              <div
                key={i}
                style={{
                  padding: "0.55rem 0.7rem",
                  border: "1px solid var(--color-line)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg)",
                }}
              >
                {body}
              </div>
            );
          })}
        </div>
      );
    }
    // Nested object: label/value rows
    const rows = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => {
        const body = renderValue(val, depth + 1);
        return body === null ? null : (
          <div key={key} style={{ display: "grid", gap: "0.2rem" }}>
            <span style={rowLabelStyle}>{humanLabel(key)}</span>
            {body}
          </div>
        );
      },
    );
    if (rows.every((r) => r === null)) return null;
    return (
      <div style={{ display: "grid", gap: "0.55rem" }}>{rows}</div>
    );
  };

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      {entries.map(([key, value]) => {
        const body = renderValue(value, 0);
        if (body === null) return null;
        return (
          <div key={key} style={{ display: "grid", gap: "0.35rem" }}>
            <h4
              style={{
                margin: 0,
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
              }}
            >
              {humanLabel(key)}
            </h4>
            {body}
          </div>
        );
      })}
    </div>
  );
}
