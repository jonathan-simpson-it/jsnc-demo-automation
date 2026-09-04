import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import ChipList from "@/components/marketing/ChipList";
import CtaBand from "@/components/marketing/CtaBand";
import { getProjects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Work — Jonathan Simpson & Co.",
  description: "Case studies from our work automating financial operations.",
};

export default function WorkPage() {
  const projects = getProjects();
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro
            eyebrow="Work"
            title="Case studies"
            description="We build systems that move money and manage risk."
          />
          <div className="grid-blog">
            {projects.map((p) => (
              <a key={p.slug} href={`/work/${p.slug}`} className="marketing-card-link">
                <div className="panel-card">
                  <span className="section-eyebrow">{p.client}</span>
                  <h3 style={{ margin: "0.5rem 0 0.75rem" }}>{p.title}</h3>
                  <p style={{ margin: "0 0 1rem" }}>{p.description}</p>
                  <ChipList tags={p.tags} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </div>
  );
}
