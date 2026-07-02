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

function titleFromSlug(slug = '') {
  return String(slug || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function storeIdentity(context: StorefrontRuntimeContext) {
  return {
    tenantSlug: context.tenantSlug,
    storeSlug: context.storeSlug,
    name: titleFromSlug(context.tenantSlug),
    storeName: titleFromSlug(context.storeSlug),
    baseHref: context.storeBase,
    homeHref: storeHref(context),
  };
}

function standardRoutes(context: StorefrontRuntimeContext) {
  return {
    home: storeHref(context),
    collectionPoints: storeHref(context, '/collection-points'),
    cart: storeHref(context, '/cart'),
    login: storeHref(context, '/login'),
    account: storeHref(context, '/account'),
    search: storeHref(context, '/search'),
  };
}

function catalogCategories(context: StorefrontRuntimeContext) {
  const counts = new Map<string, number>();
  context.products.forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
  return Array.from(counts.entries()).map(([slug, productCount]) => ({ slug, title: titleFromSlug(slug), productCount, path: `/${slug}`, href: storeHref(context, `/${slug}`) }));
}

function productsForCategory(context: StorefrontRuntimeContext, categorySlug?: string) {
  return categorySlug ? context.products.filter((product) => product.category === categorySlug).map((product) => ({ ...product, href: storeHref(context, `/${product.category}/${product.slug}`) })) : [];
}

function collectionPoints(context: StorefrontRuntimeContext) {
  return (context.collectionPoints || []).map((point) => ({ ...point, href: storeHref(context, `/collection-points#${point.slug}`) }));
}

function selectedCatalogItem(context: StorefrontRuntimeContext) {
  const [categorySlug, productSlug] = context.routeSegments;
  const selectedCategory = categorySlug ? catalogCategories(context).find((category) => category.slug === categorySlug) : undefined;
  const selectedCategoryProducts = productsForCategory(context, categorySlug);
  const selectedProduct = productSlug ? selectedCategoryProducts.find((product) => product.slug === productSlug) : undefined;
  return { selectedCategory, selectedCategoryProducts, selectedProduct };
}

function breadcrumbs(context: StorefrontRuntimeContext, selected: ReturnType<typeof selectedCatalogItem>) {
  const items = [{ label: 'Home', href: storeHref(context), current: !context.routeSegments.length }];
  if (selected.selectedCategory) items.push({ label: selected.selectedCategory.title, href: selected.selectedCategory.href, current: !selected.selectedProduct });
  if (selected.selectedProduct) items.push({ label: selected.selectedProduct.title, href: selected.selectedProduct.href, current: true });
  return items;
}

function pageMetadata(context: StorefrontRuntimeContext, selected: ReturnType<typeof selectedCatalogItem>) {
  const type = pageType(context.routeSegments);
  if (selected.selectedProduct) return { title: selected.selectedProduct.title, description: selected.selectedProduct.text, canonicalHref: selected.selectedProduct.href };
  if (selected.selectedCategory) return { title: selected.selectedCategory.title, description: `${selected.selectedCategory.productCount} print products available.`, canonicalHref: selected.selectedCategory.href };
  if (type === 'collection-points') return { title: 'Collection Points', description: 'Choose a convenient collection point for your print order.', canonicalHref: storeHref(context, '/collection-points') };
  return { title: 'Print Storefront', description: 'Order print, signage and design products online.', canonicalHref: storeHref(context) };
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
    store: storeIdentity(context),
    homeHref: storeHref(context),
    routes: standardRoutes(context),
    routeSegments: context.routeSegments,
    currentPath: `/${context.routeSegments.join('/')}`,
    pageType: pageType(context.routeSegments),
    page: pageMetadata(context, selected),
    breadcrumbs: breadcrumbs(context, selected),
    navItems: context.navItems.map((item) => ({ ...item, href: storeHref(context, item.path) })),
    products: context.products.map((product) => ({ ...product, href: storeHref(context, `/${product.category}/${product.slug}`) })),
    categories: catalogCategories(context),
    collectionPoints: collectionPoints(context),
    selectedCategory: selected.selectedCategory,
    selectedCategoryProducts: selected.selectedCategoryProducts,
    selectedProduct: selected.selectedProduct,
  };
}

export async function renderUploadedStorefrontTheme(context: StorefrontRuntimeContext) {
  const runtimeContract = getUploadedThemeRuntimeContract(context);
  return renderAtlantisStorefront({ ...context, themeManifest: runtimeContract.theme });
}
