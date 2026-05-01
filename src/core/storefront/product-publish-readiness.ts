import { getInternalCatalogRecord, listInternalCatalog, writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const PRODUCT_RESOURCE = 'products' as const;

type Store = Record<string, any>;

function issue(code: string, message: string, field: string, severity: 'error' | 'warning' = 'error') {
  return { code, message, field, severity };
}

function metadata(product: Store) {
  return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
}

function normaliseProduct(raw: Store) {
  const meta = metadata(raw);
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name || raw.title,
    status: meta.status || (raw.isActive ? 'published' : 'draft'),
    categoryId: raw.categoryId || null,
    priceFromMinor: Number(raw.priceFromMinor || meta.priceFromMinor || 0),
    currency: raw.currency || meta.currency || 'GBP',
    vatRate: meta.vatRate || meta.vatType || 'standard',
    artworkRequired: meta.artworkRequired !== false,
    options: Array.isArray(meta.options) ? meta.options : [],
    quantities: Array.isArray(meta.quantities) ? meta.quantities : [],
    turnaroundOptions: Array.isArray(meta.turnaroundOptions) ? meta.turnaroundOptions : [],
    pricing: meta.pricing || {},
    artworkRules: meta.artworkRules || {},
    storefront: meta.storefront || {},
    checkout: meta.checkout || {},
    metadataJson: meta,
  };
}

export function checkProductReadiness(product: Store) {
  const item = normaliseProduct(product);
  const issues = [] as Array<ReturnType<typeof issue>>;

  if (!item.name) issues.push(issue('NAME_REQUIRED', 'Product name is required.', 'name'));
  if (!item.slug) issues.push(issue('SLUG_REQUIRED', 'Storefront slug is required.', 'slug'));
  if (!item.categoryId) issues.push(issue('CATEGORY_REQUIRED', 'Choose a product category before publishing.', 'categoryId'));
  if (!item.priceFromMinor || item.priceFromMinor <= 0) issues.push(issue('PRICE_FROM_REQUIRED', 'Price from must be greater than zero.', 'priceFromMinor'));
  if (!['zero', 'standard', 'reduced', 'exempt', '0', '20'].includes(String(item.vatRate))) issues.push(issue('VAT_RATE_REQUIRED', 'VAT type must be set to standard or zero-rated.', 'metadataJson.vatRate'));
  if (!item.options.length) issues.push(issue('OPTIONS_REQUIRED', 'Add at least one selling option such as size, quantity, paper or sides.', 'metadataJson.options'));
  if (!item.quantities.length) issues.push(issue('QUANTITIES_REQUIRED', 'Add at least one quantity break.', 'metadataJson.quantities'));
  if (!item.turnaroundOptions.length) issues.push(issue('TURNAROUND_REQUIRED', 'Add at least one turnaround option.', 'metadataJson.turnaroundOptions'));
  if (!item.pricing.source) issues.push(issue('PRICING_SOURCE_REQUIRED', 'Choose a pricing source: matrix, cost-based, supplier or fixed.', 'metadataJson.pricing.source'));
  if (item.artworkRequired && !item.artworkRules.profile) issues.push(issue('ARTWORK_RULES_REQUIRED', 'Artwork rules/profile are required for print products.', 'metadataJson.artworkRules.profile'));
  if (item.checkout.paymentEnabled === false) issues.push(issue('PAYMENT_DISABLED', 'Payment must be enabled before taking online orders.', 'metadataJson.checkout.paymentEnabled', 'warning'));
  if (!item.storefront.visible) issues.push(issue('STOREFRONT_HIDDEN', 'Product is not visible on the storefront.', 'metadataJson.storefront.visible', 'warning'));

  const errors = issues.filter((entry) => entry.severity === 'error').length;
  const warnings = issues.filter((entry) => entry.severity === 'warning').length;
  return { product: item, ready: errors === 0, errors, warnings, issues };
}

export async function listProductReadiness(request: Request) {
  const data = await listInternalCatalog(tenantContextFromRequest(request), PRODUCT_RESOURCE, { page: 1, limit: 200 });
  const items = ((data as any).items || []).map((product: Store) => checkProductReadiness(product));
  return {
    items,
    summary: {
      total: items.length,
      ready: items.filter((item: Store) => item.ready).length,
      blocked: items.filter((item: Store) => !item.ready).length,
      warnings: items.reduce((sum: number, item: Store) => sum + item.warnings, 0),
    },
  };
}

export async function getProductReadiness(request: Request, id: string) {
  const product = await getInternalCatalogRecord(tenantContextFromRequest(request), PRODUCT_RESOURCE, id);
  return checkProductReadiness(product as Store);
}

export async function applyProductPublishPatch(request: Request, input: Store) {
  const context = tenantContextFromRequest(request);
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Product id is required.');
  const existing = await getInternalCatalogRecord(context, PRODUCT_RESOURCE, id) as Store;
  const meta = metadata(existing);
  const nextMeta = {
    ...meta,
    status: input.status || meta.status || 'draft',
    vatRate: input.vatRate ?? meta.vatRate ?? 'standard',
    artworkRequired: input.artworkRequired ?? meta.artworkRequired ?? true,
    options: input.options ?? meta.options ?? [],
    quantities: input.quantities ?? meta.quantities ?? [100, 250, 500, 1000],
    turnaroundOptions: input.turnaroundOptions ?? meta.turnaroundOptions ?? [{ id: 'standard', label: 'Standard', days: 3 }],
    pricing: input.pricing ?? meta.pricing ?? { source: 'fixed' },
    artworkRules: input.artworkRules ?? meta.artworkRules ?? { profile: 'print-ready-pdf', bleedMm: 3 },
    storefront: { ...(meta.storefront || {}), visible: input.visible ?? meta.storefront?.visible ?? true },
    checkout: { ...(meta.checkout || {}), paymentEnabled: input.paymentEnabled ?? meta.checkout?.paymentEnabled ?? true },
  };
  const updated = await writeInternalCatalogRecord(context, PRODUCT_RESOURCE, {
    id,
    name: input.name || existing.name,
    slug: input.slug || existing.slug,
    categoryId: input.categoryId ?? existing.categoryId,
    priceFromMinor: input.priceFromMinor ?? existing.priceFromMinor,
    currency: input.currency || existing.currency || 'GBP',
    isActive: input.isActive ?? existing.isActive ?? false,
    metadataJson: nextMeta,
  }, 'update');
  return checkProductReadiness(updated as Store);
}
