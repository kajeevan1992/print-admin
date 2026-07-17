import { NextRequest, NextResponse } from 'next/server';
import { createFormalQuote } from '@/core/quotes/formal-quotes.service';
import { customerFromRequest } from '@/core/storefront/customer-account.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value as any).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function titleFromSlug(value: string) { return String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function parseSelectedOptions(value: string) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const tenantSlug = slug(form.get('tenantSlug'));
    const storeSlug = slug(form.get('storeSlug'));
    const productSlug = slug(form.get('productSlug'));
    const categorySlug = slug(form.get('categorySlug'));
    let customerName = clean(form.get('customerName'));
    let customerEmail = clean(form.get('email')).toLowerCase();
    let customerPhone = clean(form.get('phone'));
    const quantity = Math.max(1, Number(clean(form.get('quantity'))) || 1);
    const deadline = clean(form.get('deadline'));
    const artworkStatus = clean(form.get('artworkStatus')) || 'send-later';
    const notes = clean(form.get('notes'));
    const selectedOptions = parseSelectedOptions(clean(form.get('selectedOptions'))).map((item: any) => ({ key: clean(item?.key), label: clean(item?.label || item?.key), value: clean(item?.value || item?.slug), slug: slug(item?.slug || item?.value) })).filter((item: any) => item.label && item.value);
    const customer = tenantSlug && storeSlug ? await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null) : null;
    if (customer) { customerName = customer.name || customerName; customerEmail = customer.email; customerPhone = customerPhone || customer.phone; }
    const limit = publicRateLimit(request, { scope: 'native-formal-quote-request', limit: 12, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug, customerEmail || customerPhone].filter(Boolean).join(':') });
    if (limit.enforced) return NextResponse.json({ ...rateLimitPayload(limit), source: 'formal-quote-request' }, { status: 429, headers: limit.headers });
    if (!tenantSlug || !storeSlug || !productSlug || !customerName || (!customerEmail && !customerPhone)) return NextResponse.json({ ok: false, error: 'Missing required quote request details.' }, { status: 400, headers: limit.headers });

    const quote = await createFormalQuote({
      tenantSlug,
      storeSlug,
      customerId: customer?.id,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany: customer?.company,
      title: `${titleFromSlug(productSlug) || 'Print'} quotation`,
      status: 'requested',
      customerNotes: notes,
      internalNotes: deadline ? `Customer requested completion by ${deadline}.` : '',
      lines: [{ productId: productSlug, productSlug, categorySlug, productName: titleFromSlug(productSlug) || 'Print item', quantity, unitNetMinor: 0, vatRate: 0, selectedOptions, metadataJson: { source: 'native-storefront-request', artworkStatus, deadline, selectedOptions } }],
      actorType: customer ? 'customer-account' : 'storefront-guest',
      actorId: customer?.id || customerEmail || customerPhone,
    });
    if (!quote) throw new Error('Quote could not be created.');
    const redirect = new URL(`/native-stores/${tenantSlug}/${storeSlug}/${categorySlug}/${productSlug}`, request.url);
    redirect.searchParams.set('quote', quote.quoteNumber);
    redirect.searchParams.set('quoteStatus', quote.status);
    return NextResponse.redirect(redirect, { status: 303, headers: limit.headers });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'formal-quote-request', error: error instanceof Error ? error.message : 'Quote request failed.' }, { status: 400 });
  }
}
