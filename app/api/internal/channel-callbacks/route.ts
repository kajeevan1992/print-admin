import { NextResponse } from 'next/server';
import { listChannelWebhooks, saveChannelWebhook } from '@/core/storefront/channel-webhooks.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listChannelWebhooks(url.searchParams.get('channelId') || '');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Channel callbacks could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveChannelWebhook(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Channel callback could not be saved.' }, { status: 400 });
  }
}
