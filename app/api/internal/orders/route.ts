export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listOrders, saveOrder } from '@/core/orders/orders.service';

function errorResponse(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, source: 'internal-orders-db', error: error instanceof Error ? error.message : 'Internal orders request failed.' }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const status = request.nextUrl.searchParams.get('status');
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const orders = await listOrders(request, { email, status, limit });
    return NextResponse.json({ ok: true, source: 'internal-orders-db', data: { orders, count: orders.length } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const order = await saveOrder(request, body);
    return NextResponse.json({ ok: true, source: 'internal-orders-db', data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}
