import { NextResponse } from 'next/server';
import { createPlatformSubscriptionCheckout } from '@/core/billing/stripe-flows.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan = body?.plan === 'yearly' ? 'yearly' : 'monthly';
    const data = await createPlatformSubscriptionCheckout(plan);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not create platform plan session.' }, { status: 400 });
  }
}
