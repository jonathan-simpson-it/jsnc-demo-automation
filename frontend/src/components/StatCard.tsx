interface StatCardProps {
  value: string;
  label: string;
}

/**
 * Metric stat card: single-line tabular number over a small uppercase label.
 * Value never wraps; a pathological long value degrades to an ellipsis
 * instead of breaking the card layout.
 */
export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div
      className="panel-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        minHeight: "7.5rem",
        padding: "1.25rem 1rem",
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          fontSize: "clamp(1.6rem, 3.2vw, 2rem)",
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "var(--color-ink)",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--color-muted)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
