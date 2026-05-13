export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrder, listOrders, saveOrder } from '@/core/orders/orders.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-storefront-orders-db',
    error: error instanceof Error ? error.message : 'Storefront orders request failed.',
  }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const status = request.nextUrl.searchParams.get('status');
    const id = request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('orderId');
    const limit = Math.max(1, Math.min(100, Number(request.nextUrl.searchParams.get('limit') || 50)));

    if (id) {
      const order = await getOrder(request, id);
      if (!order) return responseError(new Error('Order was not found.'), 404);
      return NextResponse.json({ ok: true, source: 'internal-storefront-orders-db', data: { order } });
    }

    const orders = await listOrders(request, { email, status, limit });
    return NextResponse.json({
      ok: true,
      source: 'internal-storefront-orders-db',
      data: { orders, count: orders.length, filters: { email: email || null, status: status || null, limit } },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const order = await saveOrder(request, body);
    return NextResponse.json({ ok: true, source: 'internal-storefront-orders-db', data: { order } });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || body.orderId || body.orderNumber || '').trim();
    if (!id) return responseError(new Error('Order id or orderNumber is required.'), 400);
    const order = await saveOrder(request, { ...body, id });
    return NextResponse.json({ ok: true, source: 'internal-storefront-orders-db', data: { order } });
  } catch (error) {
    return responseError(error);
  }
}
