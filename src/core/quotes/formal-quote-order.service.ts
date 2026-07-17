import { getOrder, saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { queueOrderCustomerEmail } from '@/core/email/order-notifications.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { upsertArtworkProductionTicket } from '@/core/storefront/artwork-production-bridge.service';
import { getFormalQuote, updateFormalQuote, type FormalQuote } from './formal-quotes.service';

function clean(value: unknown) { return String(value || '').trim(); }
function orderRequest(request: Request, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); const headers = new Headers(request.headers); headers.set('x-tenant-id', tenantSlug); return new Request(url.toString(), { method: 'GET', headers }); }
function vatClass(rate: number) { return rate <= 0 ? 'zero' : 'standard'; }

export async function convertFormalQuoteToOrder(request: Request, tenantSlug: string, quoteId: string, origin?: string) {
  const quote = await getFormalQuote(tenantSlug, quoteId, { includeRevisions: false });
  if (!quote) throw new Error('Quote was not found.');
  if (!['approved','converted','paid'].includes(quote.status)) throw new Error('The quote must be approved before it can become an order.');
  const scoped = orderRequest(request, tenantSlug);
  let order = quote.convertedOrderId ? await getOrder(scoped, quote.convertedOrderId).catch(() => null) : null;

  if (!order) {
    const orderNumber = `ORD-${quote.quoteNumber.replace(/^Q-/, '')}`;
    const items = quote.lines.map((line) => ({
      id: `order-line-${line.id}`,
      productId: clean(line.productId || line.productSlug || 'quote-custom'),
      productSlug: clean(line.productSlug),
      categorySlug: clean(line.categorySlug),
      productName: line.productName,
      titleSnapshot: line.productName,
      description: clean(line.description),
      quantity: line.quantity,
      unitPriceMinor: line.quantity ? Math.round(line.grossMinor / line.quantity) : line.grossMinor,
      totalPriceMinor: line.grossMinor,
      netTotalMinor: line.netMinor,
      vatMinor: line.vatMinor,
      vatRate: line.vatRate,
      vatClass: vatClass(line.vatRate),
      vatReason: line.vatRate <= 0 ? 'Quote line is zero-rated.' : 'Quote line is standard-rated.',
      currency: quote.currency,
      selectedOptions: line.selectedOptions || [],
      metadataJson: { ...(line.metadataJson || {}), source: 'formal-quote-line', formalQuoteId: quote.id, formalQuoteNumber: quote.quoteNumber, formalQuoteRevision: quote.revision, selectedOptions: line.selectedOptions || [], netMinor: line.netMinor, vatMinor: line.vatMinor, grossMinor: line.grossMinor },
    }));
    order = await saveOrder(scoped, {
      orderNumber,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      customerCompany: quote.customerCompany,
      customer: { id: quote.customerId, name: quote.customerName, email: quote.customerEmail, phone: quote.customerPhone, company: quote.customerCompany },
      contactSnapshot: { customerAccountId: quote.customerId, name: quote.customerName, email: quote.customerEmail, phone: quote.customerPhone, company: quote.customerCompany },
      currency: quote.currency,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'pending',
      paymentProvider: 'stripe',
      payment_method: 'Pay approved quotation online',
      source: 'formal-quote-conversion',
      storeName: quote.storeSlug,
      quoteReference: quote.quoteNumber,
      formalQuoteId: quote.id,
      formalQuoteRevision: quote.revision,
      notes: `Converted from approved formal quote ${quote.quoteNumber}.`,
      internalNotes: [`Formal quote ${quote.quoteNumber} revision ${quote.revision}.`, quote.internalNotes].filter(Boolean),
      items,
      rawCheckout: { source: 'formal-quote', quoteId: quote.id, quoteNumber: quote.quoteNumber, revision: quote.revision, totals: { netMinor: quote.subtotalMinor, vatMinor: quote.vatMinor, grossMinor: quote.totalMinor } },
      resolver: { source: 'formal-quote', tenantSlug: quote.tenantSlug, storeSlug: quote.storeSlug, customerAccountId: quote.customerId, quoteId: quote.id, quoteNumber: quote.quoteNumber, quoteRevision: quote.revision },
    });
    await updateFormalQuote(tenantSlug, quote.id, { status: 'converted', convertedOrderId: order.id }, { type: 'system', action: 'converted-to-order', note: `Converted to ${order.orderNumber || order.id}` });

    const ctx = tenantContextFromRequest(scoped);
    for (const line of quote.lines) {
      await upsertArtworkProductionTicket({ ctx, orderId: order.id, orderNumber: order.orderNumber || orderNumber, lineId: line.id, customerName: quote.customerName, customerEmail: quote.customerEmail, customerPhone: quote.customerPhone, productName: line.productName, productSlug: line.productSlug || line.productId || 'quote-custom', categorySlug: line.categorySlug, quantity: line.quantity, selectedDelivery: 'To be confirmed from quote/order', fulfilmentMode: 'collection', deliveryAddress: null, billingAddress: null, artworkStatus: clean((line.metadataJson as any)?.artworkStatus || 'send-later'), artworkNotes: clean((line.metadataJson as any)?.artworkNotes || quote.customerNotes), upload: null, priceMinor: line.grossMinor, paymentStatus: 'pending', paymentProvider: 'stripe', orderStatus: 'AWAITING_PAYMENT' }).catch(() => null);
    }
  }

  const baseOrigin = origin || new URL(request.url).origin;
  const storeBase = `/native-stores/${quote.tenantSlug}/${quote.storeSlug}`;
  const successUrl = `${baseOrigin}${storeBase}/checkout-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseOrigin}${storeBase}/quote-status/${encodeURIComponent(quote.id)}?payment=cancelled`;
  const sessionResult = await createStripeCheckoutSession(scoped, { orderId: order.id, customerEmail: quote.customerEmail, successUrl, cancelUrl, tenantSlug: quote.tenantSlug, storeSlug: quote.storeSlug });
  const paymentUrl = clean(sessionResult.session?.url);
  if (!paymentUrl) throw new Error('Stripe did not return a payment URL for the approved quote.');
  await queueOrderCustomerEmail(scoped, 'customer-payment-link', order, { paymentUrl, note: `Approved quote ${quote.quoteNumber}` }).catch(() => null);
  return { quote: await getFormalQuote(tenantSlug, quote.id), order, paymentUrl, stripeSessionId: clean(sessionResult.session?.id) };
}

export async function markFormalQuotePaidFromOrder(order: any) {
  const resolver = order?.resolver || {};
  const quoteId = clean(resolver.quoteId || order?.formalQuoteId);
  const tenantSlug = clean(resolver.tenantSlug);
  if (!quoteId || !tenantSlug || clean(resolver.source) !== 'formal-quote') return { updated: false, skipped: true };
  const paymentStatus = clean(order?.paymentStatus).toLowerCase();
  if (!['paid','captured','authorized'].includes(paymentStatus)) return { updated: false, skipped: true, paymentStatus };
  const quote = await updateFormalQuote(tenantSlug, quoteId, { status: 'paid', convertedOrderId: clean(order.id) }, { type: 'stripe', action: 'paid', note: `Payment confirmed for ${clean(order.orderNumber || order.id)}` });
  return { updated: true, quoteId: quote?.id, quoteNumber: quote?.quoteNumber };
}
