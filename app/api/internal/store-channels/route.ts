import { NextResponse } from 'next/server';
import { listStoreChannels, saveStoreChannel } from '@/core/storefront/store-channels.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listStoreChannels(url.searchParams.get('search') || '', url.searchParams.get('status') || undefined);
    return NextResponse.json({ ok: true, success: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, success: false, error: error instanceof Error ? error.message : 'Store channels could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveStoreChannel(body);
    return NextResponse.json({ ok: true, success: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, success: false, error: error instanceof Error ? error.message : 'Store channel could not be saved.' }, { status: 400 });
  }
}
