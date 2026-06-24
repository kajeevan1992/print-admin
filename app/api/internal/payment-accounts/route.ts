import { NextResponse } from 'next/server';
import { getPaymentAccountsReadiness, saveTenantPaymentAccount } from '@/core/billing/payment-accounts.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getPaymentAccountsReadiness();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment accounts could not load.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveTenantPaymentAccount(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Payment account could not be saved.' }, { status: 400 });
  }
}
