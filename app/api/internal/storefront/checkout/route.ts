export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { cleanCustomer, estimateDelivery, readCartItems, saveCartItems, summarizeCart } from '@/core/storefront/cart-checkout-bridge';
import { buildStorefrontReadinessReport, recalculateCartSnapshot, readStorefrontBody, StorefrontHttpError, storefrontError, storefrontSuccess, validateCheckoutReadiness } from '@/core/storefront/storefront-integrity';
import { runPreflightForCart } from '@/core/storefront/artwork-preflight-bridge';
import { listOrders, saveOrder } from '@/core/orders/orders.service';
import { decideCheckoutPayment } from '@/core/payments/payment-rules';
import { collectArtworkUploadIds, linkArtworkUploadsToOrder } from '@/core/storefront/artwork-order-linking';
import { queueOrderPlacedEmails } from '@/core/email/order-notifications.service';

const SOURCE = 'internal-storefront-checkout-db';

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function cleanCheckoutCustomer(body: Record<string, any>) {
  const source = body.customer || body;
  const firstName = text(source.firstName || source.first_name);
  const lastName = text(source.lastName || source.last_name);
  const fullName = text(source.name || `${firstName} ${lastName}`.trim());
  return cleanCustomer({
    name: fullName,
    email: source.email,
    phone: source.phone,
    company: source.company || source.companyName || source.company_name,
  });
}

