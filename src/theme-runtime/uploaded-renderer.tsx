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

function safeProduct(product: StorefrontRuntimeContext['products'][number], context: StorefrontRuntimeContext) {
  return {
    slug: product.slug,
    category: product.category,
    title: product.title,
    text: product.text,
    image: product.image,
    badge: product.badge,
    price: product.price,
    href: storeHref(context, `/${product.category}/${product.slug}`),
  };
}

function safeCategory(category: NonNullable<StorefrontRuntimeContext['categories']>[number], context: StorefrontRuntimeContext) {
  return {
    slug: category.slug,
    title: category.title,
    description: category.description,
    productCount: category.productCount,
    sortOrder: category.sortOrder,
    image: category.image,
    path: `/${category.slug}`,
    href: storeHref(context, `/${category.slug}`),
  };
}

function safeNavItem(item: StorefrontRuntimeContext['navItems'][number], context: StorefrontRuntimeContext) {
  return {
    label: item.label,
    path: item.path,
    href: storeHref(context, item.path),
  };
}

function safeCollectionPoint(point: NonNullable<StorefrontRuntimeContext['collectionPoints']>[number], context: StorefrontRuntimeContext) {
  return {
    slug: point.slug,
    name: point.name,
    address: point.address,
    note: point.note,
    status: point.status,
    href: storeHref(context, `/collection-points#${point.slug}`),
  };
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

function storefrontProducts(context: StorefrontRuntimeContext) {
  return context.products.map((product) => safeProduct(product, context));
}

function fallbackCategories(context: StorefrontRuntimeContext) {
  const counts = new Map<string, number>();
  storefrontProducts(context).forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
  return Array.from(counts.entries()).map(([slug, productCount]) => ({ slug, title: titleFromSlug(slug), description: `${productCount} print products available.`, productCount, sortOrder: 999, image: '', path: `/${slug}`, href: storeHref(context, `/${slug}`) }));
}

function catalogCategories(context: StorefrontRuntimeContext) {
  const directCategories = (context.categories || []).map((category) => safeCategory(category, context));
  return directCategories.length ? directCategories : fallbackCategories(context);
}

function productsForCategory(context: StorefrontRuntimeContext, categorySlug?: string) {
  return categorySlug ? storefrontProducts(context).filter((product) => product.category === categorySlug) : [];
}

function collectionPoints(context: StorefrontRuntimeContext) {
  return (context.collectionPoints || []).map((point) => safeCollectionPoint(point, context));
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
  const store = storeIdentity(context);
  if (selected.selectedProduct) return { title: selected.selectedProduct.title, description: selected.selectedProduct.text, canonicalHref: selected.selectedProduct.href };
  if (selected.selectedCategory) return { title: selected.selectedCategory.title, description: selected.selectedCategory.description, canonicalHref: selected.selectedCategory.href };
  if (type === 'collection-points') return { title: 'Collection Points', description: '', canonicalHref: storeHref(context, '/collection-points') };
  return { title: store.name, description: '', canonicalHref: storeHref(context) };
}

function seoMetadata(context: StorefrontRuntimeContext, selected: ReturnType<typeof selectedCatalogItem>) {
  const page = pageMetadata(context, selected);
  const store = storeIdentity(context);
  const crumbs = breadcrumbs(context, selected);
  const image = selected.selectedProduct?.image || selected.selectedCategory?.image || '';
  return {
    title: page.title,
    description: page.description,
    canonicalHref: page.canonicalHref,
    robots: { index: true, follow: true },
    openGraph: {
      title: page.title,
      description: page.description,
      image,
      type: selected.selectedProduct ? 'product' : 'website',
    },
    structuredData: {
      organization: { name: store.name, url: store.homeHref },
      breadcrumbs: crumbs.map((item, index) => ({ position: index + 1, name: item.label, item: item.href })),
    },
  };
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
    seo: seoMetadata(context, selected),
    breadcrumbs: breadcrumbs(context, selected),
    navItems: context.navItems.map((item) => safeNavItem(item, context)),
    products: storefrontProducts(context),
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
