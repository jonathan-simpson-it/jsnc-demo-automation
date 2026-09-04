import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import ChipList from "@/components/marketing/ChipList";
import CtaBand from "@/components/marketing/CtaBand";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "Services — Jonathan Simpson & Co.",
  description: "Strategy, design, and engineering for companies that move money.",
};

export default function ServicesPage() {
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro
            eyebrow="Services"
            title="What we do"
            description="Three phases. One team. From strategy to production."
          />
          <div style={{ display: "grid", gap: "2rem" }}>
            {siteConfig.services.map((s, i) => (
              <div className="panel-card" key={s.title}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                  <div>
                    <span className="section-eyebrow">Phase {String(i + 1).padStart(2, "0")}</span>
                    <h3 style={{ fontSize: "var(--text-h2)", fontFamily: "var(--font-display)", fontWeight: 400, margin: "0 0 1rem" }}>
                      {s.title}
                    </h3>
                    <p style={{ margin: "0 0 1.5rem" }}>{s.description}</p>
                    <ChipList tags={s.tags} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 1rem" }}>
                      Includes
                    </h4>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {s.details.map((d) => (
                        <li key={d} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--color-line)", color: "var(--color-muted)" }}>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </div>
  );
}
