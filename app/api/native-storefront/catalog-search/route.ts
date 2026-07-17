import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { searchStorefrontCatalog } from '@/core/storefront/catalog-search.service';
import { loadTenantThemeCategories, loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import { loadStorefrontRuntimeSettings, resolveStorefrontTenantIds } from '@/theme-runtime/storefront-settings-loader';

export const dynamic = 'force-dynamic';

function clean(value: unknown) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function published(status: string) { return ['published', 'active', 'live'].includes(String(status || '').toLowerCase()); }

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantSlug = clean(url.searchParams.get('tenantSlug'));
  const storeSlug = clean(url.searchParams.get('storeSlug'));
  const rateLimit = publicRateLimit(request, { scope: 'native-catalog-search', limit: 90, windowMs: 5 * 60 * 1000, identifier: `${tenantSlug}:${storeSlug}` });
  if (rateLimit.enforced) return NextResponse.json({ ...rateLimitPayload(rateLimit), source: 'native-storefront-catalog-search' }, { status: 429, headers: rateLimit.headers });
  if (!tenantSlug || !storeSlug) return NextResponse.json({ ok: false, error: 'Tenant and store are required.' }, { status: 400, headers: rateLimit.headers });
  try {
    const tenantIds = await resolveStorefrontTenantIds(tenantSlug);
    const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug, tenantIds);
    if (!settings.storeFound || !published(settings.storeStatus)) return NextResponse.json({ ok: false, error: 'Storefront was not found.' }, { status: 404, headers: rateLimit.headers });
    const products = await loadTenantThemeProducts(tenantIds);
    const categories = await loadTenantThemeCategories(tenantIds, products);
    const data = searchStorefrontCatalog({ query: url.searchParams.get('q') || '', category: url.searchParams.get('category') || '', buyingMode: url.searchParams.get('buyingMode') || '', sort: url.searchParams.get('sort') || 'relevance', limit: Number(url.searchParams.get('limit') || 12), products, categories, storeBase: `/native-stores/${tenantSlug}/${storeSlug}` });
    return NextResponse.json({ ok: true, source: 'native-storefront-catalog-search', data }, { headers: { ...rateLimit.headers, 'Cache-Control': 'private, max-age=20' } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'native-storefront-catalog-search', error: error instanceof Error ? error.message : 'Catalog search failed.' }, { status: 500, headers: rateLimit.headers });
  }
}
