import { NextResponse } from 'next/server';
import { listAllowedThemesForTenant, selectThemeForStore } from '@/core/themes/platform-theme-library.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listAllowedThemesForTenant(request, url.searchParams.get('channelSlug') || 'default-store');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Allowed themes could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await selectThemeForStore(request, body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Theme could not be assigned to store.' }, { status: 400 });
  }
}
