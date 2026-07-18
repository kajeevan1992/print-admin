import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getFormalInvoice } from '@/core/invoices/formal-invoices.service';
import { buildInvoicePdf } from '@/core/invoices/formal-invoice-documents.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const ctx = tenantContextFromRequest(request);
    const invoice = await getFormalInvoice(ctx.tenantId, params.invoiceId);
    if (!invoice) return NextResponse.json({ ok: false, error: 'Invoice was not found.' }, { status: 404 });
    const receipt = request.nextUrl.searchParams.get('type') === 'receipt';
    const pdf = buildInvoicePdf(invoice, receipt);
    const filename = `${receipt ? 'receipt' : 'invoice'}-${invoice.invoiceNumber}.pdf`;
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Invoice document failed.' }, { status: 500 });
  }
}
