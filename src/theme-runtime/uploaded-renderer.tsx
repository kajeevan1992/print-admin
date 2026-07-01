import { renderAtlantisStorefront } from './atlantis-renderer';
import type { StorefrontRuntimeContext } from './types';

function pageType(routeSegments: string[]) {
  if (!routeSegments.length) return 'home';
  if (routeSegments[0] === 'collection-points') return 'collection-points';
  if (routeSegments.length >= 2) return 'product';
  return 'category';
}

function catalogCategories(context: StorefrontRuntimeContext) {
  const counts = new Map<string, number>();
  context.products.forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
  return Array.from(counts.entries()).map(([slug, productCount]) => ({ slug, productCount, path: `/${slug}` }));
}

export function getUploadedThemeRuntimeContract(context: StorefrontRuntimeContext) {
  return {
    theme: context.themeManifest,
    themeKey: context.themeKey,
    themeSource: context.themeSource,
    tenantSlug: context.tenantSlug,
    storeSlug: context.storeSlug,
    storeBase: context.storeBase,
    routeSegments: context.routeSegments,
    currentPath: `/${context.routeSegments.join('/')}`,
    pageType: pageType(context.routeSegments),
    navItems: context.navItems,
    products: context.products,
    categories: catalogCategories(context),
  };
}

export async function renderUploadedStorefrontTheme(context: StorefrontRuntimeContext) {
  const runtimeContract = getUploadedThemeRuntimeContract(context);
  return renderAtlantisStorefront({ ...context, themeManifest: runtimeContract.theme });
}
