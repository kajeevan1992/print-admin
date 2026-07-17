import { NextRequest, NextResponse } from 'next/server';
import { customerFromRequest } from '@/core/storefront/customer-account.service';
import { getFormalInvoice } from '@/core/invoices/formal-invoices.service';
import { buildInvoicePdf } from '@/core/invoices/formal-invoice-documents.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function clean(value: unknown) { return String(value || '').trim(); }

export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const tenantSlug = clean(request.nextUrl.searchParams.get('tenantSlug'));
    const storeSlug = clean(request.nextUrl.searchParams.get('storeSlug'));
    if (!tenantSlug || !storeSlug) return NextResponse.json({ ok: false, error: 'Missing storefront invoice scope.' }, { status: 400 });
    const customer = await customerFromRequest(request, tenantSlug, storeSlug);
    if (!customer) return NextResponse.json({ ok: false, error: 'Customer sign-in is required.' }, { status: 401 });
    const invoice = await getFormalInvoice(tenantSlug, params.invoiceId);
    const owned = invoice && invoice.storeSlug === storeSlug && ((invoice.customerId && invoice.customerId === customer.id) || invoice.customerEmail.toLowerCase() === customer.email.toLowerCase());
    if (!invoice || !owned) return NextResponse.json({ ok: false, error: 'Invoice was not found in this account.' }, { status: 404 });
    const pdf = buildInvoicePdf(invoice, request.nextUrl.searchParams.get('type') === 'receipt');
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Invoice document failed.' }, { status: 500 });
  }
}
