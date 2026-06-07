import { NextResponse } from 'next/server';
import { buildSeoAnalyticsDashboard, importSeoAnalyticsMetrics, saveSeoAnalyticsMetric } from '@/core/seo/seo-analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await buildSeoAnalyticsDashboard(request, {
      search: url.searchParams.get('search') || '',
      pageType: url.searchParams.get('pageType') || 'all',
      status: url.searchParams.get('status') || 'all',
      source: url.searchParams.get('source') || 'all',
    });
    return NextResponse.json({ ok: true, source: 'internal-seo-analytics', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-analytics', error: error instanceof Error ? error.message : 'Failed to load SEO analytics.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'save');
    if (action === 'import') {
      const data = await importSeoAnalyticsMetrics(request, Array.isArray(body.rows) ? body.rows : []);
      return NextResponse.json({ ok: true, source: 'internal-seo-analytics', action, data });
    }
    const item = await saveSeoAnalyticsMetric(request, body.metric || body || {});
    return NextResponse.json({ ok: true, source: 'internal-seo-analytics', action: 'save', data: { item } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-analytics', error: error instanceof Error ? error.message : 'Failed to save SEO analytics.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
