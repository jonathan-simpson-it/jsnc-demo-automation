import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import ChipList from "@/components/marketing/ChipList";
import CtaBand from "@/components/marketing/CtaBand";
import { siteConfig } from "@/content/site";

export const metadata: Metadata = {
  title: "Applications — Jonathan Simpson & Co.",
  description: "Interactive applications built on our PE AI Platform.",
};

export default function ApplicationsPage() {
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro
            eyebrow="Applications"
            title="Interactive tools"
            description="Every application below runs live — we'll walk you through it on your own documents."
          />
          <div className="grid-services">
            {siteConfig.applications.map((a) => (
              <div className="panel-card" key={a.title}>
                <h3 style={{ margin: 0 }}>{a.title}</h3>
                <p style={{ margin: "0.75rem 0 1rem" }}>{a.description}</p>
                <ChipList tags={a.tags} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </div>
  );
}
