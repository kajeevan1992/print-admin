export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cleanCustomer, estimateDelivery, readCartItems, readDraftOrders, saveCartItems, saveDraftOrders, summarizeCart, validateCustomer } from '@/core/storefront/cart-checkout-bridge';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, source: 'internal-storefront-checkout-bridge', error: error instanceof Error ? error.message : 'Storefront checkout request failed.' }, { status });
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function GET(request: NextRequest) {
  try {
    const [items, draftOrders] = await Promise.all([readCartItems(request), readDraftOrders(request)]);
    return NextResponse.json({ ok: true, source: 'internal-storefront-checkout-bridge', data: { ready: items.length > 0, items, totals: summarizeCart(items), draftOrders } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customer = cleanCustomer(body.customer || body);
    const errors = validateCustomer(customer);
    if (errors.length) return responseError(new Error(errors.join(' ')), 400);

    const cartItems = await readCartItems(request);
    if (cartItems.length === 0) return responseError(new Error('Cart is empty. Add an item before checkout.'), 400);

    const totals = summarizeCart(cartItems);
    const now = new Date().toISOString();
    const id = makeId('checkout-draft');
    const quoteReference = `CHECKOUT-${Date.now()}`;
    const deliveryEstimate = body.deliveryEstimate || estimateDelivery(cartItems[0]?.turnaround);

    const payload = {
      id,
      quoteReference,
      status: 'draft-order',
      source: 'HostedThemeCheckoutBridge',
      customer,
      items: cartItems,
      totals,
      vatBreakdown: totals.vatBreakdown,
      deliveryEstimate,
      pricingSources: Array.from(new Set(cartItems.map((item) => item.pricingSource || item.pricing?.source || 'internal'))),
      createdAt: now,
    };

    const title = `${quoteReference} - ${customer.name} - ${cartItems.length} cart item${cartItems.length === 1 ? '' : 's'}`;
    const draft = {
      id,
      title,
      name: title,
      status: 'draft-order',
      quoteReference,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerCompany: customer.company,
      productName: `${cartItems.length} cart item${cartItems.length === 1 ? '' : 's'}`,
      quantity: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      currency: totals.currency,
      netTotalMinor: totals.netTotalMinor,
      vatTotalMinor: totals.vatTotalMinor,
      grossTotalMinor: totals.grossTotalMinor,
      vatBreakdown: totals.vatBreakdown,
      deliveryEstimate,
      payload,
      createdAt: now,
      updatedAt: now,
      source: 'HostedThemeCheckoutBridge',
    };

    const existingDrafts = await readDraftOrders(request);
    const record = await saveDraftOrders(request, [draft, ...existingDrafts.filter((entry) => String(entry.id) !== id)]);
    if (body.clearCart !== false) await saveCartItems(request, []);

    return NextResponse.json({ ok: true, source: 'internal-storefront-checkout-bridge', data: { record, draftOrder: draft, totals, deliveryEstimate } });
  } catch (error) {
    return responseError(error);
  }
}
