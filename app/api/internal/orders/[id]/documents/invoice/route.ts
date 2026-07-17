import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/core/orders/orders.service';
import { ensureInvoiceForPaidOrder } from '@/core/invoices/formal-invoices.service';
import { buildInvoicePdf } from '@/core/invoices/formal-invoice-documents.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await getOrder(request, params.id);
    if (!order) return NextResponse.json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    const result = await ensureInvoiceForPaidOrder(order);
    const invoice = (result as any).invoice;
    if (!invoice) return NextResponse.json({ ok: false, error: 'An invoice is issued only after payment is confirmed.' }, { status: 400 });
    const pdf = buildInvoicePdf(invoice, false);
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Invoice preview failed.' }, { status: 500 });
  }
}
