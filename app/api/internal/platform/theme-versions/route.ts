import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';
import { listThemeVersions, rollbackThemeVersion } from '@/core/themes/theme-package-storage.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const data = await listThemeVersions(url.searchParams.get('themeKey') || undefined);
    return json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Theme versions could not load.';
    const status = /session required/i.test(message) ? 401 : /super admin/i.test(message) ? 403 : 500;
    return json({ ok: false, error: message }, status);
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json().catch(() => ({}));
    const data = await rollbackThemeVersion(body.themeKey, body.version);
    return json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Theme rollback failed.';
    const status = /session required/i.test(message) ? 401 : /super admin/i.test(message) ? 403 : 400;
    return json({ ok: false, error: message }, status);
  }
}
