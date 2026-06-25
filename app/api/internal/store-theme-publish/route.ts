import { NextResponse } from 'next/server';
import { getStoreDesignLiveReadiness, setStoreDesignLive } from '@/core/themes/store-design-live.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getStoreDesignLiveReadiness(url.searchParams.get('channelSlug') || 'default-store');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store design readiness could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await setStoreDesignLive(body.channelSlug || 'default-store');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Store design go live failed.' }, { status: 400 });
  }
}
