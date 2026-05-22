export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/core/orders/orders.service';

type RouteContext = { params: { id: string } };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}

function errorResponse(error: unknown, status = 500) {
  return json({ ok: false, source: 'internal-orders-db', error: error instanceof Error ? error.message : 'Internal order request failed.' }, { status });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const order = await getOrder(request, params.id);
    if (!order) return errorResponse(new Error('Order was not found.'), 404);
    return json({ ok: true, source: 'internal-orders-db', order, data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleUpdate(request: NextRequest, { params }: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const order = await updateOrder(request, params.id, body || {});
    if (!order) return errorResponse(new Error('Order was not found.'), 404);
    return json({ ok: true, source: 'internal-orders-db', order, data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleUpdate(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleUpdate(request, context);
}
