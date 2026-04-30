import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { calculatePricingPreview } from '@/core/catalog/pricing-engine';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
export const HOSTED_CART_KEY = 'hosted-theme-cart';
export const DRAFT_ORDER_KEY = 'quote-draft-orders';

export type StorefrontCustomer = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
};

export type StorefrontCartInput = Record<string, any> & {
  id?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  quantity?: number;
  selections?: Record<string, unknown>;
  options?: Record<string, unknown>;
  turnaround?: string | Record<string, unknown>;
  addOns?: Array<Record<string, any>>;
};

type ThemeProduct = Record<string, any> & {
  id: string;
  slug: string;
  name: string;
  currency: string;
  priceFromMinor: number;
  vatClass: 'zero' | 'standard';
  pricingSource: 'internal' | 'supplier' | 'matrix';
};

const FALLBACK_THEME_PRODUCTS: ThemeProduct[] = [
  { id: 'prod-a5-leaflets', slug: 'a5-leaflets', name: 'A5 Leaflets', currency: 'GBP', priceFromMinor: 2900, vatClass: 'zero', pricingSource: 'internal' },
  { id: 'prod-booklets', slug: 'booklets', name: 'Booklets', currency: 'GBP', priceFromMinor: 9900, vatClass: 'zero', pricingSource: 'matrix' },
  { id: 'prod-business-cards', slug: 'business-cards', name: 'Business Cards', currency: 'GBP', priceFromMinor: 1900, vatClass: 'standard', pricingSource: 'internal' },
  { id: 'prod-business-cards', slug: 'standard-business-cards', name: 'Business Cards', currency: 'GBP', priceFromMinor: 1900, vatClass: 'standard', pricingSource: 'internal' },
  { id: 'prod-pvc-banner', slug: 'pvc-banner', name: 'PVC Banner', currency: 'GBP', priceFromMinor: 2400, vatClass: 'standard', pricingSource: 'internal' },
];

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

function asMoney(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 0;
}

function asQuantity(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 1;
}

function vatRateFromClass(vatClass: unknown) {
  return String(vatClass || '').toLowerCase() === 'zero' ? 0 : 20;
}

function inferVatClass(product: Record<string, any>, input?: StorefrontCartInput) {
  const explicit = input?.vatClass || product?.vatClass || product?.metadataJson?.vatClass || product?.metadataJson?.taxClass;
  if (explicit) return String(explicit).toLowerCase() === 'zero' || String(explicit).toLowerCase() === 'zero-rated' ? 'zero' : 'standard';
  const text = `${product?.slug || ''} ${product?.name || product?.title || ''} ${input?.productSlug || ''} ${input?.productName || ''}`.toLowerCase();
  if (text.includes('leaflet') || text.includes('booklet')) return 'zero';
  return 'standard';
}

function normalizeAddOn(addOn: Record<string, any>, currency: string, parentQuantity: number) {
  const quantity = asQuantity(addOn.quantity || 1);
  const unitNetMinor = asMoney(addOn.unitNetMinor ?? addOn.priceFromMinor ?? addOn.priceMinor ?? addOn.netMinor);
  const netTotalMinor = unitNetMinor * quantity;
  const vatRate = vatRateFromClass(addOn.vatClass || 'standard');
  const vatTotalMinor = Math.round(netTotalMinor * (vatRate / 100));
  return {
    id: String(addOn.id || makeId('addon')),
    name: String(addOn.name || addOn.label || 'Add-on service'),
    type: 'add-on',
    quantity,
    parentQuantity,
    currency,
    vatClass: vatRate === 0 ? 'zero' : 'standard',
    vatRate,
    unitNetMinor,
    netTotalMinor,
    vatTotalMinor,
    grossTotalMinor: netTotalMinor + vatTotalMinor,
    pricingSource: String(addOn.pricingSource || 'add-on'),
    note: addOn.note || 'Add-on service is VAT-rated independently from the base product.',
  };
}

async function resolveProduct(request: Request, input: StorefrontCartInput): Promise<Record<string, any>> {
  const key = String(input.productId || input.productSlug || input.slug || '').trim();
  if (key) {
    try {
      return await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', key) as Record<string, any>;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('was not found') && !message.includes('No writable tenant database configured')) throw error;
    }
  }
  const fallback = FALLBACK_THEME_PRODUCTS.find((product) => product.id === key || product.slug === key);
  if (fallback) return fallback;
  return {
    id: key || input.productId || makeId('product'),
    slug: input.productSlug || key || 'custom-product',
    name: input.productName || input.title || 'Storefront product',
    title: input.productName || input.title || 'Storefront product',
    currency: input.currency || 'GBP',
    priceFromMinor: asMoney(input.priceFromMinor || input.unitNetMinor || input.grossTotalMinor),
    vatClass: input.vatClass || 'standard',
    pricingSource: input.pricingSource || 'internal',
  };
}

