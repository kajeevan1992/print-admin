import { NextResponse } from 'next/server';
import { buildSearchConsoleDashboard, runSearchConsoleImport, saveSearchConsoleSettings } from '@/core/seo/google-search-console.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await buildSearchConsoleDashboard(request);
    return NextResponse.json({ ok: true, source: 'internal-seo-search-console', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-search-console', error: error instanceof Error ? error.message : 'Failed to load Search Console integration.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'save');
    if (action === 'save') {
      const settings = await saveSearchConsoleSettings(request, body.settings || body || {});
      const dashboard = await buildSearchConsoleDashboard(request);
      return NextResponse.json({ ok: true, source: 'internal-seo-search-console', action, data: { settings, dashboard } });
    }
    if (action === 'dry-run' || action === 'test') {
      const data = await runSearchConsoleImport(request, { ...(body.import || body || {}), dryRun: true });
      return NextResponse.json({ ok: true, source: 'internal-seo-search-console', action: 'dry-run', data });
    }
    if (action === 'import') {
      const data = await runSearchConsoleImport(request, body.import || body || {});
      return NextResponse.json({ ok: true, source: 'internal-seo-search-console', action, data });
    }
    return NextResponse.json({ ok: false, source: 'internal-seo-search-console', error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-search-console', error: error instanceof Error ? error.message : 'Search Console operation failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
