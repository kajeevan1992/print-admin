import { NextResponse } from 'next/server';
import { queueOrderCustomerEmail } from '@/core/email/order-notifications.service';
import { applyStripeCheckoutSessionToOrder, getStripeCheckoutSession } from '@/core/payments/stripe.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get('session_id') || url.searchParams.get('sessionId') || '').trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: 'session_id is required.' }, { status: 400 });
    const session = await getStripeCheckoutSession(sessionId);
    const result = await applyStripeCheckoutSessionToOrder(request, session, 'payment-return');
    const emailQueue = result?.paid && result?.order ? await queueOrderCustomerEmail(request, 'customer-payment-received', result.order, { actor: 'stripe-return' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Payment email queue failed.' })) : null;
    return NextResponse.json({ ok: true, source: 'internal-card-confirm', data: { ...result, emailQueue }, session: { id: session.id, payment_status: session.payment_status } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-card-confirm', error: error instanceof Error ? error.message : 'Failed to confirm payment.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
