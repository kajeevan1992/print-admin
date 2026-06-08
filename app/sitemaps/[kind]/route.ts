import { NextResponse } from 'next/server';
import { buildSitemapXml, type SitemapKind } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

function normaliseKind(value: string): SitemapKind {
  const clean = String(value || '').replace(/\.xml$/i, '');
  if (clean === 'products' || clean === 'product') return 'products';
  if (clean === 'locations' || clean === 'location') return 'locations';
  if (clean === 'collections' || clean === 'collection-points' || clean === 'collection') return 'collections';
  if (clean === 'guides' || clean === 'guide') return 'guides';
  if (clean === 'static' || clean === 'pages') return 'static';
  return 'all';
}

export async function GET(request: Request, context: { params: { kind: string } }) {
  try {
    const kind = normaliseKind(context.params.kind);
    const sitemap = await buildSitemapXml(request, kind);
    return new NextResponse(sitemap.xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
    return new NextResponse(fallback, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
}
