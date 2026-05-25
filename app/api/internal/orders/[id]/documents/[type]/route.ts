import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/core/orders/orders.service';
import { getInvoiceSettings } from '@/core/documents/invoice-settings';
import { buildOrderDocumentPdf, orderDocumentFilename, type OrderPdfType } from '@/core/documents/order-pdf';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string; type: string } };

function isDocType(value: string): value is OrderPdfType {
  return value === 'invoice' || value === 'receipt';
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const type = String(context.params.type || '').toLowerCase();
    if (!isDocType(type)) return NextResponse.json({ ok: false, error: 'Document type must be invoice or receipt.' }, { status: 400 });
    const order = await getOrder(request, context.params.id);
    if (!order) return NextResponse.json({ ok: false, error: 'Order not found.' }, { status: 404 });
    const settings = await getInvoiceSettings();
    const pdf = buildOrderDocumentPdf(order, type, settings);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${orderDocumentFilename(order, type)}"`,
        'Cache-Control': 'no-store',
        'X-Order-Document-Type': type,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to generate order document.' }, { status: 500 });
  }
}