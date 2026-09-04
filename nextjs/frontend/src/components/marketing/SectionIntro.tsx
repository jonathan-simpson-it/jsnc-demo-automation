interface Props {
  eyebrow: string;
  title: string;
  description?: string;
}

export default function SectionIntro({ eyebrow, title, description }: Props) {
  return (
    <div className="section-intro">
      <span className="section-eyebrow">{eyebrow}</span>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-h2)",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          margin: "0 0 1rem",
        }}
      >
        {title}
      </h2>
      {description && <p>{description}</p>}
    </div>
  );
}
