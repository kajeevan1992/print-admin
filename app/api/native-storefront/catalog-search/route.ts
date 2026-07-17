import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { searchStorefrontCatalog } from '@/theme-runtime/catalog-search.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function integer(value: unknown, fallback: number) { const next = Number(value); return Number.isFinite(next) ? Math.round(next) : fallback; }
function optionalMinor(value: string | null) { if (value === null || value.trim() === '') return null; const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : null; }

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tenantSlug = slug(params.get('tenantSlug'));
  const storeSlug = slug(params.get('storeSlug'));
  const query = clean(params.get('q')).slice(0, 120);
  const rateLimit = publicRateLimit(request, { scope: 'storefront-catalog-search', limit: 180, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug, query.toLowerCase()].filter(Boolean).join(':') });
  if (rateLimit.enforced) return NextResponse.json({ ...rateLimitPayload(rateLimit), source: 'storefront-catalog-search' }, { status: 429, headers: rateLimit.headers });
  if (!tenantSlug || !storeSlug) return NextResponse.json({ ok: false, error: 'Tenant and store are required.' }, { status: 400, headers: rateLimit.headers });

  try {
    const result = await searchStorefrontCatalog({
      tenantSlug,
      storeSlug,
      query,
      category: params.get('category') || '',
      buyingMode: params.get('buyingMode') || 'all',
      minPriceMinor: optionalMinor(params.get('minPriceMinor')),
      maxPriceMinor: optionalMinor(params.get('maxPriceMinor')),
      sort: params.get('sort') || 'relevance',
      page: integer(params.get('page'), 1),
      limit: integer(params.get('limit'), 24),
    });
    return NextResponse.json({ ok: true, source: 'storefront-catalog-search', result }, { headers: { ...rateLimit.headers, 'Cache-Control': query ? 'private, max-age=15' : 'private, max-age=30' } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'storefront-catalog-search', error: error instanceof Error ? error.message : 'Catalogue search failed.' }, { status: 400, headers: rateLimit.headers });
  }
}
