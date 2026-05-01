export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { finaliseDraftOrder } from '@/core/storefront/order-payment-safety';

const SOURCE = 'internal-storefront-finalise';

function ok(data: any) {
  return Response.json({ ok: true, source: SOURCE, data });
}

function fail(error: any, status = 500) {
  return Response.json({ ok: false, source: SOURCE, error: error instanceof Error ? error.message : 'Finalisation failed' }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await finaliseDraftOrder(request, body);
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
