import { NextResponse } from 'next/server';
import { buildSitemapIndexXml, buildSitemapXml } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const sitemap = await buildSitemapIndexXml(request);
    return new NextResponse(sitemap.xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    const fallback = await buildSitemapXml(request).catch(() => ({ xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n` }));
    return new NextResponse(fallback.xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
}
