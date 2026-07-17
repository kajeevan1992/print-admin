import { NextRequest, NextResponse } from 'next/server';
import { accessFormalQuote, formalQuoteDocumentHtml } from '@/core/quotes/formal-quotes.service';
import { customerFromRequest } from '@/core/storefront/customer-account.service';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }

export async function GET(request: NextRequest, { params }: { params: { quoteId: string } }) {
  try {
    const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug'));
    const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug'));
    const token = clean(request.nextUrl.searchParams.get('token'));
    const customer = tenantSlug && storeSlug ? await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null) : null;
    const quote = await accessFormalQuote({ tenantSlug, storeSlug, quoteId: params.quoteId, token, customerId: customer?.id, customerEmail: customer?.email, markViewed: false });
    if (!quote) return new NextResponse('Quote was not found or access has expired.', { status: 404 });
    return new NextResponse(formalQuoteDocumentHtml(quote), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) { return new NextResponse(error instanceof Error ? error.message : 'Quote document failed.', { status: 400 }); }
}
