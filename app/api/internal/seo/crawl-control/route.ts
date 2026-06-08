import { NextResponse } from 'next/server';
import { buildRobotsTxt, buildSeoCrawlAudit, buildSitemapIndexXml, buildSitemapXml, getSeoCrawlSettings, saveSeoCrawlSettings } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const [settings, robots, sitemapIndex, allSitemap, audit] = await Promise.all([
      getSeoCrawlSettings(request),
      buildRobotsTxt(request),
      buildSitemapIndexXml(request),
      buildSitemapXml(request, 'all'),
      buildSeoCrawlAudit(request),
    ]);
    return NextResponse.json({ ok: true, source: 'internal-seo-crawl-control', data: { settings, robots, sitemapIndex, allSitemap, audit } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-crawl-control', error: error instanceof Error ? error.message : 'Failed to load SEO crawl control.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveSeoCrawlSettings(request, body.settings || body || {});
    const [robots, sitemapIndex, audit] = await Promise.all([
      buildRobotsTxt(request),
      buildSitemapIndexXml(request),
      buildSeoCrawlAudit(request),
    ]);
    return NextResponse.json({ ok: true, source: 'internal-seo-crawl-control', data: { settings, robots, sitemapIndex, audit } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-crawl-control', error: error instanceof Error ? error.message : 'Failed to save SEO crawl control.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
