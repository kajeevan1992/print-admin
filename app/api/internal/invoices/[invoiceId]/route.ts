import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { createFormalCreditNote, getFormalInvoice } from '@/core/invoices/formal-invoices.service';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const ctx = tenantContextFromRequest(request);
    const invoice = await getFormalInvoice(ctx.tenantId, params.invoiceId);
    if (!invoice) return json({ ok: false, error: 'Invoice was not found.' }, { status: 404 });
    return json({ ok: true, source: 'formal-invoice-ledger', data: invoice });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Invoice could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = clean(body.action).toLowerCase();
    if (action !== 'create-credit-note') return json({ ok: false, error: 'Unsupported invoice action.' }, { status: 400 });
    const creditNote = await createFormalCreditNote({ tenantSlug: ctx.tenantId, invoiceId: params.invoiceId, reason: clean(body.reason), amountMinor: Number(body.amountMinor || 0), externalReference: clean(body.externalReference) });
    const invoice = await getFormalInvoice(ctx.tenantId, params.invoiceId);
    return json({ ok: true, source: 'formal-invoice-ledger', data: { invoice, creditNote } });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Credit note could not be created.' }, { status: 400 });
  }
}
