import { platformPrisma } from '@/core/db/platform-prisma';
import { cleanSlug } from './theme-helpers';

export type ThemeProductOptionValue = { slug: string; label: string; value?: string };
export type ThemeProductOptionGroup = { key: string; label: string; values: ThemeProductOptionValue[] };

export type ThemeProductCard = {
  slug: string;
  category: string;
  title: string;
  text: string;
  image: string;
  price: string;
  priceFromMinor?: number;
  currency?: string;
  productType?: string;
  buyingMode?: 'cart' | 'quote';
  optionGroups?: ThemeProductOptionGroup[];
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

function firstNumber(...values: any[]) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next) && next >= 0) return Math.round(next);
  }
  return 0;
}

function priceMinorFor(raw: any) {
  const minor = firstNumber(raw?.priceFromMinor, raw?.basePriceMinor, raw?.startingPriceMinor, raw?.unitPriceMinor, raw?.pricing?.priceFromMinor, raw?.metadata?.priceFromMinor, raw?.metadataJson?.priceFromMinor, raw?.metadataJson?.pricing?.priceFromMinor);
  if (minor > 0) return minor;
  const pounds = firstNumber(raw?.priceFrom, raw?.fromPrice, raw?.startingPrice, raw?.basePrice, raw?.price, raw?.pricing?.priceFrom);
  return pounds > 0 && pounds < 10000 ? pounds * 100 : 0;
}

function priceText(raw: any) {
  const amount = raw?.priceFrom ?? raw?.fromPrice ?? raw?.startingPrice ?? raw?.basePrice ?? raw?.price;
  if (typeof amount === 'number' && Number.isFinite(amount)) return `From £${amount.toFixed(2)}`;
  if (typeof amount === 'string' && amount.trim()) return amount.trim().startsWith('£') || amount.toLowerCase().includes('quote') ? amount.trim() : `From ${amount.trim()}`;
  const minor = priceMinorFor(raw);
  return minor > 0 ? `From £${(minor / 100).toFixed(2)}` : '';
}

function imageFor(raw: any) {
  return firstText(raw?.image, raw?.imageUrl, raw?.thumbnail, raw?.thumbnailUrl, raw?.heroImage, raw?.metadata?.image, raw?.metadataJson?.image);
}

function optionValue(item: any): ThemeProductOptionValue | null {
  const label = firstText(item?.label, item?.name, item?.title, item?.value, item);
  const rawValue = firstText(item?.value, item?.slug, item?.key, label);
  if (!label || !rawValue) return null;
  return { slug: cleanSlug(rawValue), label, value: rawValue };
}

function optionGroupsFor(raw: any): ThemeProductOptionGroup[] {
  const groups = raw?.optionGroups || raw?.options || raw?.metadata?.optionGroups || raw?.metadataJson?.optionGroups || [];
  if (!Array.isArray(groups)) return [];
  return groups.map((group: any) => {
    const label = firstText(group?.label, group?.name, group?.title, group?.key);
    const key = cleanSlug(firstText(group?.key, group?.slug, label));
    const values = Array.isArray(group?.values) ? group.values.map(optionValue).filter(Boolean) as ThemeProductOptionValue[] : [];
    return key && label && values.length ? { key, label, values } : null;
  }).filter(Boolean) as ThemeProductOptionGroup[];
}

function buyingModeFor(raw: any): 'cart' | 'quote' {
  const value = firstText(raw?.buyingMode, raw?.orderMode, raw?.storefrontAction, raw?.ctaMode, raw?.pricingMode, raw?.metadata?.buyingMode, raw?.metadataJson?.buyingMode).toLowerCase();
  const productType = firstText(raw?.productType, raw?.type, raw?.metadata?.productType, raw?.metadataJson?.productType).toUpperCase();
  if (['quote', 'request-quote', 'quote-only', 'quote_led', 'quote-led'].includes(value)) return 'quote';
  if (productType === 'QUOTE_LED') return 'quote';
  return 'cart';
}

async function loadCoreCatalogRows(tenantId: string, resource: string, select: Record<string, boolean>) {
  return ((platformPrisma as any).coreCatalogRecord?.findMany?.({
    where: { tenantId, resource },
    orderBy: { updatedAt: 'desc' },
    take: 80,
    select,
  }) || Promise.resolve([])) as Promise<any[]>;
}

function toThemeProduct(record: any): ThemeProductCard | null {
  const raw = record?.metadataJson || record?.data || record || {};
  const title = firstText(raw?.title, raw?.name, raw?.label, record?.title, record?.name, record?.slug);
  const slug = cleanSlug(firstText(raw?.slug, record?.slug, title));
  if (!title || !slug) return null;
  const category = cleanSlug(firstText(raw?.categorySlug, raw?.category, raw?.categoryId, raw?.parentSlug, raw?.parentCategory, record?.categorySlug));
  return {
    slug,
    category,
    title,
    text: firstText(raw?.description, raw?.shortDescription, raw?.summary, raw?.excerpt, ''),
    image: imageFor(raw),
    price: priceText(raw),
    priceFromMinor: priceMinorFor(raw),
    currency: firstText(raw?.currency, raw?.pricing?.currency, raw?.metadataJson?.currency, 'GBP'),
    productType: firstText(raw?.productType, raw?.type, raw?.metadata?.productType, raw?.metadataJson?.productType),
    buyingMode: buyingModeFor(raw),
    optionGroups: optionGroupsFor(raw),
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
    description: firstText(raw?.description, raw?.shortDescription, raw?.summary, record?.description, ''),
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
        const rows = await loadCoreCatalogRows(tenantId, resource, { slug: true, metadataJson: true });
        for (const row of rows) {
          const item = toThemeProduct(row);
          if (item) collected.push(item);
        }
        if (collected.length) return dedupeProducts(collected);
      } catch {}
    }
  }
  return [];
}

export async function loadTenantThemeCategories(tenantIds: string[], products: ThemeProductCard[] = []) {
  const collected: ThemeCategoryCard[] = [];
  for (const tenantId of tenantIds) {
    for (const resource of CATEGORY_RESOURCES) {
      try {
        const rows = await loadCoreCatalogRows(tenantId, resource, { slug: true, name: true, description: true, metadataJson: true });
        for (const row of rows) {
          const item = toThemeCategory(row, products);
          if (item) collected.push(item);
        }
        if (collected.length) return dedupeCategories(collected).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
      } catch {}
    }
  }
  return [];
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
