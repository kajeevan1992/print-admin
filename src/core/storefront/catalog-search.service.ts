import type { ThemeCategoryCard, ThemeProductCard } from '@/themes/atlantis-native/catalog-adapter';

export type CatalogSearchSort = 'relevance' | 'name-asc' | 'name-desc' | 'price-low' | 'price-high';
export type CatalogSearchResult = {
  id: string;
  type: 'product' | 'category';
  title: string;
  description: string;
  slug: string;
  categorySlug: string;
  categoryTitle: string;
  sku: string;
  image: string;
  price: string;
  priceFromMinor: number;
  currency: string;
  buyingMode: 'cart' | 'quote' | '';
  href: string;
  score: number;
};
export type CatalogSearchResponse = {
  query: string;
  category: string;
  buyingMode: string;
  sort: CatalogSearchSort;
  total: number;
  results: CatalogSearchResult[];
  categories: Array<{ slug: string; title: string; count: number }>;
};

type SearchInput = {
  query?: string;
  category?: string;
  buyingMode?: string;
  sort?: string;
  limit?: number;
  products: ThemeProductCard[];
  categories: ThemeCategoryCard[];
  storeBase: string;
};

function clean(value: unknown) { return String(value || '').trim(); }
function normal(value: unknown) { return clean(value).toLowerCase(); }
function tokens(value: string) { return normal(value).split(/[^a-z0-9]+/).filter(Boolean); }
function includesAll(haystack: string, words: string[]) { return words.every((word) => haystack.includes(word)); }
function categoryTitle(slug: string, categories: ThemeCategoryCard[]) { return categories.find((item) => item.slug === slug)?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function scoreProduct(product: ThemeProductCard, queryTokens: string[]) {
  if (!queryTokens.length) return 1;
  const title = normal(product.title); const sku = normal(product.sku); const slug = normal(product.slug); const category = normal(product.category);
  const description = normal(product.text); const tags = normal([...(product.tags || []), ...(product.searchKeywords || [])].join(' '));
  const all = `${title} ${sku} ${slug} ${category} ${description} ${tags}`;
  if (!includesAll(all, queryTokens)) return 0;
  return queryTokens.reduce((score, word) => score + (title === word ? 80 : title.startsWith(word) ? 45 : title.includes(word) ? 30 : 0) + (sku === word ? 70 : sku.includes(word) ? 35 : 0) + (slug.includes(word) ? 20 : 0) + (category.includes(word) ? 12 : 0) + (tags.includes(word) ? 10 : 0) + (description.includes(word) ? 5 : 0), 0) + 1;
}
function scoreCategory(category: ThemeCategoryCard, queryTokens: string[]) {
  if (!queryTokens.length) return 1;
  const title = normal(category.title); const slug = normal(category.slug); const description = normal(category.description); const all = `${title} ${slug} ${description}`;
  if (!includesAll(all, queryTokens)) return 0;
  return queryTokens.reduce((score, word) => score + (title === word ? 75 : title.startsWith(word) ? 40 : title.includes(word) ? 25 : 0) + (slug.includes(word) ? 15 : 0) + (description.includes(word) ? 4 : 0), 0) + 1;
}
function safeSort(value: string): CatalogSearchSort { return ['relevance', 'name-asc', 'name-desc', 'price-low', 'price-high'].includes(value) ? value as CatalogSearchSort : 'relevance'; }

export function searchStorefrontCatalog(input: SearchInput): CatalogSearchResponse {
  const query = clean(input.query).slice(0, 120); const queryTokens = tokens(query); const category = normal(input.category); const buyingMode = normal(input.buyingMode); const sort = safeSort(normal(input.sort));
  const productResults: CatalogSearchResult[] = input.products.map((product) => ({
    id: `product:${product.slug}`, type: 'product' as const, title: product.title, description: product.text, slug: product.slug,
    categorySlug: product.category, categoryTitle: categoryTitle(product.category, input.categories), sku: product.sku || '', image: product.image,
    price: product.price, priceFromMinor: Number(product.priceFromMinor || 0), currency: product.currency || 'GBP', buyingMode: product.buyingMode || 'cart',
    href: `${input.storeBase}/${product.category}/${product.slug}`, score: scoreProduct(product, queryTokens),
  })).filter((item) => item.score > 0 && (!category || item.categorySlug === category) && (!buyingMode || item.buyingMode === buyingMode));
  const categoryResults: CatalogSearchResult[] = input.categories.map((item) => ({ id: `category:${item.slug}`, type: 'category' as const, title: item.title, description: item.description, slug: item.slug, categorySlug: item.slug, categoryTitle: item.title, sku: '', image: item.image, price: '', priceFromMinor: 0, currency: 'GBP', buyingMode: '', href: `${input.storeBase}/${item.slug}`, score: scoreCategory(item, queryTokens) })).filter((item) => item.score > 0 && !buyingMode && (!category || item.slug === category));
  const results = [...categoryResults, ...productResults];
  results.sort((a, b) => sort === 'name-asc' ? a.title.localeCompare(b.title) : sort === 'name-desc' ? b.title.localeCompare(a.title) : sort === 'price-low' ? (a.type === 'category' ? 1 : b.type === 'category' ? -1 : a.priceFromMinor - b.priceFromMinor) : sort === 'price-high' ? (a.type === 'category' ? 1 : b.type === 'category' ? -1 : b.priceFromMinor - a.priceFromMinor) : b.score - a.score || (a.type === b.type ? a.title.localeCompare(b.title) : a.type === 'category' ? -1 : 1));
  const counts = input.categories.map((item) => ({ slug: item.slug, title: item.title, count: productResults.filter((product) => product.categorySlug === item.slug).length })).filter((item) => item.count > 0);
  const limit = Math.max(1, Math.min(100, Number(input.limit || 50)));
  return { query, category, buyingMode, sort, total: results.length, results: results.slice(0, limit), categories: counts };
}
