import type { Metadata } from "next";
import SectionIntro from "@/components/marketing/SectionIntro";
import ChipList from "@/components/marketing/ChipList";
import CtaBand from "@/components/marketing/CtaBand";
import { getBlogPosts } from "@/content/blog";
import { formatLongDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Blog — Jonathan Simpson & Co.",
  description: "Insights on technology, strategy, and operations for financial institutions.",
};

export default function BlogPage() {
  const posts = getBlogPosts();
  return (
    <div className="marketing-page">
      <section className="section">
        <div className="container">
          <SectionIntro
            eyebrow="Blog"
            title="Writing"
            description="Thoughts on building technology for financial institutions."
          />
          {posts.length > 0 ? (
            <div className="grid-blog">
              {posts.map((post) => (
                <a key={post.slug} href={`/blog/${post.slug}`} className="marketing-card-link">
                  <div className="panel-card">
                    <time className="section-eyebrow" dateTime={new Date(post.pubDate).toISOString()}>
                      {formatLongDate(post.pubDate)}
                    </time>
                    <h3 style={{ margin: "0.5rem 0 0.75rem" }}>{post.title}</h3>
                    <p style={{ margin: "0 0 1rem" }}>{post.description}</p>
                    {post.tags.length > 0 && <ChipList tags={post.tags} />}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: "center", padding: "4rem 0", color: "var(--color-muted)" }}>
              No posts yet. Check back soon.
            </p>
          )}
        </div>
      </section>
      <CtaBand />
    </div>
  );
}
