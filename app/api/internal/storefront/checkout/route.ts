export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { cleanCustomer, estimateDelivery, readCartItems, saveCartItems, summarizeCart, validateCustomer } from '@/core/storefront/cart-checkout-bridge';
import { buildStorefrontReadinessReport, recalculateCartSnapshot, readStorefrontBody, storefrontError, storefrontSuccess, validateCheckoutReadiness } from '@/core/storefront/storefront-integrity';
import { runPreflightForCart } from '@/core/storefront/artwork-preflight-bridge';
import { listOrders, saveOrder } from '@/core/orders/orders.service';

const SOURCE = 'internal-storefront-checkout-db';

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function GET(request: NextRequest) {
  try {
    const [itemsRaw, orders] = await Promise.all([
      readCartItems(request),
      listOrders(request, { limit: 20 }),
    ]);

    const items = await recalculateCartSnapshot(request, itemsRaw);
    const report = buildStorefrontReadinessReport({ items, draftOrders: orders });

    return storefrontSuccess(SOURCE, { ...report, orders });
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
    const id = makeId('checkout-order');
    const quoteReference = `CHECKOUT-${Date.now()}`;
    const deliveryEstimate = body.deliveryEstimate || estimateDelivery(items[0]?.turnaround);

    const payload = {
      id,
      quoteReference,
      status: 'AWAITING_PAYMENT',
      source: 'HostedThemeCheckoutDB',
      customer,
      items,
      totals,
      vatBreakdown: totals.vatBreakdown,
      deliveryEstimate,
      pricingSources: Array.from(new Set(items.map((item) => item.pricingSource || item.pricing?.source || 'internal'))),
      createdAt: now,
    };

    const order = await saveOrder(request, {
      id,
      orderNumber: quoteReference,
      quoteReference,
      status: 'AWAITING_PAYMENT',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerCompany: customer.company,
      currency: totals.currency,
      subtotalMinor: totals.netTotalMinor,
      taxMinor: totals.vatTotalMinor,
      totalMinor: totals.grossTotalMinor,
      deliveryEstimate,
      payload,
      items,
      createdAt: now,
      updatedAt: now,
      source: 'HostedThemeCheckoutDB',
    });

    if (body.clearCart !== false) {
      await saveCartItems(request, []);
    }

    return storefrontSuccess(SOURCE, {
      order,
      totals,
      deliveryEstimate,
    });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
