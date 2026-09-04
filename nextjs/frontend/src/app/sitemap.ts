import type { MetadataRoute } from "next";
import { siteConfig } from "@/content/site";
import { getBlogPosts } from "@/content/blog";
import { getProjects } from "@/content/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/services", "/work", "/blog", "/products", "/applications", "/contact", "/support"];
  const entries: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${siteConfig.siteUrl}${p}`,
    changeFrequency: "weekly",
    priority: p === "/" ? 1 : 0.8,
  }));
  for (const post of getBlogPosts()) {
    entries.push({ url: `${siteConfig.siteUrl}/blog/${post.slug}`, changeFrequency: "weekly", priority: 0.8 });
  }
  for (const project of getProjects()) {
    entries.push({ url: `${siteConfig.siteUrl}/work/${project.slug}`, changeFrequency: "weekly", priority: 0.8 });
  }
  return entries;
}
