export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readCartItems, readDraftOrders, summarizeCart } from '@/core/storefront/cart-checkout-bridge';
import { readArtworkRecords, readPreflightRecords, summarizePreflight } from '@/core/storefront/artwork-preflight-bridge';

export async function GET(request: NextRequest) {
  const [cartItems, draftOrders, artworkRecords, preflightRecords] = await Promise.all([
    readCartItems(request),
    readDraftOrders(request),
    readArtworkRecords(request),
    readPreflightRecords(request),
  ]);

  const totals = summarizeCart(cartItems);
  const requiredRoutes = [
    '/api/internal/storefront/theme-data',
    '/api/internal/storefront/cart',
    '/api/internal/storefront/checkout',
    '/api/internal/storefront/artwork',
    '/api/internal/storefront/preflight',
    '/api/internal/storefront/orders',
    '/api/internal/storefront/readiness',
  ];

  return NextResponse.json({
    ok: true,
    source: 'internal-storefront-theme-qa',
    data: {
      build: 'v307-hosted-storefront-live-hardening',
      rule: 'Hosted storefront uses internal routes only. No /api/proxy or public /api/v1 calls are required.',
      requiredRoutes,
      journey: {
        browse: true,
        configure: true,
        cartReady: cartItems.length > 0,
        checkoutDrafts: draftOrders.length,
        artworkRecords: artworkRecords.length,
        preflight: summarizePreflight(preflightRecords),
        ordersEndpointReady: true,
        readinessEndpointReady: true,
      },
      cart: { items: cartItems, totals },
      draftOrders: draftOrders.slice(0, 10),
      artworkRecords: artworkRecords.slice(0, 10),
      preflightRecords: preflightRecords.slice(0, 10),
    },
  });
}