function validateCheckoutCustomer(customer: ReturnType<typeof cleanCustomer>) {
  const errors: string[] = [];
  if (!customer.name) errors.push('Customer name is required.');
  if (!customer.email) errors.push('Email is required.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push('Enter a valid email address.');
  if (errors.length) throw new StorefrontHttpError('CUSTOMER_INVALID', errors.join(' '), 400, 'customer');
}

function requestItems(body: Record<string, any>) {
  const candidates = [body.items, body.checkout?.items, body.payload?.items];
  const items = candidates.find((value) => Array.isArray(value));
  return Array.isArray(items) ? items : [];
}

function isQuoteRequest(body: Record<string, any>) {
  return decideCheckoutPayment(body).requiresApproval;
}

function isArtworkLater(body: Record<string, any>) {
  const mode = String(body.artwork_mode || body.artworkMode || body.artwork?.mode || '').toLowerCase();
  return mode.includes('later') || mode.includes('none');
}

function normaliseFulfilmentSelection(body: Record<string, any>) {
  const selected = body.fulfilmentSelection || body.delivery || body.rawCheckout?.fulfilmentSelection || body.rawCheckout?.delivery || {};
  const mode = String(body.fulfilmentMode || selected.fulfilmentMode || selected.type || 'delivery');
  const isCollection = mode.includes('collection');
  const label = text(selected.publicLabel || selected.label || selected.name || body.shippingMethod || (isCollection ? 'Collection' : 'Delivery'));
  const location = selected.rawLocation || selected.location || selected;
  return {
    mode,
    choice: text(body.fulfilmentChoice || selected.id || selected.value || body.delivery || ''),
    label,
    shippingMethod: label,
    isCollection,
    locationId: text(selected.locationId || location.id),
    locationSlug: text(selected.locationSlug || location.slug),
    locationName: text(location.name || selected.locationName || selected.name),
    locationType: text(selected.locationType || location.type || selected.kind),
    collectionTruth: text(selected.collectionTruth || location.collectionTruth),
    pickupInstructions: text(selected.pickupInstructions || location.pickupInstructions || location.collectionInstructions),
    cutoffTime: text(selected.cutoffTime || location.cutoffTime),
    googleBusinessEligible: Boolean(selected.googleBusinessEligible || location.googleBusinessEligible),
    feeMinor: Number(body.shippingMinor || selected.priceMinor || selected.collectionFeeMinor || 0),
    raw: selected,
  };
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
    const customer = cleanCheckoutCustomer(body);
    validateCheckoutCustomer(customer);

    const payloadItems = requestItems(body);
    const storedItems = payloadItems.length ? [] : await readCartItems(request);
    const items = payloadItems.length ? payloadItems : await recalculateCartSnapshot(request, storedItems);
    if (!items.length) throw new StorefrontHttpError('CART_EMPTY', 'Cart is empty. Add an item before checkout.', 400, 'cart');

    const paymentDecision = decideCheckoutPayment(body);
    const quoteRequest = paymentDecision.requiresApproval;
    const artworkLater = isArtworkLater(body);
    if (!payloadItems.length && !quoteRequest && !artworkLater) {
      await runPreflightForCart(request);
      validateCheckoutReadiness(items);
    }

    const totals = payloadItems.length ? (body.totals || summarizeCart(items)) : summarizeCart(items);
    const now = new Date().toISOString();
    const id = String(body.id || body.orderId || makeId('checkout-order'));
    const quoteReference = String(body.quoteReference || `CHECKOUT-${Date.now()}`);
    const deliveryEstimate = body.deliveryEstimate || estimateDelivery(items[0]?.turnaround);
    const status = paymentDecision.orderStatus;
    const artworkUploadIds = collectArtworkUploadIds({ ...body, items });
    const fulfilment = normaliseFulfilmentSelection(body);

    const payload = {
      ...body,
      id,
      quoteReference,
      status,
      paymentDecision,
      source: 'HostedThemeCheckoutDB',
      customer,
      items,
      totals,
      fulfilment,
      fulfilmentMode: fulfilment.mode,
      fulfilmentChoice: fulfilment.choice,
      fulfilmentLocation: fulfilment.isCollection ? {
        id: fulfilment.locationId,
        slug: fulfilment.locationSlug,
        name: fulfilment.locationName,
        type: fulfilment.locationType,
        pickupInstructions: fulfilment.pickupInstructions,
        cutoffTime: fulfilment.cutoffTime,
        collectionTruth: fulfilment.collectionTruth,
        googleBusinessEligible: fulfilment.googleBusinessEligible,
      } : null,
      artworkUploadIds,
      vatBreakdown: totals.vatBreakdown || body.vatBreakdown || body.taxSummary?.vatBreakdown || [],
      deliveryEstimate,
      pricingSources: Array.from(new Set(items.map((item) => item.pricingSource || item.pricing?.source || item.resolverSnapshot?.pricing?.source || 'internal'))),
      createdAt: now,
    };

    const order = await saveOrder(request, {
      ...body,
      id,
      orderNumber: quoteReference,
      quoteReference,
      status,
      paymentStatus: paymentDecision.paymentStatus,
      paymentProvider: paymentDecision.canPayNow ? 'stripe' : body.paymentProvider || '',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerCompany: customer.company,
      currency: totals.currency || body.currency || 'GBP',
      subtotalMinor: totals.netTotalMinor || totals.subtotalMinor,
      shippingMinor: totals.shippingMinor || totals.deliveryMinor,
      taxMinor: totals.vatTotalMinor || totals.taxMinor,
      totalMinor: totals.grossTotalMinor || totals.totalMinor,
      deliveryEstimate,
      payload,
      items,
      artworkUploadIds,
      createdAt: now,
      updatedAt: now,
      source: 'HostedThemeCheckoutDB',
      internalNotes: [
        `Checkout payment decision: ${paymentDecision.mode}.`,
        `Next action: ${paymentDecision.nextAction}.`,
        `Fulfilment: ${fulfilment.label}${fulfilment.locationName ? ` (${fulfilment.locationName})` : ''}.`,
        fulfilment.isCollection && fulfilment.collectionTruth ? `Collection truth rule: ${fulfilment.collectionTruth}.` : '',
        artworkUploadIds.length ? `Artwork uploads linked: ${artworkUploadIds.join(', ')}.` : 'No artwork upload linked at checkout.',
      ].filter(Boolean),
    });

    const artworkLink = await linkArtworkUploadsToOrder(request, { ...body, items, artworkUploadIds }, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      quoteId: quoteRequest ? order.orderNumber : undefined,
      note: `Linked during hosted checkout for order ${order.orderNumber}.`,
    }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Artwork link failed.' }));

    const emailQueue = await queueOrderPlacedEmails(request, order).catch((error) => [{ ok: false, error: error instanceof Error ? error.message : 'Email queue failed.' }]);

    if (body.clearCart !== false) {
      await saveCartItems(request, []);
    }

    return storefrontSuccess(SOURCE, {
      order,
      artworkLink,
      emailQueue,
      totals,
      fulfilment,
      deliveryEstimate,
      quoteRequired: quoteRequest,
      paymentDecision,
      payment: {
        mode: paymentDecision.mode,
        canPayNow: paymentDecision.canPayNow,
        requiresApproval: paymentDecision.requiresApproval,
        nextAction: paymentDecision.nextAction,
      },
      artworkMode: artworkLater ? 'later' : body.artwork_mode || body.artworkMode || '',
    });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
