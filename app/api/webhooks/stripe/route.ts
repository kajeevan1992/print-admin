import { NextResponse } from 'next/server';
import { applyStripeCheckoutSessionToOrder, applyStripePaymentIntentToOrder, applyStripeRefundToOrder, checkStripeWebhookEventProcessed, parseStripeWebhookEvent, recordStripeWebhookEventProcessed } from '@/core/payments/stripe.service';
import { loadPersistentBasket, markBasketConverted } from '@/core/storefront/persistent-basket.service';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
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
  const basketId = String(resolver.basketId || '').trim();
  const tenantSlug = String(resolver.tenantSlug || '').trim();
  const storeSlug = String(resolver.storeSlug || '').trim();
  if (!basketId || !tenantSlug || !storeSlug || resolver.source !== 'persistent-storefront-basket') return { converted: false, skipped: true };
  const scoped = basketRequest(request, tenantSlug);
  const basket = await loadPersistentBasket(scoped, tenantSlug, storeSlug, basketId, { reprice: false });
  if (basket.convertedOrderId === result.order.id && basket.status === 'converted') return { converted: true, duplicate: true, basketId, orderId: result.order.id };
  await markBasketConverted(basket, result.order.id);
  return { converted: true, basketId, orderId: result.order.id };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const event = await parseStripeWebhookEvent(request);
    const type = String(event.type || '').trim();
    const object = event.data?.object || {};
    const idempotency = await checkStripeWebhookEventProcessed(request, event.id, object).catch((error) => ({ processed: false, error: error instanceof Error ? error.message : 'Webhook idempotency check failed.' }));
    if (idempotency.processed) return json({ ok: true, source: 'stripe-webhook', eventId: event.id || '', eventType: type, duplicate: true, skipped: true });

    let result: any = { ok: true, skipped: true, reason: `Unhandled Stripe event: ${type}` };
    if (type.startsWith('checkout.session.')) {
      result = await applyStripeCheckoutSessionToOrder(request, object, type);
    } else if (type.startsWith('payment_intent.')) {
      result = await applyStripePaymentIntentToOrder(request, object, type);
    } else if (type.startsWith('refund.')) {
      result = await applyStripeRefundToOrder(request, object, type);
    }

    const basket = await convertPaidBasket(request, result).catch((error) => ({ converted: false, error: error instanceof Error ? error.message : 'Paid basket conversion failed.' }));
    const recorded = await recordStripeWebhookEventProcessed(request, event, { ...result, basket }, object).catch((error) => ({ recorded: false, error: error instanceof Error ? error.message : 'Webhook event record failed.' }));
    return json({ ok: true, source: 'stripe-webhook', eventId: event.id || '', eventType: type, idempotency, recorded, basket, result });
  } catch (error) {
    return json({ ok: false, source: 'stripe-webhook', error: error instanceof Error ? error.message : 'Stripe webhook failed.' }, { status: 400 });
  }
}
