import { NextResponse } from 'next/server';
import { verifyStripeWebhookSignature } from '@/core/billing/stripe-flows.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = await verifyStripeWebhookSignature(rawBody, request.headers.get('stripe-signature'));
    return NextResponse.json({ ok: true, received: true, id: event.id, type: event.type });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Stripe event verification failed.' }, { status: 400 });
  }
}
