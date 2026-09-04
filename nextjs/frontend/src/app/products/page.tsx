import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import ChipList from "@/components/marketing/ChipList";
import CtaBand from "@/components/marketing/CtaBand";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "Products — Jonathan Simpson & Co.",
  description: "Software products for financial operations.",
};

export default function ProductsPage() {
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro
            eyebrow="Products"
            title="What we've built"
            description="Software tools born from real client work."
          />
          <div className="grid-services">
            {siteConfig.products.map((p) => (
              <div className="panel-card" key={p.title}>
                <span className="section-eyebrow">{p.status}</span>
                <h3 style={{ margin: 0 }}>{p.title}</h3>
                <p style={{ margin: "0.75rem 0 1rem" }}>{p.description}</p>
                <ChipList tags={p.tags} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </div>
  );
}
