import { NextRequest, NextResponse } from 'next/server';
import { createFormalQuote, listFormalQuotes } from '@/core/quotes/formal-quotes.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const items = await listFormalQuotes(ctx.tenantId, { storeSlug: request.nextUrl.searchParams.get('storeSlug') || '', customerEmail: request.nextUrl.searchParams.get('customerEmail') || '', status: request.nextUrl.searchParams.get('status') || '', limit: Number(request.nextUrl.searchParams.get('limit') || 300) });
    return json({ ok: true, source: 'formal-quote-ledger', data: { items } });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'Quotes could not be loaded.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const quote = await createFormalQuote({ tenantSlug: ctx.tenantId, storeSlug: clean(body.storeSlug) || 'main', customerId: clean(body.customerId), customerName: clean(body.customerName) || 'Customer', customerEmail: clean(body.customerEmail), customerPhone: clean(body.customerPhone), customerCompany: clean(body.customerCompany), title: clean(body.title) || 'Print quotation', status: body.status || 'draft', currency: clean(body.currency) || 'GBP', customerNotes: clean(body.customerNotes), internalNotes: clean(body.internalNotes), expiresAt: body.expiresAt || null, lines: Array.isArray(body.lines) ? body.lines : [], actorType: 'admin', actorId: clean(body.actorId) });
    return json({ ok: true, source: 'formal-quote-ledger', data: quote }, { status: 201 });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'Quote could not be created.' }, { status: 400 }); }
}
