import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketingProse from "@/components/marketing/MarketingProse";
import { getBlogPost, getBlogPosts } from "@/content/blog";
import { formatLongDate } from "@/lib/dates";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — Jonathan Simpson & Co.`,
    description: post.description,
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.pubDate).toISOString(),
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Jonathan Simpson & Co." },
  };

  return (
    <div className="marketing-page">
      <article className="section">
        <div className="container">
          <div className="prose">
            <a href="/blog" className="back-link">← Back to blog</a>
            <header style={{ margin: "2rem 0 3rem" }}>
              <time className="section-eyebrow" dateTime={new Date(post.pubDate).toISOString()}>
                {formatLongDate(post.pubDate)}
              </time>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h1)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.1, margin: "0 0 1rem" }}>
                {post.title}
              </h1>
              <p style={{ color: "var(--color-muted)", marginTop: "0.5rem" }}>By {post.author}</p>
            </header>
            <MarketingProse text={post.body} />
          </div>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
