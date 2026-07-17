import { platformPrisma } from '@/core/db/platform-prisma';
import { loadTenantThemeCategories, loadTenantThemeProducts, type ThemeCategoryCard, type ThemeProductCard } from '@/themes/atlantis-native/catalog-adapter';
import { loadStorefrontRuntimeSettings, resolveStorefrontTenantIds } from '@/theme-runtime/storefront-settings-loader';

const PRODUCT_RESOURCES = ['products', 'catalog-products', 'storefront-products', 'print-products'];
const MAX_LIMIT = 48;

export type StorefrontCatalogSearchSort = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';
export type StorefrontCatalogBuyingMode = 'all' | 'cart' | 'quote';

export type StorefrontCatalogSearchProduct = {
  kind: 'product';
  slug: string;
  categorySlug: string;
  categoryTitle: string;
  title: string;
  description: string;
  image: string;
  price: string;
  priceFromMinor: number;
  currency: string;
  buyingMode: 'cart' | 'quote';
  sku: string;
  tags: string[];
  href: string;
  score: number;
  updatedAt: string;
};

export type StorefrontCatalogSearchCategory = {
  kind: 'category';
  slug: string;
  title: string;
  description: string;
  image: string;
  productCount: number;
  href: string;
  score: number;
};

export type StorefrontCatalogSearchResult = {
  query: string;
  sort: StorefrontCatalogSearchSort;
  filters: {
    category: string;
    buyingMode: StorefrontCatalogBuyingMode;
    minPriceMinor: number | null;
    maxPriceMinor: number | null;
  };
  products: StorefrontCatalogSearchProduct[];
  categories: StorefrontCatalogSearchCategory[];
  suggestions: Array<StorefrontCatalogSearchProduct | StorefrontCatalogSearchCategory>;
  facets: {
    categories: Array<{ slug: string; title: string; count: number }>;
    buyingModes: Array<{ value: 'cart' | 'quote'; label: string; count: number }>;
    price: { minMinor: number; maxMinor: number };
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  evaluatedAt: string;
};

type SearchInput = {
  tenantSlug: string;
  storeSlug: string;
  query?: string;
  category?: string;
  buyingMode?: string;
  minPriceMinor?: number | null;
  maxPriceMinor?: number | null;
  sort?: string;
  page?: number;
  limit?: number;
};

type ProductMeta = { sku: string; tags: string[]; optionText: string; updatedAt: string };

function text(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return text(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function normal(value: unknown) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function money(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0; }
function safeSort(value: unknown): StorefrontCatalogSearchSort { return ['relevance', 'price-asc', 'price-desc', 'name-asc', 'name-desc', 'newest'].includes(text(value)) ? text(value) as StorefrontCatalogSearchSort : 'relevance'; }
function safeBuyingMode(value: unknown): StorefrontCatalogBuyingMode { return ['cart', 'quote'].includes(text(value)) ? text(value) as StorefrontCatalogBuyingMode : 'all'; }
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => typeof item === 'object' && item ? [text((item as any).label || (item as any).name || (item as any).value)] : [text(item)]).filter(Boolean);
  if (typeof value === 'string') return value.split(/[;,|\n]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}
function flattenOptions(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value.flatMap((group: any) => [group?.key, group?.label, group?.name, ...list(group?.values)]).map(text).filter(Boolean).join(' ');
}
function published(status: string) { return ['published', 'active', 'live'].includes(text(status).toLowerCase()); }

async function loadMetadata(tenantIds: string[]) {
  const map = new Map<string, ProductMeta>();
  for (const tenantId of tenantIds) {
    for (const resource of PRODUCT_RESOURCES) {
      const rows = await platformPrisma.coreCatalogRecord.findMany({ where: { tenantId, resource }, select: { slug: true, metadataJson: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 500 }).catch(() => [] as any[]);
      for (const row of rows) {
        const meta = row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson as any : {};
        const productSlug = slug(meta.slug || row.slug || meta.title || meta.name);
        if (!productSlug || map.has(productSlug)) continue;
        map.set(productSlug, {
          sku: text(meta.sku || meta.productSku || meta.productCode || meta.code || meta.reference),
          tags: [...new Set([...list(meta.tags), ...list(meta.keywords), ...list(meta.searchTerms), ...list(meta.collections)])],
          optionText: flattenOptions(meta.optionGroups || meta.options),
          updatedAt: row.updatedAt?.toISOString?.() || '',
        });
      }
    }
  }
  return map;
}

function productScore(product: ThemeProductCard, meta: ProductMeta | undefined, categoryTitle: string, query: string) {
  if (!query) return 1;
  const q = normal(query);
  const tokens = q.split(' ').filter(Boolean);
  const title = normal(product.title);
  const sku = normal(meta?.sku);
  const productSlug = normal(product.slug);
  const category = normal(`${product.category} ${categoryTitle}`);
  const tags = normal(meta?.tags.join(' '));
  const description = normal(product.text);
  const options = normal(meta?.optionText);
  let score = 0;
  if (sku && sku === q) score += 1400;
  else if (sku && sku.startsWith(q)) score += 1050;
  else if (sku && sku.includes(q)) score += 800;
  if (title === q) score += 1200;
  else if (title.startsWith(q)) score += 900;
  else if (title.includes(q)) score += 650;
  if (productSlug === q) score += 850;
  else if (productSlug.includes(q)) score += 450;
  if (category.includes(q)) score += 340;
  if (tags.includes(q)) score += 300;
  if (description.includes(q)) score += 220;
  if (options.includes(q)) score += 160;
  for (const token of tokens) {
    if (title.includes(token)) score += 90;
    if (sku.includes(token)) score += 80;
    if (category.includes(token)) score += 45;
    if (tags.includes(token)) score += 35;
    if (description.includes(token)) score += 20;
    if (options.includes(token)) score += 15;
  }
  return score;
}

function categoryScore(category: ThemeCategoryCard, query: string) {
  if (!query) return 0;
  const q = normal(query);
  const title = normal(category.title);
  const categorySlug = normal(category.slug);
  const description = normal(category.description);
  if (title === q || categorySlug === q) return 1100;
  if (title.startsWith(q) || categorySlug.startsWith(q)) return 780;
  if (title.includes(q) || categorySlug.includes(q)) return 560;
  if (description.includes(q)) return 220;
  const tokens = q.split(' ').filter(Boolean);
  return tokens.reduce((score, token) => score + (title.includes(token) ? 90 : 0) + (description.includes(token) ? 20 : 0), 0);
}

function productHref(base: string, product: ThemeProductCard) { return `${base}/${product.category}/${product.slug}`; }
function categoryHref(base: string, category: ThemeCategoryCard) { return `${base}/${category.slug}`; }

export async function searchStorefrontCatalog(input: SearchInput): Promise<StorefrontCatalogSearchResult> {
  const tenantSlug = slug(input.tenantSlug);
  const storeSlug = slug(input.storeSlug);
  const tenantIds = await resolveStorefrontTenantIds(tenantSlug);
  const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug, tenantIds);
  if (!settings.storeFound || !published(settings.storeStatus)) throw new Error('The requested storefront is not available.');

  const [products, categories, metadata] = await Promise.all([
    loadTenantThemeProducts(tenantIds),
    loadTenantThemeCategories(tenantIds),
    loadMetadata(tenantIds),
  ]);
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const query = text(input.query).slice(0, 120);
  const categoryFilter = slug(input.category);
  const buyingMode = safeBuyingMode(input.buyingMode);
  const minPriceMinor = input.minPriceMinor === null || input.minPriceMinor === undefined ? null : money(input.minPriceMinor);
  const maxPriceMinor = input.maxPriceMinor === null || input.maxPriceMinor === undefined ? null : money(input.maxPriceMinor);
  const sort = safeSort(input.sort);
  const base = `/native-stores/${tenantSlug}/${storeSlug}`;

  const rankedProducts = products.map((product) => {
    const meta = metadata.get(product.slug);
    const category = categoryBySlug.get(product.category);
    const score = productScore(product, meta, category?.title || product.category, query);
    return {
      kind: 'product' as const,
      slug: product.slug,
      categorySlug: product.category,
      categoryTitle: category?.title || product.category.replace(/-/g, ' '),
      title: product.title,
      description: product.text,
      image: product.image,
      price: product.price,
      priceFromMinor: money(product.priceFromMinor),
      currency: text(product.currency || 'GBP'),
      buyingMode: product.buyingMode === 'quote' ? 'quote' as const : 'cart' as const,
      sku: meta?.sku || '',
      tags: meta?.tags || [],
      href: productHref(base, product),
      score,
      updatedAt: meta?.updatedAt || '',
    };
  }).filter((product) => (!query || product.score > 0));

  const queryProducts = rankedProducts;
  const facetCategories = categories.map((category) => ({ slug: category.slug, title: category.title, count: queryProducts.filter((product) => product.categorySlug === category.slug).length })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  const facetModes = ([['cart', 'Buy online'], ['quote', 'Request quote']] as const).map(([value, label]) => ({ value, label, count: queryProducts.filter((product) => product.buyingMode === value).length }));
  const priced = queryProducts.map((product) => product.priceFromMinor).filter((value) => value > 0);

  let filtered = queryProducts.filter((product) => !categoryFilter || product.categorySlug === categoryFilter);
  if (buyingMode !== 'all') filtered = filtered.filter((product) => product.buyingMode === buyingMode);
  if (minPriceMinor !== null) filtered = filtered.filter((product) => product.priceFromMinor >= minPriceMinor);
  if (maxPriceMinor !== null) filtered = filtered.filter((product) => product.priceFromMinor > 0 && product.priceFromMinor <= maxPriceMinor);

  filtered.sort((a, b) => {
    if (sort === 'price-asc') return (a.priceFromMinor || Number.MAX_SAFE_INTEGER) - (b.priceFromMinor || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title);
    if (sort === 'price-desc') return b.priceFromMinor - a.priceFromMinor || a.title.localeCompare(b.title);
    if (sort === 'name-asc') return a.title.localeCompare(b.title);
    if (sort === 'name-desc') return b.title.localeCompare(a.title);
    if (sort === 'newest') return String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.title.localeCompare(b.title);
    return b.score - a.score || a.title.localeCompare(b.title);
  });

  const matchingCategories = categories.map((category) => ({
    kind: 'category' as const,
    slug: category.slug,
    title: category.title,
    description: category.description,
    image: category.image,
    productCount: category.productCount,
    href: categoryHref(base, category),
    score: categoryScore(category, query),
  })).filter((category) => query && category.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 12);

  const page = Math.max(1, Math.round(Number(input.page || 1)));
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.round(Number(input.limit || 24))));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const pageProducts = filtered.slice((safePage - 1) * limit, safePage * limit);
  const suggestions = [...matchingCategories.slice(0, 4), ...filtered.slice(0, 8)].sort((a, b) => b.score - a.score).slice(0, 10);

  return {
    query,
    sort,
    filters: { category: categoryFilter, buyingMode, minPriceMinor, maxPriceMinor },
    products: pageProducts,
    categories: matchingCategories,
    suggestions,
    facets: {
      categories: facetCategories,
      buyingModes: facetModes,
      price: { minMinor: priced.length ? Math.min(...priced) : 0, maxMinor: priced.length ? Math.max(...priced) : 0 },
    },
    pagination: { page: safePage, limit, total, totalPages },
    evaluatedAt: new Date().toISOString(),
  };
}
