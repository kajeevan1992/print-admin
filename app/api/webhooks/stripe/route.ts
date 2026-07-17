import { NextResponse } from 'next/server';
import { applyStripeCheckoutSessionToOrder, applyStripePaymentIntentToOrder, applyStripeRefundToOrder, checkStripeWebhookEventProcessed, parseStripeWebhookEvent, recordStripeWebhookEventProcessed } from '@/core/payments/stripe.service';
import { getOrder } from '@/core/orders/orders.service';
import { syncFulfilmentReservationForPayment } from '@/core/storefront/fulfilment-engine.service';
import { loadPersistentBasket, markBasketConverted } from '@/core/storefront/persistent-basket.service';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function clean(value: unknown) { return String(value || '').trim(); }
function objectOrderId(object: any) { return clean(object?.metadata?.orderId || object?.client_reference_id || object?.orderId); }
function objectTenantId(object: any) { return clean(object?.metadata?.tenantId || object?.tenantId); }
function scopedRequest(request: Request, tenantId: string) {
  if (!tenantId) return request;
  const url = new URL(request.url);
  url.searchParams.set('tenantId', tenantId);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenantId);
  return new Request(url.toString(), { method: 'GET', headers });
}
function eventConfirmsPayment(type: string, object: any) {
  if (type === 'checkout.session.async_payment_succeeded') return true;
  if (type.startsWith('checkout.session.')) return clean(object?.payment_status).toLowerCase() === 'paid';
  if (type === 'payment_intent.succeeded') return true;
  if (type.startsWith('payment_intent.')) return clean(object?.status).toLowerCase() === 'succeeded';
  return false;
}
async function preserveTerminalOrder(request: Request, type: string, object: any) {
  if (type.startsWith('refund.')) return null;
  const orderId = objectOrderId(object);
  const tenantId = objectTenantId(object);
  if (!orderId || !tenantId) return null;
  const order = await getOrder(scopedRequest(request, tenantId), orderId).catch(() => null);
  const paymentStatus = clean(order?.paymentStatus).toLowerCase();
  if (!order || !['paid', 'captured', 'authorized', 'refunded'].includes(paymentStatus) || eventConfirmsPayment(type, object)) return null;
  return { ok: true, order, paid: ['paid', 'captured', 'authorized'].includes(paymentStatus), refunded: paymentStatus === 'refunded', skipped: true, terminalPreserved: true, reason: `Ignored stale ${type} event because order payment is already ${paymentStatus}.`, tenantId };
}
function basketRequest(request: Request, tenantSlug: string) {
  const url = new URL(request.url);
  url.searchParams.set('tenantId', tenantSlug);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenantSlug);
  return new Request(url.toString(), { method: 'GET', headers });
}
async function convertPaidBasket(request: Request, result: any) {
  if (!result?.paid || !result?.order) return { converted: false, skipped: true };
  const resolver = result.order.resolver || {};
  const basketId = clean(resolver.basketId);
  const tenantSlug = clean(resolver.tenantSlug);
  const storeSlug = clean(resolver.storeSlug);
  if (!basketId || !tenantSlug || !storeSlug || resolver.source !== 'persistent-storefront-basket') return { converted: false, skipped: true };
  const scoped = basketRequest(request, tenantSlug);
  const basket = await loadPersistentBasket(scoped, tenantSlug, storeSlug, basketId, { reprice: false });
  if (basket.convertedOrderId === result.order.id && basket.status === 'converted') return { converted: true, duplicate: true, basketId, orderId: result.order.id };
  await markBasketConverted(basket, result.order.id);
  return { converted: true, basketId, orderId: result.order.id };
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function POST(request: Request) {
  try {
    const event = await parseStripeWebhookEvent(request);
    const type = clean(event.type);
    const object = event.data?.object || {};
    const idempotency = await checkStripeWebhookEventProcessed(request, event.id, object).catch((error) => ({ processed: false, error: error instanceof Error ? error.message : 'Webhook idempotency check failed.' }));
    if (idempotency.processed) return json({ ok: true, source: 'stripe-webhook', eventId: event.id || '', eventType: type, duplicate: true, skipped: true });

    let result: any = await preserveTerminalOrder(request, type, object).catch(() => null);
    if (!result) {
      result = { ok: true, skipped: true, reason: `Unhandled Stripe event: ${type}` };
      if (type.startsWith('checkout.session.')) result = await applyStripeCheckoutSessionToOrder(request, object, type);
      else if (type.startsWith('payment_intent.')) result = await applyStripePaymentIntentToOrder(request, object, type);
      else if (type.startsWith('refund.')) result = await applyStripeRefundToOrder(request, object, type);
    }

    const fulfilment = result?.order ? await syncFulfilmentReservationForPayment(result.order).catch((error) => ({ updated: 0, error: error instanceof Error ? error.message : 'Fulfilment reservation sync failed.' })) : { updated: 0, skipped: true };
    const basket = await convertPaidBasket(request, result).catch((error) => ({ converted: false, error: error instanceof Error ? error.message : 'Paid basket conversion failed.' }));
    const recorded = await recordStripeWebhookEventProcessed(request, event, { ...result, basket, fulfilment }, object).catch((error) => ({ recorded: false, error: error instanceof Error ? error.message : 'Webhook event record failed.' }));
    return json({ ok: true, source: 'stripe-webhook', eventId: event.id || '', eventType: type, idempotency, recorded, basket, fulfilment, result });
  } catch (error) {
    return json({ ok: false, source: 'stripe-webhook', error: error instanceof Error ? error.message : 'Stripe webhook failed.' }, { status: 400 });
  }
}
