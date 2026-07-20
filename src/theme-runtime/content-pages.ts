import type {
  StorefrontCategoryCard,
  StorefrontContentPage,
  StorefrontHomepageSection,
  StorefrontMenuItem,
  StorefrontProductCard,
} from '@/theme-runtime/types';

export const MAX_STOREFRONT_CONTENT_PAGES = 24;
export const MAX_STOREFRONT_PAGE_PATH_SEGMENTS = 3;

export const RESERVED_STOREFRONT_PAGE_ROOTS = new Set([
  'account',
  'all-products',
  'cart',
  'checkout-cancel',
  'checkout-success',
  'collection-points',
  'confirm-email-change',
  'forgot-password',
  'login',
  'quote',
  'quote-status',
  'register',
  'reset-password',
  'search',
  'two-step',
  'verify-email',
]);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function slugPart(value: unknown) {
  return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseSections(value: unknown): StorefrontHomepageSection[] {
  return array(value).map((section, index) => {
    const source = object(section);
    return {
      ...source,
      id: clean(source.id) || `section-${index + 1}`,
      type: slugPart(source.type || 'rich-text'),
      enabled: source.enabled !== false,
    };
  }).filter((section) => section.type).slice(0, 30);
}

export function normaliseStorefrontPagePath(value: unknown) {
  return clean(value)
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map(slugPart)
    .filter(Boolean)
    .slice(0, MAX_STOREFRONT_PAGE_PATH_SEGMENTS)
    .join('/');
}

export function storefrontPagePathIsReserved(value: unknown) {
  const root = normaliseStorefrontPagePath(value).split('/')[0] || '';
  return RESERVED_STOREFRONT_PAGE_ROOTS.has(root);
}

export function normaliseStorefrontContentPages(value: unknown): StorefrontContentPage[] {
  const seen = new Set<string>();
  const pages: StorefrontContentPage[] = [];

  for (const [index, row] of array(value).entries()) {
    const source = object(row);
    const path = normaliseStorefrontPagePath(source.path || source.slug);
    if (!path || seen.has(path) || storefrontPagePathIsReserved(path)) continue;
    seen.add(path);
    const title = clean(source.title) || path.split('/').map((part) => part.replace(/-/g, ' ')).map((part) => part.replace(/\b\w/g, (letter) => letter.toUpperCase())).join(' / ');
    pages.push({
      ...source,
      id: clean(source.id) || `page-${index + 1}`,
      path,
      title,
      summary: clean(source.summary || source.description),
      enabled: source.enabled !== false,
      showInNavigation: source.showInNavigation === true,
      navigationLabel: clean(source.navigationLabel || source.menuLabel || title),
      navigationOrder: Math.max(0, Math.min(10_000, number(source.navigationOrder ?? source.menuOrder, 900 + index))),
      seoTitle: clean(source.seoTitle),
      seoDescription: clean(source.seoDescription),
      socialImage: clean(source.socialImage || source.heroImage),
      noIndex: source.noIndex === true,
      sections: normaliseSections(source.sections),
    });
    if (pages.length >= MAX_STOREFRONT_CONTENT_PAGES) break;
  }

  return pages;
}

export function appendStorefrontContentPageMenuItems(
  items: StorefrontMenuItem[],
  pages: StorefrontContentPage[],
  options: { includeDisabled?: boolean } = {},
) {
  const existingPaths = new Set(items.map((item) => `/${normaliseStorefrontPagePath(item.path)}`));
  const additions = normaliseStorefrontContentPages(pages)
    .filter((page) => page.showInNavigation && (page.enabled || options.includeDisabled))
    .filter((page) => !existingPaths.has(`/${page.path}`))
    .map<StorefrontMenuItem>((page) => ({
      id: `content-page-${page.id}`,
      slug: page.path.replace(/\//g, '-'),
      label: page.navigationLabel || page.title,
      path: `/${page.path}`,
      order: page.navigationOrder,
      parentId: '',
      parentSlug: '',
      description: page.summary || page.seoDescription,
      enabled: true,
    }));
  return [...items, ...additions].sort((left, right) => left.order - right.order);
}

export function resolveStorefrontContentPage(
  pages: StorefrontContentPage[],
  routeSegments: string[],
  products: StorefrontProductCard[] = [],
  categories: StorefrontCategoryCard[] = [],
  options: { includeDisabled?: boolean } = {},
) {
  const path = normaliseStorefrontPagePath(routeSegments.join('/'));
  if (!path || storefrontPagePathIsReserved(path)) return null;
  const segments = path.split('/');
  const categoryCollision = segments.length === 1 && categories.some((category) => slugPart(category.slug) === segments[0]);
  const productCollision = segments.length >= 2 && products.some((product) => slugPart(product.category) === segments[0] && slugPart(product.slug) === segments[segments.length - 1]);
  if (categoryCollision || productCollision) return null;
  return normaliseStorefrontContentPages(pages).find((page) => page.path === path && (page.enabled || options.includeDisabled)) || null;
}
