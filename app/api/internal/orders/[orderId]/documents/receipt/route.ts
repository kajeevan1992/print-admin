import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/core/orders/orders.service';
import { ensureInvoiceForPaidOrder } from '@/core/invoices/formal-invoices.service';
import { buildInvoicePdf } from '@/core/invoices/formal-invoice-documents.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const order = await getOrder(request, params.orderId);
    if (!order) return NextResponse.json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    const result = await ensureInvoiceForPaidOrder(order);
    const invoice = (result as any).invoice;
    if (!invoice) return NextResponse.json({ ok: false, error: 'A receipt is available only after payment is confirmed.' }, { status: 400 });
    const pdf = buildInvoicePdf(invoice, true);
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="receipt-${invoice.invoiceNumber}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Receipt preview failed.' }, { status: 500 });
  }
}
