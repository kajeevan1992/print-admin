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
    const action = String(body.action || '');

    if (action === 'seed') {
      const items = await seedSeoPages(request);
      return NextResponse.json({ ok: true, source: 'internal-seo-pages', action: 'seed', data: { items, count: items.length } });
    }

    if (action === 'bulk-update') {
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      const updates = (body.updates && typeof body.updates === 'object' ? body.updates : {}) as Record<string, any>;
      if (!ids.length) return NextResponse.json({ ok: false, source: 'internal-seo-pages', error: 'Bulk update requires at least one SEO page id.' }, { status: 400 });
      const all = await listSeoPages(request, { status: 'all' });
      const selected = all.items.filter((item) => ids.includes(item.id));
      const saved = [];
      for (const page of selected) {
        const next = {
          ...page,
          ...updates,
          metadata: updates.metadata ? { ...(page.metadata || {}), ...updates.metadata } : page.metadata,
        };
        saved.push(await saveSeoPage(request, next));
      }
      return NextResponse.json({ ok: true, source: 'internal-seo-pages', action: 'bulk-update', data: { items: saved, count: saved.length } });
    }

    const item = await saveSeoPage(request, body || {});
    return NextResponse.json({ ok: true, source: 'internal-seo-pages', data: { item } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-pages', error: error instanceof Error ? error.message : 'Failed to save SEO page.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function PATCH(request: Request) {
  return POST(request);
}
