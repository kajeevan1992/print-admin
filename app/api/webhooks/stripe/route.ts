import { NextResponse } from 'next/server';
import { applyStripeCheckoutSessionToOrder, applyStripePaymentIntentToOrder, applyStripeRefundToOrder, parseStripeWebhookEvent } from '@/core/payments/stripe.service';

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const event = await parseStripeWebhookEvent(request);
    const type = String(event.type || '').trim();
    const object = event.data?.object || {};
    let result: any = { ok: true, skipped: true, reason: `Unhandled Stripe event: ${type}` };

    if (type.startsWith('checkout.session.')) {
      result = await applyStripeCheckoutSessionToOrder(request, object, type);
    } else if (type.startsWith('payment_intent.')) {
      result = await applyStripePaymentIntentToOrder(request, object, type);
    } else if (type.startsWith('refund.')) {
      result = await applyStripeRefundToOrder(request, object, type);
    }

    return json({ ok: true, source: 'stripe-webhook', eventId: event.id || '', eventType: type, result });
  } catch (error) {
    return json({ ok: false, source: 'stripe-webhook', error: error instanceof Error ? error.message : 'Stripe webhook failed.' }, { status: 400 });
  }
}
