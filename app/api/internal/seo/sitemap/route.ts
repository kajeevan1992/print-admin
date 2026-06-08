import { NextResponse } from 'next/server';
import { buildSeoCrawlAudit, buildSitemapIndexXml, buildSitemapXml, type SitemapKind } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

function kindFrom(value: string | null): SitemapKind {
  if (value === 'products' || value === 'locations' || value === 'collections' || value === 'guides' || value === 'static' || value === 'all') return value;
  return 'all';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    if (view === 'index') {
      const data = await buildSitemapIndexXml(request);
      return NextResponse.json({ ok: true, source: 'internal-seo-sitemap-preview', view, data });
    }
    if (view === 'audit') {
      const data = await buildSeoCrawlAudit(request);
      return NextResponse.json({ ok: true, source: 'internal-seo-sitemap-preview', view, data });
    }
    const sitemap = await buildSitemapXml(request, kindFrom(url.searchParams.get('kind')));
    return NextResponse.json({ ok: true, source: 'internal-seo-sitemap-preview', view, data: sitemap });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-sitemap-preview', error: error instanceof Error ? error.message : 'Failed to build sitemap preview.' }, { status: 500 });
  }
}
