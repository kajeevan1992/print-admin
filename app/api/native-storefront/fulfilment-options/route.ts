import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { evaluateStorefrontFulfilment } from '@/core/storefront/fulfilment-engine.service';
import { basketCookieName, loadPersistentBasket } from '@/core/storefront/persistent-basket.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }
function basketRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); const headers = new Headers(request.headers); headers.set('x-tenant-id', tenantSlug); return new Request(url.toString(), { method: 'GET', headers }); }

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tenantSlug = slug(params.get('tenantSlug'));
  const storeSlug = slug(params.get('storeSlug'));
  const postcode = clean(params.get('postcode'));
  const collectionPointSlug = slug(params.get('collectionPointSlug'));
  const selectedMethodId = clean(params.get('selectedMethodId'));
  const requestedBasketId = clean(params.get('basketId'));
  const rateLimit = publicRateLimit(request, { scope: 'storefront-fulfilment-options', limit: 90, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug, postcode].filter(Boolean).join(':') });
  if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'storefront-fulfilment-options' }, { status: 429, headers: rateLimit.headers });
  if (!tenantSlug || !storeSlug) return json({ ok: false, error: 'Tenant and store are required.' }, { status: 400, headers: rateLimit.headers });

  try {
    const cookieBasketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
    const basketId = requestedBasketId && requestedBasketId === cookieBasketId ? requestedBasketId : cookieBasketId;
    const basket = basketId ? await loadPersistentBasket(basketRequest(request, tenantSlug), tenantSlug, storeSlug, basketId, { reprice: true, persistRefresh: true }) : null;
    const evaluation = await evaluateStorefrontFulfilment({
      tenantSlug,
      storeSlug,
      postcode,
      collectionPointSlug,
      selectedMethodId,
      basketGrossMinor: basket?.grossMinor || 0,
      basketWeightKg: Number((basket as any)?.weightKg || 0),
      basketLineCount: basket?.lineCount || 0,
      basketItemCount: basket?.itemCount || 0,
    });
    return json({ ok: true, source: 'storefront-fulfilment-options', evaluation, basket: basket ? { id: basket.id, lineCount: basket.lineCount, itemCount: basket.itemCount, grossMinor: basket.grossMinor, formattedTotal: basket.formattedTotal } : null }, { headers: rateLimit.headers });
  } catch (error) {
    return json({ ok: false, source: 'storefront-fulfilment-options', error: error instanceof Error ? error.message : 'Fulfilment options could not be evaluated.' }, { status: 400, headers: rateLimit.headers });
  }
}
