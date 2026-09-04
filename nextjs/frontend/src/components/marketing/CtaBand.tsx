import { siteConfig } from "@/content/site";

export default function CtaBand() {
  const { headline, description, buttonText, buttonHref } = siteConfig.cta;
  return (
    <section className="cta-band marketing-cta">
      <div className="container">
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-h2)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            color: "var(--color-surface)",
            margin: "0 0 1rem",
          }}
        >
          {headline}
        </h2>
        <p>{description}</p>
        <a className="button button--ghost" href={buttonHref}>
          {buttonText}
        </a>
      </div>
    </section>
  );
}
