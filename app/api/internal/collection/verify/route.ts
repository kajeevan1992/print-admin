import { NextResponse } from 'next/server';
import { verifyCollectionPass } from '@/core/collection/collection-handover.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await verifyCollectionPass(request, {
      token: body.token,
      pin: body.pin,
      orderId: body.orderId,
      markCollected: Boolean(body.markCollected),
      collectedBy: body.collectedBy,
      note: body.note,
    });
    return NextResponse.json({ ok: result.ok, source: 'internal-collection-verify', data: result, error: result.ok ? undefined : result.reason }, { status: result.ok ? 200 : 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-verify', error: error instanceof Error ? error.message : 'Failed to verify collection pass.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await verifyCollectionPass(request, { token: url.searchParams.get('token') || '', pin: url.searchParams.get('pin') || '', orderId: url.searchParams.get('orderId') || '' });
    return NextResponse.json({ ok: result.ok, source: 'internal-collection-verify', data: result, error: result.ok ? undefined : result.reason }, { status: result.ok ? 200 : 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-verify', error: error instanceof Error ? error.message : 'Failed to verify collection pass.' }, { status: 500 });
  }
}
