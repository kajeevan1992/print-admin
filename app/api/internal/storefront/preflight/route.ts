export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { HOSTED_ARTWORK_RULES, readPreflightRecords, runPreflightForCart, summarizePreflight } from '@/core/storefront/artwork-preflight-bridge';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, source: 'internal-storefront-preflight-bridge', error: error instanceof Error ? error.message : 'Storefront preflight request failed.' }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const records = await readPreflightRecords(request);
    return NextResponse.json({ ok: true, source: 'internal-storefront-preflight-bridge', data: { items: records, summary: summarizePreflight(records), artworkRules: HOSTED_ARTWORK_RULES } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cartItemId = String(body.cartItemId || body.itemId || '').trim() || undefined;
    const override = body.requestedArtworkSpec || body.artworkSpec || body.preflightInput || undefined;
    const result = await runPreflightForCart(request, cartItemId, override);
    return NextResponse.json({ ok: true, source: 'internal-storefront-preflight-bridge', data: { ...result, artworkRules: HOSTED_ARTWORK_RULES } });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return responseError(error, status);
  }
}
