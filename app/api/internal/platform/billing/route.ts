import { NextResponse } from 'next/server';
import { billingSummary, listBillingPlans, listSubscriptions, listInvoices, listPayments } from '@/core/platform/billing-service';

export async function GET() {
  const [summary, plans, subscriptions, invoices, payments] = await Promise.all([
    billingSummary(),
    listBillingPlans(),
    listSubscriptions(),
    listInvoices(),
    listPayments(),
  ]);

  return NextResponse.json({ ok: true, data: { summary, plans, subscriptions, invoices, payments } });
}
