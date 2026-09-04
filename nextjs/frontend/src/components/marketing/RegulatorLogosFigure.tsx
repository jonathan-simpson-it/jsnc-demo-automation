/** Regulator logo marks used in the "Building Compliance" post. Logos belong
    to their owners and identify official sources. */
export default function RegulatorLogosFigure() {
  return (
    <figure
      style={{
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        margin: "2rem 0",
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        flexWrap: "wrap",
      }}
    >
      <a href="https://www.sfc.hk/en/" target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pictures/sfc-logo.svg"
          alt="Securities and Futures Commission (SFC) logo"
          style={{ height: 36, width: "auto", background: "#fff", borderRadius: 6, padding: "4px 8px", border: "1px solid var(--color-line)" }}
        />
      </a>
      <a href="https://www.hkma.gov.hk/eng/" target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pictures/hkma-logo.png"
          alt="Hong Kong Monetary Authority (HKMA) logo"
          style={{ height: 36, width: "auto", background: "#fff", borderRadius: 6, padding: "4px 8px", border: "1px solid var(--color-line)" }}
        />
      </a>
      <figcaption
        style={{ fontSize: "0.8rem", color: "var(--color-muted)", lineHeight: 1.5, flex: 1, minWidth: "12rem" }}
      >
        We build compliance-first systems against the standards these regulators
        publish. Logos belong to their owners and identify official sources.
      </figcaption>
    </figure>
  );
}
