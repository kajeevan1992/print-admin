import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/core/orders/orders.service';
import { buildOrderDocumentPdf, orderDocumentFilename, type OrderPdfType } from '@/core/documents/order-pdf';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string; type: string } };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id, X-Customer-Email',
  };
}
function isDocType(value: string): value is OrderPdfType { return value === 'invoice' || value === 'receipt'; }
function customerEmail(request: NextRequest) { return String(request.nextUrl.searchParams.get('email') || request.headers.get('x-customer-email') || '').trim().toLowerCase(); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const type = String(context.params.type || '').toLowerCase();
    if (!isDocType(type)) return NextResponse.json({ ok: false, error: 'Document type must be invoice or receipt.' }, { status: 400, headers: corsHeaders() });
    const email = customerEmail(request);
    if (!email) return NextResponse.json({ ok: false, error: 'Customer email is required.' }, { status: 401, headers: corsHeaders() });
    const order = await getOrder(request, context.params.id);
    if (!order || String(order.customerEmail || '').toLowerCase() !== email) return NextResponse.json({ ok: false, error: 'Order not found for this customer.' }, { status: 404, headers: corsHeaders() });
    const pdf = buildOrderDocumentPdf(order, type);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${orderDocumentFilename(order, type)}"`,
        'Cache-Control': 'no-store',
        'X-Order-Document-Type': type,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to generate order document.' }, { status: 500, headers: corsHeaders() });
  }
}
