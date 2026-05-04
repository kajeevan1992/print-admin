import { NextResponse } from 'next/server';
import { assignTenantPlan, createInvoice, markInvoicePaid } from '@/core/platform/billing-service';

export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action;

  if (action === 'assign-plan') {
    if (!body.tenantId || !body.planSlug) {
      return NextResponse.json({ ok: false, error: { message: 'tenantId and planSlug are required.' } }, { status: 400 });
    }
    const data = await assignTenantPlan({
      tenantId: body.tenantId,
      planSlug: body.planSlug,
      billingInterval: body.billingInterval || 'monthly',
      status: body.status || 'active',
    });
    return NextResponse.json({ ok: true, data });
  }

  if (action === 'generate-invoice') {
    if (!body.tenantId || typeof body.subtotalMinor !== 'number') {
      return NextResponse.json({ ok: false, error: { message: 'tenantId and subtotalMinor are required.' } }, { status: 400 });
    }
    const data = await createInvoice({
      tenantId: body.tenantId,
      subscriptionId: body.subscriptionId,
      subtotalMinor: body.subtotalMinor,
      taxMinor: body.taxMinor || 0,
      status: body.status || 'issued',
    });
    return NextResponse.json({ ok: true, data });
  }

  if (action === 'mark-paid') {
    if (!body.invoiceId) {
      return NextResponse.json({ ok: false, error: { message: 'invoiceId is required.' } }, { status: 400 });
    }
    const data = await markInvoicePaid(body.invoiceId);
    return NextResponse.json({ ok: true, data });
  }

  return NextResponse.json({ ok: false, error: { message: `Unknown billing action: ${action}` } }, { status: 400 });
}
