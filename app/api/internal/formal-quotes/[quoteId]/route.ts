import { NextRequest, NextResponse } from 'next/server';
import { getFormalQuote, issueFormalQuoteAccess, updateFormalQuote } from '@/core/quotes/formal-quotes.service';
import { queueFormalQuoteEmail } from '@/core/quotes/formal-quote-notifications.service';
import { convertFormalQuoteToOrder } from '@/core/quotes/formal-quote-order.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest, { params }: { params: { quoteId: string } }) {
  try { const ctx = tenantContextFromRequest(request); const quote = await getFormalQuote(ctx.tenantId, params.quoteId, { includeRevisions: true }); if (!quote) return json({ ok: false, error: 'Quote was not found.' }, { status: 404 }); return json({ ok: true, data: quote }); }
  catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'Quote could not be loaded.' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: { params: { quoteId: string } }) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = clean(body.action || 'update').toLowerCase();
    const existing = await getFormalQuote(ctx.tenantId, params.quoteId, { includeRevisions: true });
    if (!existing) return json({ ok: false, error: 'Quote was not found.' }, { status: 404 });

    if (action === 'send') {
      const access = await issueFormalQuoteAccess(ctx.tenantId, existing.id);
      const origin = new URL(request.url).origin;
      const base = `/native-stores/${access.quote!.tenantSlug}/${access.quote!.storeSlug}`;
      const accessUrl = `${origin}${base}/quote-status/${encodeURIComponent(existing.id)}?token=${encodeURIComponent(access.token)}`;
      const documentUrl = `${origin}/api/native-storefront/quotes/${encodeURIComponent(existing.id)}/document?tenantSlug=${encodeURIComponent(access.quote!.tenantSlug)}&storeSlug=${encodeURIComponent(access.quote!.storeSlug)}&token=${encodeURIComponent(access.token)}`;
      const email = await queueFormalQuoteEmail(request, access.quote!, { accessUrl, documentUrl, note: clean(body.note) });
      return json({ ok: true, data: access.quote, accessUrl, documentUrl, email });
    }

    if (action === 'convert' || action === 'payment') {
      const approved = existing.status === 'approved' ? existing : await updateFormalQuote(ctx.tenantId, existing.id, { status: 'approved' }, { type: 'admin', action: 'approved', note: clean(body.note) || 'Approved by admin' });
      const result = await convertFormalQuoteToOrder(request, ctx.tenantId, approved!.id, new URL(request.url).origin);
      return json({ ok: true, data: result.quote, order: result.order, paymentUrl: result.paymentUrl });
    }

    const quote = await updateFormalQuote(ctx.tenantId, existing.id, {
      customerId: body.customerId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerCompany: body.customerCompany,
      title: body.title,
      status: body.status,
      currency: body.currency,
      customerNotes: body.customerNotes,
      internalNotes: body.internalNotes,
      expiresAt: body.expiresAt,
      lines: Array.isArray(body.lines) ? body.lines : undefined,
    }, { type: 'admin', id: clean(body.actorId), action, note: clean(body.note) || 'Quote edited in admin' });
    return json({ ok: true, data: quote });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : 'Quote action failed.' }, { status: 400 }); }
}
