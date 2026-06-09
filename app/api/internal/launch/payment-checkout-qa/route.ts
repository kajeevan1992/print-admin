import { NextResponse } from 'next/server';
import { buildPaymentCheckoutQa } from '@/core/launch/payment-checkout-qa.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await buildPaymentCheckoutQa(request, { mode: 'dry-run' });
    return NextResponse.json({ ok: true, source: 'internal-launch-payment-checkout-qa', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-payment-checkout-qa', error: error instanceof Error ? error.message : 'Payment checkout QA failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = String(body.action || body.mode || '') === 'create-payment-test-order' ? 'create-payment-test-order' : 'dry-run';
    const data = await buildPaymentCheckoutQa(request, { mode });
    return NextResponse.json({ ok: true, source: 'internal-launch-payment-checkout-qa', action: mode, data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-payment-checkout-qa', error: error instanceof Error ? error.message : 'Payment checkout QA action failed.' }, { status: 500 });
  }
}
