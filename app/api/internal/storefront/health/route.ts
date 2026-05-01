export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { readCartItems, readDraftOrders } from '@/core/storefront/cart-checkout-bridge';
import { readArtworkRecords, readPreflightRecords } from '@/core/storefront/artwork-preflight-bridge';
import { buildStorefrontReadinessReport, recalculateCartSnapshot, storefrontError, storefrontSuccess } from '@/core/storefront/storefront-integrity';

const SOURCE = 'internal-storefront-health';

export async function GET(request: NextRequest) {
  try {
    const [rawItems, draftOrders, artworkRecords, preflightRecords] = await Promise.all([
      readCartItems(request),
      readDraftOrders(request),
      readArtworkRecords(request),
      readPreflightRecords(request),
    ]);

    const items = await recalculateCartSnapshot(request, rawItems);
    const report = buildStorefrontReadinessReport({ items, draftOrders, artworkRecords, preflightRecords });

    return storefrontSuccess(SOURCE, report);
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
