import { NextResponse } from 'next/server';
import { applyStripeCheckoutSessionToOrder, parseStripeWebhookEvent } from '@/core/payments/stripe.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const event = await parseStripeWebhookEvent(request);
    const object = event?.data?.object;
    let result: unknown = { skipped: true, reason: 'Unhandled event type.' };
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      result = await applyStripeCheckoutSessionToOrder(request, object, event.type);
    }
    return NextResponse.json({ ok: true, source: 'internal-card-webhook', eventId: event.id, eventType: event.type, result });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-card-webhook', error: error instanceof Error ? error.message : 'Payment webhook failed.' }, { status: 400 });
  }
}
