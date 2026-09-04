import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChipList from "@/components/marketing/ChipList";
import MarketingProse from "@/components/marketing/MarketingProse";
import { getProject, getProjects } from "@/content/projects";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = getProject(params.slug);
  if (!project) return {};
  return {
    title: `${project.title} — Jonathan Simpson & Co.`,
    description: project.description,
  };
}

export default function WorkDetailPage({ params }: Props) {
  const project = getProject(params.slug);
  if (!project) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: project.title,
    description: project.description,
    datePublished: new Date(project.pubDate).toISOString(),
  };

  return (
    <div className="marketing-page">
      <article className="section">
        <div className="container">
          <div className="prose">
            <a href="/work" className="back-link">← Back to work</a>
            <header style={{ margin: "2rem 0 3rem" }}>
              <span className="section-eyebrow">{project.client}</span>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h1)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.1, margin: "0 0 1rem" }}>
                {project.title}
              </h1>
              <p style={{ color: "var(--color-muted)", marginTop: "0.5rem" }}>{project.description}</p>
              {project.tags.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <ChipList tags={project.tags} />
                </div>
              )}
            </header>
            <MarketingProse text={project.body} />
          </div>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
