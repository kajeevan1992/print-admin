export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { applyPaymentEventToOrder } from '@/core/storefront/order-payment-safety';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await applyPaymentEventToOrder(request, body);
    return Response.json({ ok: true, source: 'internal-storefront-payments', data });
  } catch (error) {
    return Response.json({ ok: false, source: 'internal-storefront-payments', error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 });
  }
}
