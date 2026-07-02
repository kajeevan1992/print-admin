import { platformPrisma } from '@/core/db/platform-prisma';
import { cleanSlug } from './theme-helpers';
import { productCards } from './product-data';

export type ThemeProductCard = {
  slug: string;
  category: string;
  title: string;
  text: string;
  image: string;
  price: string;
};

export type ThemeCategoryCard = {
  slug: string;
  title: string;
  description: string;
  productCount: number;
  sortOrder: number;
  image: string;
};

const PRODUCT_RESOURCES = ['products', 'catalog-products', 'storefront-products', 'print-products'];
const CATEGORY_RESOURCES = ['categories', 'catalog-categories', 'storefront-categories', 'product-categories'];

function firstText(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function priceText(raw: any) {
  const amount = raw?.priceFrom ?? raw?.fromPrice ?? raw?.startingPrice ?? raw?.basePrice ?? raw?.price;
  if (typeof amount === 'number' && Number.isFinite(amount)) return `From £${amount.toFixed(2)}`;
  if (typeof amount === 'string' && amount.trim()) return amount.trim().startsWith('£') || amount.toLowerCase().includes('quote') ? amount.trim() : `From ${amount.trim()}`;
  return 'Quote ready';
}

function imageFor(category: string, slug: string, raw: any) {
  const direct = firstText(raw?.image, raw?.imageUrl, raw?.thumbnail, raw?.thumbnailUrl, raw?.heroImage, raw?.metadata?.image, raw?.metadataJson?.image);
  if (direct) return direct;
  const key = `${category} ${slug}`;
  if (key.includes('flyer')) return '/native-theme-assets/atlantis/flyer-front.svg';
  if (key.includes('poster') || key.includes('sign') || key.includes('banner')) return '/native-theme-assets/atlantis/poster-main.svg';
  if (key.includes('booklet') || key.includes('brochure')) return '/native-theme-assets/atlantis/hero-slide-2.svg';
  return '/native-theme-assets/atlantis/business-card-front.svg';
}

function titleFromSlug(slug = '') {
  return String(slug || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function toThemeProduct(record: any): ThemeProductCard | null {
  const raw = record?.metadataJson || record?.data || record || {};
  const title = firstText(raw?.title, raw?.name, raw?.label, record?.title, record?.name, record?.slug);
  const slug = cleanSlug(firstText(raw?.slug, record?.slug, title));
  if (!title || !slug) return null;
  const category = cleanSlug(firstText(raw?.categorySlug, raw?.category, raw?.categoryId, raw?.parentSlug, raw?.parentCategory, record?.categorySlug, 'all-products'));
  return {
    slug,
    category: category || 'all-products',
    title,
    text: firstText(raw?.description, raw?.shortDescription, raw?.summary, raw?.excerpt, 'Configure this product and choose the right print options.'),
    image: imageFor(category, slug, raw),
    price: priceText(raw),
  };
}

function toThemeCategory(record: any, products: ThemeProductCard[]): ThemeCategoryCard | null {
  const raw = record?.metadataJson || record?.data || record || {};
  const title = firstText(raw?.title, raw?.name, raw?.label, record?.title, record?.name, record?.slug);
  const slug = cleanSlug(firstText(raw?.slug, record?.slug, title));
  if (!title || !slug) return null;
  const productCount = Number(raw?.productCount ?? raw?.count ?? record?.productCount ?? products.filter((product) => product.category === slug).length ?? 0) || 0;
  return {
    slug,
    title,
    description: firstText(raw?.description, raw?.shortDescription, raw?.summary, record?.description, `${title} print products.`),
    productCount,
    sortOrder: Number(raw?.sortOrder ?? raw?.order ?? record?.sortOrder ?? 999),
    image: firstText(raw?.image, raw?.imageUrl, raw?.thumbnail, raw?.heroImage, ''),
  };
}

export async function loadTenantThemeProducts(tenantIds: string[]) {
  const collected: ThemeProductCard[] = [];
  for (const tenantId of tenantIds) {
    for (const resource of PRODUCT_RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ slug: string; metadataJson: any }>>('SELECT slug,"metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 ORDER BY "updatedAt" DESC LIMIT 80', tenantId, resource);
        for (const row of rows) {
          const item = toThemeProduct(row);
          if (item) collected.push(item);
        }
        if (collected.length) return dedupeProducts(collected);
      } catch {}
    }
  }
  return productCards;
}

export async function loadTenantThemeCategories(tenantIds: string[], products: ThemeProductCard[] = productCards) {
  const collected: ThemeCategoryCard[] = [];
  for (const tenantId of tenantIds) {
    for (const resource of CATEGORY_RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ slug: string; name?: string; description?: string; metadataJson: any }>>('SELECT slug,name,description,"metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 ORDER BY "updatedAt" DESC LIMIT 80', tenantId, resource);
        for (const row of rows) {
          const item = toThemeCategory(row, products);
          if (item) collected.push(item);
        }
        if (collected.length) return dedupeCategories(collected).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
      } catch {}
    }
  }
  return categoriesFromProducts(products);
}

function categoriesFromProducts(products: ThemeProductCard[]): ThemeCategoryCard[] {
  const counts = new Map<string, number>();
  products.forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1));
  return Array.from(counts.entries()).map(([slug, productCount], index) => ({
    slug,
    title: titleFromSlug(slug),
    description: `${productCount} print products available.`,
    productCount,
    sortOrder: index + 1,
    image: '',
  }));
}

function dedupeProducts(items: ThemeProductCard[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeCategories(items: ThemeCategoryCard[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadTenantCategorySlugs(tenantIds: string[]) {
  const categories = await loadTenantThemeCategories(tenantIds);
  return categories.map((item) => item.slug);
}