function calculateBaseLine(product: Record<string, any>, input: StorefrontCartInput) {
  const quantity = asQuantity(input.quantity || input.selections?.quantity || input.options?.quantity);
  const selections = (input.selections || input.options || {}) as Record<string, unknown>;
  let pricing: Record<string, any> | null = null;
  try {
    pricing = calculatePricingPreview({ product, selections, quantity }) as any;
  } catch (error) {
    pricing = { warnings: [error instanceof Error ? error.message : 'Pricing preview could not run for this product.'] };
  }
  const currency = String(pricing?.currency || product.currency || input.currency || 'GBP');
  const unitNetMinor = asMoney(input.unitNetMinor ?? pricing?.totalMinor ?? product.priceFromMinor ?? input.priceFromMinor);
  const netTotalMinor = unitNetMinor * quantity;
  const vatClass = inferVatClass(product, input);
  const vatRate = vatRateFromClass(vatClass);
  const vatTotalMinor = Math.round(netTotalMinor * (vatRate / 100));
  return {
    id: String(input.id || makeId('cart-item')),
    productId: String(product.id || input.productId || input.productSlug || ''),
    productSlug: String(product.slug || input.productSlug || input.productId || ''),
    productName: String(product.name || product.title || input.productName || input.title || 'Storefront product'),
    type: 'product',
    quantity,
    selections,
    turnaround: input.turnaround || input.selectedTurnaround || null,
    currency,
    vatClass,
    vatRate,
    unitNetMinor,
    netTotalMinor,
    vatTotalMinor,
    grossTotalMinor: netTotalMinor + vatTotalMinor,
    pricingSource: String(input.pricingSource || product.pricingSource || product.metadataJson?.pricingSource || 'internal'),
    pricing: {
      ...pricing,
      source: String(input.pricingSource || product.pricingSource || product.metadataJson?.pricingSource || 'internal'),
      currency,
      unitNetMinor,
      netTotalMinor,
      vatTotalMinor,
      grossTotalMinor: netTotalMinor + vatTotalMinor,
      vatClass,
      vatRate,
    },
    artwork: input.artwork || { required: true, status: 'not-uploaded' },
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function summarizeCart(items: Array<Record<string, any>>) {
  const currency = String(items[0]?.currency || 'GBP');
  const lines = items.flatMap((item) => [item, ...(Array.isArray(item.addOns) ? item.addOns : [])]);
  const netTotalMinor = lines.reduce((sum, line) => sum + asMoney(line.netTotalMinor), 0);
  const vatTotalMinor = lines.reduce((sum, line) => sum + asMoney(line.vatTotalMinor), 0);
  const grossTotalMinor = lines.reduce((sum, line) => sum + asMoney(line.grossTotalMinor), 0);
  const vatBreakdown = [0, 20].map((rate) => {
    const rated = lines.filter((line) => Number(line.vatRate || 0) === rate);
    return {
      vatRate: rate,
      netTotalMinor: rated.reduce((sum, line) => sum + asMoney(line.netTotalMinor), 0),
      vatTotalMinor: rated.reduce((sum, line) => sum + asMoney(line.vatTotalMinor), 0),
      grossTotalMinor: rated.reduce((sum, line) => sum + asMoney(line.grossTotalMinor), 0),
    };
  }).filter((row) => row.netTotalMinor > 0 || row.vatTotalMinor > 0);
  return { currency, itemCount: items.length, lineCount: lines.length, netTotalMinor, vatTotalMinor, grossTotalMinor, vatBreakdown };
}

export async function buildCartItem(request: Request, input: StorefrontCartInput) {
  const product = await resolveProduct(request, input);
  const base = calculateBaseLine(product, input);
  const addOns = Array.isArray(input.addOns) ? input.addOns.map((addOn) => normalizeAddOn(addOn, base.currency, base.quantity)) : [];
  return {
    ...base,
    addOns,
    lineTotals: summarizeCart([{ ...base, addOns }]),
    deliveryEstimate: input.deliveryEstimate || estimateDelivery(base.turnaround),
  };
}

export function estimateDelivery(turnaround: unknown) {
  const value = typeof turnaround === 'object' && turnaround ? (turnaround as any).workingDays || (turnaround as any).days || (turnaround as any).id : turnaround;
  const text = String(value || '3').toLowerCase();
  const days = text.includes('rush') ? 1 : text.includes('express') ? 2 : Math.max(1, Number(text.match(/\d+/)?.[0] || 3));
  const date = new Date();
  date.setDate(date.getDate() + days);
  return { workingDays: days, estimatedDate: date.toISOString().slice(0, 10), rule: 'basic-hosted-theme-estimate' };
}

export async function readCartItems(request: Request): Promise<Array<Record<string, any>>> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, HOSTED_CART_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

export async function saveCartItems(request: Request, items: Array<Record<string, any>>) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: HOSTED_CART_KEY,
    slug: HOSTED_CART_KEY,
    name: 'Hosted theme cart',
    description: 'Cart bridge for hosted storefront themes. Internal API only.',
    metadataJson: { items, totals: summarizeCart(items), savedAt: new Date().toISOString(), storageKey: HOSTED_CART_KEY, source: 'HostedThemeCartBridge' },
  } as any);
}

export async function readDraftOrders(request: Request): Promise<Array<Record<string, any>>> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, DRAFT_ORDER_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

export async function saveDraftOrders(request: Request, items: Array<Record<string, any>>) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: DRAFT_ORDER_KEY,
    slug: DRAFT_ORDER_KEY,
    name: 'Quote draft orders',
    description: 'Draft order records generated from hosted storefront checkout payloads.',
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: DRAFT_ORDER_KEY, source: 'HostedThemeCheckoutBridge' },
  } as any);
}

export function cleanCustomer(input: StorefrontCustomer): Required<StorefrontCustomer> {
  return {
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    company: String(input.company || '').trim(),
  };
}

export function validateCustomer(customer: Required<StorefrontCustomer>) {
  const errors: string[] = [];
  if (!customer.name) errors.push('Customer name is required.');
  if (!customer.email) errors.push('Email is required.');
  if (!customer.phone) errors.push('Phone is required.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push('Enter a valid email address.');
  return errors;
}
