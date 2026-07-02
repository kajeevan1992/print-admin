import { renderAtlantisStorefront } from './atlantis-renderer';
import type { StorefrontRuntimeContext } from './types';

function pageType(routeSegments: string[]) {
  if (!routeSegments.length) return 'home';
  if (routeSegments[0] === 'collection-points') return 'collection-points';
  if (routeSegments.length >= 2) return 'product';
  return 'category';
}

function storeHref(context: StorefrontRuntimeContext, path = '/') {
  const cleanPath = `/${String(path || '/').replace(/^\/+/, '')}`;
  return cleanPath === '/' ? context.storeBase : `${context.storeBase}${cleanPath}`;
}

function catalogCategories(context: StorefrontRuntimeContext) {
  const counts = new Map<string, number>();
  context.products.forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
  return Array.from(counts.entries()).map(([slug, productCount]) => ({ slug, productCount, path: `/${slug}`, href: storeHref(context, `/${slug}`) }));
}

function productsForCategory(context: StorefrontRuntimeContext, categorySlug?: string) {
  return categorySlug ? context.products.filter((product) => product.category === categorySlug).map((product) => ({ ...product, href: storeHref(context, `/${product.category}/${product.slug}`) })) : [];
}

function selectedCatalogItem(context: StorefrontRuntimeContext) {
  const [categorySlug, productSlug] = context.routeSegments;
  const selectedCategory = categorySlug ? catalogCategories(context).find((category) => category.slug === categorySlug) : undefined;
  const selectedCategoryProducts = productsForCategory(context, categorySlug);
  const selectedProduct = productSlug ? selectedCategoryProducts.find((product) => product.slug === productSlug) : undefined;
  return { selectedCategory, selectedCategoryProducts, selectedProduct };
}

export function getUploadedThemeRuntimeContract(context: StorefrontRuntimeContext) {
  const selected = selectedCatalogItem(context);
  return {
    theme: context.themeManifest,
    themeKey: context.themeKey,
    themeSource: context.themeSource,
    tenantSlug: context.tenantSlug,
    storeSlug: context.storeSlug,
    storeBase: context.storeBase,
    homeHref: storeHref(context),
    routeSegments: context.routeSegments,
    currentPath: `/${context.routeSegments.join('/')}`,
    pageType: pageType(context.routeSegments),
    navItems: context.navItems.map((item) => ({ ...item, href: storeHref(context, item.path) })),
    products: context.products.map((product) => ({ ...product, href: storeHref(context, `/${product.category}/${product.slug}`) })),
    categories: catalogCategories(context),
    selectedCategory: selected.selectedCategory,
    selectedCategoryProducts: selected.selectedCategoryProducts,
    selectedProduct: selected.selectedProduct,
  };
}

export async function renderUploadedStorefrontTheme(context: StorefrontRuntimeContext) {
  const runtimeContract = getUploadedThemeRuntimeContract(context);
  return renderAtlantisStorefront({ ...context, themeManifest: runtimeContract.theme });
}
