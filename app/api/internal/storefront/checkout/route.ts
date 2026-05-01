export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { cleanCustomer, estimateDelivery, readCartItems, readDraftOrders, saveCartItems, saveDraftOrders, summarizeCart, validateCustomer } from '@/core/storefront/cart-checkout-bridge';
import { buildStorefrontReadinessReport, recalculateCartSnapshot, readStorefrontBody, storefrontError, storefrontSuccess, validateCheckoutReadiness } from '@/core/storefront/storefront-integrity';
import { runPreflightForCart } from '@/core/storefront/artwork-preflight-bridge';

const SOURCE = 'internal-storefront-checkout-bridge';

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function GET(request: NextRequest) {
  try {
    const [itemsRaw, draftOrders] = await Promise.all([readCartItems(request), readDraftOrders(request)]);
    const items = await recalculateCartSnapshot(request, itemsRaw);
    const report = buildStorefrontReadinessReport({ items, draftOrders });

    return storefrontSuccess(SOURCE, { ...report, draftOrders });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readStorefrontBody(request);
    const customer = cleanCustomer(body.customer || body);
    const customerErrors = validateCustomer(customer);
    if (customerErrors.length) {
      throw new Error(customerErrors.join(' '));
    }

    const rawItems = await readCartItems(request);
    const items = await recalculateCartSnapshot(request, rawItems);

    await runPreflightForCart(request);
    validateCheckoutReadiness(items);

    const totals = summarizeCart(items);
    const now = new Date().toISOString();
    const id = makeId('checkout-draft');
    const quoteReference = `CHECKOUT-${Date.now()}`;
    const deliveryEstimate = body.deliveryEstimate || estimateDelivery(items[0]?.turnaround);

    const payload = {
      id,
      quoteReference,
      status: 'draft-order',
      source: 'HostedThemeCheckoutBridge',
      customer,
      items,
      totals,
      vatBreakdown: totals.vatBreakdown,
      deliveryEstimate,
      pricingSources: Array.from(new Set(items.map((item) => item.pricingSource || item.pricing?.source || 'internal'))),
      createdAt: now,
    };

    const title = `${quoteReference} - ${customer.name} - ${items.length} cart item${items.length === 1 ? '' : 's'}`;
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
      productName: `${items.length} cart item${items.length === 1 ? '' : 's'}`,
      quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
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

    return storefrontSuccess(SOURCE, { record, draftOrder: draft, totals, deliveryEstimate });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
