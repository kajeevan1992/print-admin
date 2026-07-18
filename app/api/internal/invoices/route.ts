import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getOrder } from '@/core/orders/orders.service';
import { ensureInvoiceForPaidOrder, listFormalInvoices } from '@/core/invoices/formal-invoices.service';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const items = await listFormalInvoices(ctx.tenantId, {
      storeSlug: request.nextUrl.searchParams.get('storeSlug') || '',
      customerEmail: request.nextUrl.searchParams.get('customerEmail') || '',
      status: request.nextUrl.searchParams.get('status') || '',
      limit: Number(request.nextUrl.searchParams.get('limit') || 300),
    });
    return json({ ok: true, source: 'formal-invoice-ledger', data: { items } });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Invoices could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const orderId = clean(body.orderId);
    if (!orderId) return json({ ok: false, error: 'Order ID or order number is required.' }, { status: 400 });
    const order = await getOrder(request, orderId);
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    const result = await ensureInvoiceForPaidOrder({ ...order, tenantId: ctx.tenantId, resolver: { ...(order.resolver || {}), tenantSlug: clean(order.resolver?.tenantSlug) || ctx.tenantId } });
    return json({ ok: true, source: 'formal-invoice-ledger', data: result });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Invoice could not be created.' }, { status: 400 });
  }
}
