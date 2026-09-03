export default function PitchBand() {
  return (
    <section
      className="section--tight"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(1.5rem, 4vw, 2.5rem)",
        textAlign: "center",
        marginTop: "clamp(2rem, 5vw, 3.5rem)",
      }}
    >
      <p className="section-eyebrow" style={{ marginBottom: "0.5rem" }}>Built by Jonathan Simpson &amp; Co.</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(1.3rem, 3vw, 1.8rem)", letterSpacing: "-0.01em", color: "var(--color-ink)", margin: "0 0 0.6rem" }}>
        This platform can be built for your firm.
      </h2>
      <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", maxWidth: "34rem", margin: "0 auto 1.4rem", lineHeight: 1.6 }}>
        We design, build, and deploy bespoke AI systems for regulated financial
        firms — grounded answers, human-in-the-loop review, and audit-ready
        trails, engineered around your documents and your regulators.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <a className="button button--solid" href="https://jonathansimpson.co/contact/">Start a project</a>
        <a className="button button--ghost" href="https://www.linkedin.com/company/jonathan-simpson-co">Talk on LinkedIn</a>
      </div>
    </section>
  );
}
