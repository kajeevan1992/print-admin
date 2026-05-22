export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listOrders, saveOrder } from '@/core/orders/orders.service';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}

function errorResponse(error: unknown, status = 500) {
  return json({ ok: false, source: 'internal-orders-db', error: error instanceof Error ? error.message : 'Internal orders request failed.' }, { status });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search');
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const orders = await listOrders(request, { email, status, search, limit });
    return json({ ok: true, source: 'internal-orders-db', data: { items: orders, orders, count: orders.length } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const order = await saveOrder(request, body);
    return json({ ok: true, source: 'internal-orders-db', order, data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}
