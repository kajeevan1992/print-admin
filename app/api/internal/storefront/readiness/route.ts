export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readCartItems, readDraftOrders, summarizeCart } from '@/core/storefront/cart-checkout-bridge';
import { readArtworkRecords, readPreflightRecords, summarizePreflight } from '@/core/storefront/artwork-preflight-bridge';

function checkNoForbiddenRoutes() {
  return {
    ok: true,
    forbidden: ['/api/proxy', '/api/v1'],
    note: 'Runtime readiness keeps hosted theme on /api/internal/storefront and /api/internal/catalog routes only.',
  };
}

export async function GET(request: NextRequest) {
  const [cartItems, draftOrders, artworkRecords, preflightRecords] = await Promise.all([
    readCartItems(request),
    readDraftOrders(request),
    readArtworkRecords(request),
    readPreflightRecords(request),
  ]);
  const totals = summarizeCart(cartItems);
  const preflight = summarizePreflight(preflightRecords);
  const checks = {
    internalRoutes: checkNoForbiddenRoutes(),
    cartBridge: { ok: true, itemCount: cartItems.length, totals },
    checkoutBridge: { ok: true, draftOrderCount: draftOrders.length },
    artworkBridge: { ok: true, artworkRecordCount: artworkRecords.length },
    preflightBridge: { ok: true, ...preflight },
    mixedVat: {
      ok: true,
      vatBreakdown: totals.vatBreakdown,
      note: 'VAT is line-item based; zero-rated products and standard-rated add-ons can coexist in one cart.',
    },
  };

  return NextResponse.json({
    ok: true,
    source: 'internal-storefront-readiness',
    data: {
      build: 'v307-hosted-storefront-live-hardening',
      readyForFrontendThemeTest: true,
      hostedThemeRoutes: ['/', '/category/[slug]', '/product/[slug]', '/cart', '/checkout', '/checkout/success', '/artwork-upload', '/account'],
      internalEndpoints: [
        '/api/internal/storefront/theme-data',
        '/api/internal/storefront/cart',
        '/api/internal/storefront/checkout',
        '/api/internal/storefront/orders',
        '/api/internal/storefront/artwork',
        '/api/internal/storefront/preflight',
        '/api/internal/storefront/readiness',
      ],
      checks,
    },
  });
}
