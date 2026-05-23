import { NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createStripeCheckoutSession(request, {
      orderId: String(body.orderId || body.id || '').trim(),
      customerEmail: body.customerEmail,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
    return NextResponse.json({ ok: true, source: 'internal-card-create-session', data: { url: result.session.url, sessionId: result.session.id, order: result.order } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-card-create-session', error: error instanceof Error ? error.message : 'Failed to create payment session.' }, { status: 500 });
  }
}
