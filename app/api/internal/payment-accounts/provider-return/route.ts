import { NextResponse } from 'next/server';
import { completeStripeConnect } from '@/core/billing/stripe-flows.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    await completeStripeConnect(code, state);
    return NextResponse.redirect(new URL('/payment-accounts?connect=success', request.url));
  } catch (error) {
    const next = new URL('/payment-accounts', request.url);
    next.searchParams.set('connect', 'failed');
    next.searchParams.set('reason', error instanceof Error ? error.message : 'Stripe Connect failed.');
    return NextResponse.redirect(next);
  }
}
