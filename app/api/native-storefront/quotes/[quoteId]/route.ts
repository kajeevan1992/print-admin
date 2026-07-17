import { NextRequest, NextResponse } from 'next/server';
import { accessFormalQuote, decideFormalQuote } from '@/core/quotes/formal-quotes.service';
import { convertFormalQuoteToOrder } from '@/core/quotes/formal-quote-order.service';
import { customerFromRequest } from '@/core/storefront/customer-account.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }
function safeQuote(quote: any) { if (!quote) return null; return { id: quote.id, quoteNumber: quote.quoteNumber, title: quote.title, status: quote.status, currency: quote.currency, customerName: quote.customerName, customerCompany: quote.customerCompany, subtotalMinor: quote.subtotalMinor, vatMinor: quote.vatMinor, totalMinor: quote.totalMinor, customerNotes: quote.customerNotes, expiresAt: quote.expiresAt, sentAt: quote.sentAt, approvedAt: quote.approvedAt, declinedAt: quote.declinedAt, convertedOrderId: quote.convertedOrderId, revision: quote.revision, createdAt: quote.createdAt, updatedAt: quote.updatedAt, lines: (quote.lines || []).map((line: any) => ({ id: line.id, productSlug: line.productSlug, categorySlug: line.categorySlug, productName: line.productName, description: line.description, quantity: line.quantity, unitNetMinor: line.unitNetMinor, netMinor: line.netMinor, vatRate: line.vatRate, vatMinor: line.vatMinor, grossMinor: line.grossMinor, selectedOptions: line.selectedOptions || [] })) }; }
async function scope(request: NextRequest) { const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug')); const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug')); const token = clean(request.nextUrl.searchParams.get('token')); const customer = tenantSlug && storeSlug ? await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null) : null; return { tenantSlug, storeSlug, token, customer }; }

export async function GET(request: NextRequest, { params }: { params: { quoteId: string } }) {
  try {
    const input = await scope(request);
    if (!input.tenantSlug || !input.storeSlug) return json({ ok: false, error: 'Missing quote storefront scope.' }, { status: 400 });
    const quote = await accessFormalQuote({ tenantSlug: input.tenantSlug, storeSlug: input.storeSlug, quoteId: params.quoteId, token: input.token, customerId: input.customer?.id, customerEmail: input.customer?.email, markViewed: true });
    if (!quote) return json({ ok: false, error: 'Quote was not found or access has expired.' }, { status: 404 });
    return json({ ok: true, authenticated: Boolean(input.customer), data: safeQuote(quote) });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'Quote could not be loaded.' }, { status: 400 }); }
}

export async function POST(request: NextRequest, { params }: { params: { quoteId: string } }) {
  const body = await request.json().catch(() => ({}));
  const tenantSlug = slug(body.tenantSlug);
  const storeSlug = slug(body.storeSlug);
  const token = clean(body.token);
  const action = clean(body.action).toLowerCase();
  const limit = publicRateLimit(request, { scope: 'formal-quote-customer-action', limit: 20, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug, params.quoteId, action].join(':') });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'formal-quote-customer-action' }, { status: 429, headers: limit.headers });
  try {
    if (!tenantSlug || !storeSlug || !['approve','decline','pay'].includes(action)) return json({ ok: false, error: 'Missing quote action details.' }, { status: 400, headers: limit.headers });
    const customer = await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null);
    const current = await accessFormalQuote({ tenantSlug, storeSlug, quoteId: params.quoteId, token, customerId: customer?.id, customerEmail: customer?.email, markViewed: true });
    if (!current) return json({ ok: false, error: 'Quote was not found or access has expired.' }, { status: 404, headers: limit.headers });
    if (current.totalMinor <= 0) return json({ ok: false, error: 'This enquiry has not been priced yet. The store will send the completed quotation before approval.' }, { status: 409, headers: limit.headers });
    if (action === 'decline') { const quote = await decideFormalQuote({ tenantSlug, storeSlug, quoteId: current.id, decision: 'declined', token, customerId: customer?.id, customerEmail: customer?.email, note: clean(body.note) }); return json({ ok: true, data: safeQuote(quote) }, { headers: limit.headers }); }
    const approved = current.status === 'approved' || current.status === 'converted' || current.status === 'paid' ? current : await decideFormalQuote({ tenantSlug, storeSlug, quoteId: current.id, decision: 'approved', token, customerId: customer?.id, customerEmail: customer?.email, note: clean(body.note) });
    const converted = await convertFormalQuoteToOrder(request, tenantSlug, approved.id, new URL(request.url).origin);
    return json({ ok: true, data: safeQuote(converted.quote), orderId: converted.order.id, orderNumber: converted.order.orderNumber, paymentUrl: converted.paymentUrl }, { headers: limit.headers });
  } catch (error) { return json({ ok: false, source: 'formal-quote-customer-action', error: error instanceof Error ? error.message : 'Quote action failed.' }, { status: 400, headers: limit.headers }); }
}
