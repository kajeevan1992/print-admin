export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readDraftOrders, saveDraftOrders } from '@/core/storefront/cart-checkout-bridge';

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

export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { readDraftOrders } from '@/core/storefront/cart-checkout-bridge'
import { readFinalOrders } from '@/core/storefront/order-payment-safety'

export async function GET(request: NextRequest) {
  try {
    const drafts = await readDraftOrders(request)
    const finals = await readFinalOrders(request)

    return Response.json({
      ok: true,
      source: 'internal-storefront-orders',
      data: {
        draftOrders: drafts,
        finalOrders: finals
      }
    })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || body.orderId || body.quoteReference || '').trim();
    if (!id) return responseError(new Error('Order id or quoteReference is required.'), 400);
    const allowed = new Set(['draft-order', 'artwork-pending', 'preflight-pending', 'ready-for-production', 'cancelled']);
    const status = String(body.status || '').trim();
    if (status && !allowed.has(status)) return responseError(new Error(`Unsupported storefront order status: ${status}`), 400);

    const existing = await readDraftOrders(request);
    let found = false;
    const next = existing.map((order) => {
      if (String(order.id) !== id && String(order.quoteReference) !== id) return order;
      found = true;
      return {
        ...order,
        status: status || order.status,
        storefrontNotes: body.notes ?? order.storefrontNotes ?? null,
        updatedAt: new Date().toISOString(),
      };
    });
    if (!found) return responseError(new Error('Draft order was not found.'), 404);
    const record = await saveDraftOrders(request, next);
    return NextResponse.json({ ok: true, source: 'internal-storefront-orders-bridge', data: { record, orders: next.map(normalizeOrder) } });
  } catch (error) {
    return responseError(error);
  }
}
