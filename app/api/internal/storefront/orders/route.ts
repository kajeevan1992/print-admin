export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readDraftOrders, saveDraftOrders } from '@/core/storefront/cart-checkout-bridge';
import { readFinalOrders } from '@/core/storefront/order-payment-safety';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-storefront-orders-bridge',
    error: error instanceof Error ? error.message : 'Storefront orders request failed.',
  }, { status });
}

function normalizeOrder(order: Record<string, any>) {
  const payload = order.payload || {};
  const totals = order.totals || payload.totals || {};
  const customer = order.customer || payload.customer || {};
  return {
    id: String(order.id || payload.id || order.quoteReference || ''),
    orderNumber: String(order.orderNumber || order.quoteReference || payload.quoteReference || 'Draft order'),
    quoteReference: String(order.quoteReference || payload.quoteReference || ''),
    status: String(order.status || payload.status || 'draft-order'),
    paymentStatus: String(order.paymentStatus || payload.paymentStatus || ''),
    productionStatus: String(order.productionStatus || payload.productionStatus || ''),
    locked: Boolean(order.locked),
    customerName: String(order.customerName || customer.name || ''),
    customerEmail: String(order.customerEmail || customer.email || ''),
    customerPhone: String(order.customerPhone || customer.phone || ''),
    customerCompany: String(order.customerCompany || customer.company || ''),
    productName: order.productName || `${Array.isArray(order.items || payload.items) ? (order.items || payload.items).length : 0} cart item(s)`,
    quantity: Number(order.quantity || 0),
    currency: String(order.currency || totals.currency || 'GBP'),
    netTotalMinor: Number(order.netTotalMinor ?? totals.netTotalMinor ?? 0),
    vatTotalMinor: Number(order.vatTotalMinor ?? totals.vatTotalMinor ?? 0),
    grossTotalMinor: Number(order.grossTotalMinor ?? totals.grossTotalMinor ?? 0),
    vatBreakdown: Array.isArray(order.vatBreakdown) ? order.vatBreakdown : (Array.isArray(totals.vatBreakdown) ? totals.vatBreakdown : []),
    deliveryEstimate: order.deliveryEstimate || payload.deliveryEstimate || null,
    createdAt: order.createdAt || payload.createdAt || null,
    updatedAt: order.updatedAt || payload.updatedAt || order.createdAt || null,
    source: order.source || payload.source || 'HostedThemeCheckoutBridge',
    payload,
  };
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const status = request.nextUrl.searchParams.get('status');
    const type = request.nextUrl.searchParams.get('type');
    const limit = Math.max(1, Math.min(100, Number(request.nextUrl.searchParams.get('limit') || 50)));
    const [draftRaw, finalRaw] = await Promise.all([readDraftOrders(request), readFinalOrders(request)]);
    const drafts = draftRaw.map((entry) => ({ ...normalizeOrder(entry), orderType: 'draft' }));
    const finals = finalRaw.map((entry) => ({ ...normalizeOrder(entry), orderType: 'final' }));
    let orders = [...finals, ...drafts];
    if (email) orders = orders.filter((order) => order.customerEmail.toLowerCase() === email.toLowerCase());
    if (status) orders = orders.filter((order) => order.status.toLowerCase() === status.toLowerCase());
    if (type) orders = orders.filter((order) => order.orderType === type);
    return NextResponse.json({ ok: true, source: 'internal-storefront-orders-bridge', data: { orders: orders.slice(0, limit), draftOrders: drafts, finalOrders: finals, count: orders.length, filters: { email: email || null, status: status || null, type: type || null, limit } } });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || body.orderId || body.quoteReference || '').trim();
    if (!id) return responseError(new Error('Order id or quoteReference is required.'), 400);
    const allowed = new Set(['draft-order', 'artwork-pending', 'preflight-pending', 'ready-for-production', 'cancelled', 'finalised']);
    const status = String(body.status || '').trim();
    if (status && !allowed.has(status)) return responseError(new Error(`Unsupported storefront order status: ${status}`), 400);

    const existing = await readDraftOrders(request);
    let found = false;
    const next = existing.map((order) => {
      if (String(order.id) !== id && String(order.quoteReference) !== id) return order;
      found = true;
      return { ...order, status: status || order.status, storefrontNotes: body.notes ?? order.storefrontNotes ?? null, updatedAt: new Date().toISOString() };
    });
    if (!found) return responseError(new Error('Draft order was not found.'), 404);
    const record = await saveDraftOrders(request, next);
    return NextResponse.json({ ok: true, source: 'internal-storefront-orders-bridge', data: { record, orders: next.map(normalizeOrder) } });
  } catch (error) {
    return responseError(error);
  }
}
