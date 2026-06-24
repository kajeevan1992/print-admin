import { NextResponse } from 'next/server';
import { createStripeConnectStartUrl } from '@/core/billing/stripe-flows.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const data = await createStripeConnectStartUrl();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not start payment provider setup.' }, { status: 400 });
  }
}
