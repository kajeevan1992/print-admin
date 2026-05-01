export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { HOSTED_ARTWORK_RULES, readPreflightRecords, runPreflightForCart, summarizePreflight } from '@/core/storefront/artwork-preflight-bridge';
import { readStorefrontBody, storefrontError, storefrontSuccess } from '@/core/storefront/storefront-integrity';

const SOURCE = 'internal-storefront-preflight-bridge';

export async function GET(request: NextRequest) {
  try {
    const records = await readPreflightRecords(request);
    return storefrontSuccess(SOURCE, { items: records, summary: summarizePreflight(records), artworkRules: HOSTED_ARTWORK_RULES });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readStorefrontBody(request);
    const cartItemId = String(body.cartItemId || body.itemId || '').trim() || undefined;
    const override = body.requestedArtworkSpec || body.artworkSpec || body.preflightInput || undefined;
    const result = await runPreflightForCart(request, cartItemId, override);
    return storefrontSuccess(SOURCE, { ...result, artworkRules: HOSTED_ARTWORK_RULES });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
