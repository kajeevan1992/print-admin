import { NextResponse } from 'next/server';
import { listSeoPages, saveSeoPage, seedSeoPages } from '@/core/seo/seo-engine.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listSeoPages(request, {
      status: url.searchParams.get('status') || 'all',
      pageType: url.searchParams.get('pageType') || 'all',
      search: url.searchParams.get('search') || '',
    });
    return NextResponse.json({ ok: true, source: 'internal-seo-pages', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-pages', error: error instanceof Error ? error.message : 'Failed to load SEO pages.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (String(body.action || '') === 'seed') {
      const items = await seedSeoPages(request);
      return NextResponse.json({ ok: true, source: 'internal-seo-pages', action: 'seed', data: { items, count: items.length } });
    }
    const item = await saveSeoPage(request, body || {});
    return NextResponse.json({ ok: true, source: 'internal-seo-pages', data: { item } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-pages', error: error instanceof Error ? error.message : 'Failed to save SEO page.' }, { status: 500 });
  }
}
