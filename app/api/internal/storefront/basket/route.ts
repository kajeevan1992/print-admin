import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import {
  addOrUpdateBasketLine,
  basketCookieName,
  basketSummary,
  loadPersistentBasket,
  newBasketId,
  removeBasketLine,
  updateBasketLineArtwork,
  type BasketLineInput,
} from '@/core/storefront/persistent-basket.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function json(data: Record<string, unknown>, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers || {}) } }); }
function requestStore(request: NextRequest, body: Record<string, any> = {}) {
  const url = new URL(request.url);
  return {
    tenantSlug: slug(body.tenantSlug || body.tenantId || url.searchParams.get('tenantSlug') || url.searchParams.get('tenantId')),
    storeSlug: slug(body.storeSlug || url.searchParams.get('storeSlug')),
  };
}
function basketIdFor(request: NextRequest, tenantSlug: string, storeSlug: string, create = false) {
  const name = basketCookieName(tenantSlug, storeSlug);
  return { name, id: clean(request.cookies.get(name)?.value) || (create ? newBasketId() : '') };
}
function setBasketCookie(response: NextResponse, name: string, id: string) {
  response.cookies.set(name, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
function limit(request: NextRequest, tenantSlug: string, storeSlug: string, action: string) {
  return publicRateLimit(request, { scope: `storefront-basket-${action}`, limit: action === 'read' ? 240 : 90, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug].filter(Boolean).join(':') });
}
function lineInput(body: Record<string, any>): BasketLineInput {
  return {
    lineId: clean(body.lineId),
    productSlug: slug(body.productSlug || body.productId),
    categorySlug: slug(body.categorySlug),
    productName: clean(body.productName || body.productTitle),
    selectedOptions: Array.isArray(body.selectedOptions) ? body.selectedOptions : [],
    quantity: Number(body.quantity || 1),
    delivery: clean(body.delivery || body.selectedDelivery || body.turnaround),
    customSize: body.customSize && typeof body.customSize === 'object' && !Array.isArray(body.customSize) ? body.customSize : null,
    artwork: body.artwork && typeof body.artwork === 'object' && !Array.isArray(body.artwork) ? body.artwork : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantSlug, storeSlug } = requestStore(request);
    const rateLimit = limit(request, tenantSlug, storeSlug, 'read');
    if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'persistent-storefront-basket' }, { status: 429, headers: rateLimit.headers });
    if (!tenantSlug || !storeSlug) return json({ ok: false, error: 'Missing tenantSlug or storeSlug.' }, { status: 400, headers: rateLimit.headers });
    const cookie = basketIdFor(request, tenantSlug, storeSlug, false);
    if (!cookie.id) return json({ ok: true, source: 'persistent-storefront-basket', basket: null, summary: { basketId: '', lineCount: 0, itemCount: 0, currency: 'GBP', netMinor: 0, vatMinor: 0, grossMinor: 0, formattedTotal: '£0.00' } }, { headers: rateLimit.headers });
    const basket = await loadPersistentBasket(request, tenantSlug, storeSlug, cookie.id, { reprice: true, persistRefresh: false });
    return json({ ok: true, source: 'persistent-storefront-basket', basket, summary: basketSummary(basket) }, { headers: rateLimit.headers });
  } catch (error) {
    return json({ ok: false, source: 'persistent-storefront-basket', error: error instanceof Error ? error.message : 'Basket could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantSlug, storeSlug } = requestStore(request, body);
    const rateLimit = limit(request, tenantSlug, storeSlug, 'write');
    if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'persistent-storefront-basket' }, { status: 429, headers: rateLimit.headers });
    if (!tenantSlug || !storeSlug || !slug(body.productSlug || body.productId)) return json({ ok: false, error: 'Missing tenant, store or product.' }, { status: 400, headers: rateLimit.headers });
    const cookie = basketIdFor(request, tenantSlug, storeSlug, true);
    const basket = await addOrUpdateBasketLine(request, tenantSlug, storeSlug, cookie.id, lineInput(body));
    const response = json({ ok: true, source: 'persistent-storefront-basket', basket, summary: basketSummary(basket), lineId: clean(body.lineId) || basket.lines[basket.lines.length - 1]?.id || '' }, { headers: rateLimit.headers });
    setBasketCookie(response, cookie.name, cookie.id);
    return response;
  } catch (error) {
    return json({ ok: false, source: 'persistent-storefront-basket', error: error instanceof Error ? error.message : 'Basket line could not be saved.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantSlug, storeSlug } = requestStore(request, body);
    const lineId = clean(body.lineId);
    const rateLimit = limit(request, tenantSlug, storeSlug, 'write');
    if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'persistent-storefront-basket' }, { status: 429, headers: rateLimit.headers });
    if (!tenantSlug || !storeSlug || !lineId) return json({ ok: false, error: 'Missing tenant, store or basket line.' }, { status: 400, headers: rateLimit.headers });
    const cookie = basketIdFor(request, tenantSlug, storeSlug, false);
    if (!cookie.id) return json({ ok: false, error: 'Basket was not found.' }, { status: 404, headers: rateLimit.headers });
    const basket = body.action === 'artwork'
      ? await updateBasketLineArtwork(request, tenantSlug, storeSlug, cookie.id, lineId, body.artwork || {})
      : await addOrUpdateBasketLine(request, tenantSlug, storeSlug, cookie.id, lineInput(body));
    return json({ ok: true, source: 'persistent-storefront-basket', basket, summary: basketSummary(basket), lineId }, { headers: rateLimit.headers });
  } catch (error) {
    return json({ ok: false, source: 'persistent-storefront-basket', error: error instanceof Error ? error.message : 'Basket line could not be updated.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantSlug, storeSlug } = requestStore(request, body);
    const lineId = clean(body.lineId || new URL(request.url).searchParams.get('lineId'));
    const rateLimit = limit(request, tenantSlug, storeSlug, 'write');
    if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'persistent-storefront-basket' }, { status: 429, headers: rateLimit.headers });
    if (!tenantSlug || !storeSlug || !lineId) return json({ ok: false, error: 'Missing tenant, store or basket line.' }, { status: 400, headers: rateLimit.headers });
    const cookie = basketIdFor(request, tenantSlug, storeSlug, false);
    if (!cookie.id) return json({ ok: false, error: 'Basket was not found.' }, { status: 404, headers: rateLimit.headers });
    const basket = await removeBasketLine(request, tenantSlug, storeSlug, cookie.id, lineId);
    return json({ ok: true, source: 'persistent-storefront-basket', basket, summary: basketSummary(basket), removedLineId: lineId }, { headers: rateLimit.headers });
  } catch (error) {
    return json({ ok: false, source: 'persistent-storefront-basket', error: error instanceof Error ? error.message : 'Basket line could not be removed.' }, { status: 500 });
  }
}
