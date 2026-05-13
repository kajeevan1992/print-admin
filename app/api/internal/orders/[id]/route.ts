export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrder, saveOrder } from '@/core/orders/orders.service';

function errorResponse(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, source: 'internal-orders-db', error: error instanceof Error ? error.message : 'Internal order request failed.' }, { status });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await getOrder(request, params.id);
    if (!order) return errorResponse(new Error('Order was not found.'), 404);
    return NextResponse.json({ ok: true, source: 'internal-orders-db', data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const order = await saveOrder(request, { ...body, id: params.id });
    return NextResponse.json({ ok: true, source: 'internal-orders-db', data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}
