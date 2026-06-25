import { NextResponse } from 'next/server';
import { listThemeVersions, rollbackThemeVersion } from '@/core/themes/theme-package-storage.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listThemeVersions(url.searchParams.get('themeKey') || undefined);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme versions could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await rollbackThemeVersion(body.themeKey, body.version);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme rollback failed.' }, { status: 400 });
  }
}
