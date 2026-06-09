import { NextResponse } from 'next/server';
import { applyInternalLinkSuggestions, buildInternalLinkingDashboard } from '@/core/seo/internal-linking.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await buildInternalLinkingDashboard(request, {
      status: url.searchParams.get('status') || 'all',
      pageType: url.searchParams.get('pageType') || 'all',
      search: url.searchParams.get('search') || '',
      minScore: Number(url.searchParams.get('minScore') || 55),
      limit: Number(url.searchParams.get('limit') || 6),
    });
    return NextResponse.json({ ok: true, source: 'internal-seo-internal-links', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-internal-links', error: error instanceof Error ? error.message : 'Failed to build internal link suggestions.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'apply');
    if (action === 'preview') {
      const data = await buildInternalLinkingDashboard(request, body.filters || body || {});
      return NextResponse.json({ ok: true, source: 'internal-seo-internal-links', action, data });
    }
    const data = await applyInternalLinkSuggestions(request, body.apply || body || {});
    return NextResponse.json({ ok: true, source: 'internal-seo-internal-links', action: 'apply', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-internal-links', error: error instanceof Error ? error.message : 'Failed to apply internal link suggestions.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
