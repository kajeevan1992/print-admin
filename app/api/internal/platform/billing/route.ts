import { NextResponse } from 'next/server';
import { billingSummary, emptyBillingSummary, listBillingPlans, listSubscriptions, listInvoices, listPayments } from '@/core/platform/billing-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const fallbackData = {
  summary: emptyBillingSummary,
  plans: [],
  subscriptions: [],
  invoices: [],
  payments: [],
  migrationRequired: true,
};

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: true, data: fallbackData });
  }

  try {
    const [summary, plans, subscriptions, invoices, payments] = await Promise.all([
      billingSummary(),
      listBillingPlans(),
      listSubscriptions(),
      listInvoices(),
      listPayments(),
    ]);

    return NextResponse.json({ ok: true, data: { summary, plans, subscriptions, invoices, payments } });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      data: fallbackData,
      warning: error instanceof Error ? error.message : 'Billing data is unavailable.',
    });
  }
}
