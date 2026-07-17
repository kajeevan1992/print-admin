import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getFormalInvoice } from '@/core/invoices/formal-invoices.service';
import { buildCreditNotePdf } from '@/core/invoices/formal-invoice-documents.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { invoiceId: string; creditNoteId: string } }) {
  try {
    const ctx = tenantContextFromRequest(request);
    const invoice = await getFormalInvoice(ctx.tenantId, params.invoiceId);
    const creditNote = invoice?.creditNotes.find((item) => item.id === params.creditNoteId || item.creditNoteNumber === params.creditNoteId);
    if (!invoice || !creditNote) return NextResponse.json({ ok: false, error: 'Credit note was not found.' }, { status: 404 });
    const pdf = buildCreditNotePdf(invoice, creditNote);
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="credit-note-${creditNote.creditNoteNumber}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Credit note document failed.' }, { status: 500 });
  }
}
