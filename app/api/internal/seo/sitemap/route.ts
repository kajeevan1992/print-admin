import { NextResponse } from 'next/server';
import { getSitemapSeoPages } from '@/core/seo/seo-engine.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const urls = await getSitemapSeoPages(request);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${item.loc}</loc><lastmod>${item.lastmod}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`).join('\n')}\n</urlset>`;
    return NextResponse.json({ ok: true, source: 'internal-seo-sitemap-preview', data: { urls, count: urls.length, xml } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-sitemap-preview', error: error instanceof Error ? error.message : 'Failed to build sitemap preview.' }, { status: 500 });
  }
}
