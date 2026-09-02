import type { APIRoute } from 'astro';
import { siteConfig } from '../data/siteConfig';

export const GET: APIRoute = () => {
  const txt = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /tickets/\n\nSitemap: ${siteConfig.siteUrl}/sitemap.xml`;
  return new Response(txt, { headers: { 'Content-Type': 'text/plain' } });
};
