import StorefrontChrome from './StorefrontChrome';
import CatalogSearchPanel from './CatalogSearchPanel';
import type { NavItem } from './types';
import type { StorefrontRuntimeSearchParams, StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeRouteViews } from '@/v0-themes/contracts';
import { buildV0ThemePageContext } from '@/theme-runtime/v0-view-props';
import { searchStorefrontCatalog } from '@/theme-runtime/catalog-search.service';
import { BRAND } from './theme-helpers';

function integer(value: string | undefined, fallback: number) { const next = Number(value); return Number.isFinite(next) ? Math.round(next) : fallback; }
function optionalMinor(value: string | undefined) { if (!value) return null; const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : null; }

export default async function CatalogSearchPage({ tenantSlug, storeSlug, storeBase, navItems, settings, routeViews, searchParams = {} }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews; searchParams?: StorefrontRuntimeSearchParams }) {
  const initialResult = await searchStorefrontCatalog({
    tenantSlug,
    storeSlug,
    query: searchParams.q || '',
    category: searchParams.category || '',
    buyingMode: searchParams.buyingMode || 'all',
    minPriceMinor: optionalMinor(searchParams.minPriceMinor),
    maxPriceMinor: optionalMinor(searchParams.maxPriceMinor),
    sort: searchParams.sort || 'relevance',
    page: integer(searchParams.page, 1),
    limit: 24,
  });
  const currentPath = '/search';
  const panel = <CatalogSearchPanel tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} initialResult={initialResult} appearance={settings.layout?.widgetAppearance} brand={settings.brand} />;

  if (routeViews?.SearchPage) {
    const View = routeViews.SearchPage;
    return <View {...buildV0ThemePageContext({ storeBase, currentPath, navItems, settings })} query={initialResult.query} productCount={initialResult.pagination.total} categoryCount={initialResult.categories.length} products={initialResult.products.map((product) => ({ slug: product.slug, categorySlug: product.categorySlug, categoryTitle: product.categoryTitle, title: product.title, description: product.description, image: product.image, price: product.price, sku: product.sku, buyingMode: product.buyingMode, href: product.href }))} categories={initialResult.categories.map((category) => ({ slug: category.slug, title: category.title, description: category.description, image: category.image, productCount: category.productCount, href: category.href }))} slots={{ search: panel }} />;
  }

  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings}><section className="border-b bg-white" style={{ borderColor: BRAND.line }}><div className="mx-auto w-full max-w-[1360px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Full catalogue search</div><h1 className="mt-3 max-w-[900px] text-[44px] font-black leading-[0.96] tracking-[-0.065em] sm:text-[58px]" style={{ color: BRAND.ink }}>{initialResult.query ? `Search results for “${initialResult.query}”` : 'Find the right print product.'}</h1><p className="mt-5 max-w-[760px] text-[14px] leading-8" style={{ color: BRAND.muted }}>Search published products, categories and SKUs, then refine the results by buying method, price and sorting.</p></div></section><section className="py-10"><div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{panel}</div></section></StorefrontChrome>;
}
