import { NextResponse } from 'next/server';
import { getStoreThemePublishReadiness, publishStoreTheme } from '@/core/themes/store-theme-publish.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getStoreThemePublishReadiness(request, url.searchParams.get('channelSlug') || 'default-store');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store theme publish readiness could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await publishStoreTheme(request, body.channelSlug || 'default-store');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store theme publish failed.' }, { status: 400 });
  }
}
