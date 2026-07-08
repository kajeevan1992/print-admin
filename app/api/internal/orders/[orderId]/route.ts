export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/core/orders/orders.service';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function errorResponse(error: unknown, status = 500) { return json({ ok: false, source: 'internal-order-detail-db', error: error instanceof Error ? error.message : 'Internal order request failed.' }, { status }); }
function clean(value: unknown) { return String(value || '').trim(); }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const orderId = clean(params.orderId);
    if (!orderId) return json({ ok: false, error: 'orderId is required.' }, { status: 400 });
    const order = await getOrder(request, orderId);
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    return json({ ok: true, source: 'internal-order-detail-db', order, data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const orderId = clean(params.orderId);
    if (!orderId) return json({ ok: false, error: 'orderId is required.' }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const order = await updateOrder(request, orderId, body);
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    return json({ ok: true, source: 'internal-order-detail-db', order, data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}
