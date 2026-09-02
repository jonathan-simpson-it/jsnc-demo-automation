import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig } from '../data/siteConfig';

export const GET: APIRoute = async () => {
  const blog = (await getCollection('blog')).filter(p => !p.data.draft);
  const projects = (await getCollection('projects')).filter(p => !p.data.draft);
  const staticPages = ['/', '/services/', '/work/', '/blog/', '/products/', '/applications/', '/contact/', '/support/'];
  const allPages = [...staticPages, ...blog.map(p => `/blog/${p.id}/`), ...projects.map(p => `/work/${p.id}/`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allPages.map(p => `  <url>\n    <loc>${siteConfig.siteUrl}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
