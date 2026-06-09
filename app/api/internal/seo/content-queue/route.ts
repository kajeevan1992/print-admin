import { NextResponse } from 'next/server';
import { applyContentImprovementQuickFix, buildContentImprovementQueue, updateContentImprovementTaskStatus } from '@/core/seo/content-improvement-queue.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await buildContentImprovementQueue(request, {
      search: url.searchParams.get('search') || '',
      pageType: url.searchParams.get('pageType') || 'all',
      status: url.searchParams.get('status') || 'all',
      source: url.searchParams.get('source') || 'all',
      taskStatus: url.searchParams.get('taskStatus') || 'all',
      priority: url.searchParams.get('priority') || 'all',
      type: url.searchParams.get('type') || 'all',
      hideDone: url.searchParams.get('hideDone') !== 'false',
    });
    return NextResponse.json({ ok: true, source: 'internal-seo-content-queue', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-content-queue', error: error instanceof Error ? error.message : 'Failed to build SEO content queue.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'status');
    if (action === 'quick-fix') {
      const data = await applyContentImprovementQuickFix(request, body.task || body || {});
      return NextResponse.json({ ok: true, source: 'internal-seo-content-queue', action, data });
    }
    if (action === 'status') {
      const data = await updateContentImprovementTaskStatus(request, body.task || body || {});
      return NextResponse.json({ ok: true, source: 'internal-seo-content-queue', action, data });
    }
    if (action === 'preview') {
      const data = await buildContentImprovementQueue(request, body.filters || body || {});
      return NextResponse.json({ ok: true, source: 'internal-seo-content-queue', action, data });
    }
    return NextResponse.json({ ok: false, source: 'internal-seo-content-queue', error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-content-queue', error: error instanceof Error ? error.message : 'SEO content queue action failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
