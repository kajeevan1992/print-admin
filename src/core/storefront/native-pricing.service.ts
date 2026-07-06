import { getInternalCatalogRecord, listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import { platformPrisma } from '@/core/db/platform-prisma';
import { resolveProductConfig, rowPriceMinor } from '@/core/storefront/product-config-engine';
import { calculateVatLine } from '@/core/tax/vat-rules';
import { tenantContextFromRequest } from '@/core/tenant/context';

export type NativeSelectedOptionRow = {
  key?: string;
  label?: string;
  value?: string;
  slug?: string;
};

export type NativePricingInput = {
  request: Request;
  tenantSlug: string;
  productSlug: string;
  selectedOptions?: NativeSelectedOptionRow[];
  quantity?: string | number | null;
  customSize?: Record<string, unknown> | null;
};

function slug(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function moneyMinor(value: unknown) { const next = Number(value); return Number.isFinite(next) && next > 0 ? Math.round(next) : 0; }
function numberOrNull(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? next : null; }
function backendObject(...values: unknown[]) { return values.find((value) => value && typeof value === 'object' && !Array.isArray(value)) as Record<string, any> | undefined; }
function tenantCandidates(input: string) { const base = slug(input); const list = [base, base ? `tenant-${base}` : '']; if (base === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return uniq(list); }

function selectionsFromRows(rows: NativeSelectedOptionRow[] = [], customSize?: Record<string, unknown> | null) {
  const selections: Record<string, string> = {};

  for (const row of rows) {
    const key = String(row.key || row.label || '').trim();
    const rawValue = String(row.value || row.label || row.slug || '').trim();
    const rawSlug = String(row.slug || '').trim();
    if (!key || !rawValue) continue;

    selections[key] = rawValue;
    selections[slug(key)] = rawValue;

    if (rawSlug) {
      selections[`${key}Slug`] = rawSlug;
      selections[`${slug(key)}-slug`] = rawSlug;
    }
  }

  if (customSize && typeof customSize === 'object') {
    for (const [key, value] of Object.entries(customSize)) {
      if (value === undefined || value === null || value === '') continue;
      selections[key] = String(value);
      selections[slug(key)] = String(value);
    }
  }

  return selections;
}

async function tenantIdsForNativeStore(tenantSlug: string) {
  const candidates = tenantCandidates(tenantSlug);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
      'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
      slug(tenantSlug),
    );
    const row = rows[0];
    return uniq([...candidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch {
    return candidates;
  }
}

export async function loadProductForNativePricing(request: Request, tenantSlug: string, productSlugInput: string) {
  const productSlug = slug(productSlugInput);
  const ctx = tenantContextFromRequest(request);

  try {
    const listed = await listInternalCatalog(ctx, 'products', { search: productSlug, limit: 200 }) as any;
    const items = Array.isArray(listed?.items) ? listed.items as Record<string, any>[] : [];
    const exact = items.find((item) => slug(String(item.slug || item.id || item.name || item.title || '')) === productSlug);
    if (exact) return exact;
  } catch {}

  try {
    return await getInternalCatalogRecord(ctx, 'products', productSlug) as Record<string, any>;
  } catch {}

  const ids = await tenantIdsForNativeStore(tenantSlug);
  for (const tenantId of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; name?: string; description?: string; metadataJson: any }>>(
        'SELECT id,slug,name,description,"metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
        tenantId,
        'products',
        productSlug,
      );
      const row = rows[0];
      if (row) return { ...row.metadataJson, id: row.id, slug: row.slug, name: row.name, description: row.description, metadataJson: row.metadataJson } as Record<string, any>;
    } catch {}
  }

  throw new Error(`Product ${productSlug} was not found for pricing.`);
}

function productTaxSettings(product: Record<string, any>, matchedRow: Record<string, any> | null | undefined) {
  return backendObject(
    matchedRow?.taxSettings,
    matchedRow?.metadata?.taxSettings,
    product.taxSettings,
    product.metadataJson?.taxSettings,
    product.metadataJson?.pricing?.taxSettings,
    product.metadataJson?.product?.taxSettings,
  );
}

function productVatRate(product: Record<string, any>, matchedRow: Record<string, any> | null | undefined) {
  const candidates = [
    matchedRow?.vatRate,
    matchedRow?.taxRate,
    matchedRow?.metadata?.vatRate,
    product.vatRate,
    product.taxRate,
    product.metadataJson?.vatRate,
    product.metadataJson?.taxRate,
    product.metadataJson?.pricing?.vatRate,
  ];
  for (const candidate of candidates) {
    const value = numberOrNull(candidate);
    if (value !== null) return value;
  }
  return undefined;
}

function taxLineForResolvedPrice(params: {
  product: Record<string, any>;
  matchedRow: Record<string, any>;
  grossMinor: number;
  quantity: number;
  taxSettings?: Record<string, any>;
  vatRate?: number;
}) {
  const product = params.product;
  return calculateVatLine({
    productId: product.id || product.slug || '',
    productSlug: product.slug || product.id || '',
    productName: product.name || product.title || product.slug || 'Storefront product',
    titleSnapshot: product.name || product.title || product.slug || 'Storefront product',
    sku: params.matchedRow?.sku || params.matchedRow?.oldSku || '',
    categoryName: product.categoryName || product.metadataJson?.categoryName || '',
    categorySlug: product.categorySlug || product.metadataJson?.categorySlug || '',
    totalPriceMinor: params.grossMinor,
    taxSettings: params.taxSettings,
    vatRate: params.vatRate,
    resolverSnapshot: {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name || product.title,
        title: product.title || product.name,
        categoryName: product.categoryName || '',
        categorySlug: product.categorySlug || '',
        taxSettings: params.taxSettings,
        vatRate: params.vatRate,
      },
      pricing: {
        source: 'saas-pricing-engine',
        matchedRow: params.matchedRow,
        selected: { vatRate: params.vatRate },
      },
    },
  }, params.quantity, params.grossMinor);
}

export async function calculateNativeStorefrontPrice(input: NativePricingInput) {
  const product = await loadProductForNativePricing(input.request, input.tenantSlug, input.productSlug);
  const selectedOptions = input.selectedOptions || [];
  const selections = selectionsFromRows(selectedOptions, input.customSize);
  const requestedQuantity = Math.max(1, Math.round(Number(input.quantity || 1)));
  const resolvedConfig = resolveProductConfig(product, { selections, quantity: requestedQuantity });
  const matchedRow = resolvedConfig.matchedRow as Record<string, any> | null;
  const calculatedMinor = moneyMinor(rowPriceMinor(matchedRow)) || moneyMinor(resolvedConfig.priceMinor);

  if (!matchedRow || calculatedMinor <= 0) {
    throw new Error('No exact backend price was found for this product configuration. Check the admin pricing matrix/options for this product.');
  }

  const selectedQuantity = Math.max(1, Math.round(Number(resolvedConfig.selectedQuantity || requestedQuantity)));
  const taxSettings = productTaxSettings(product, matchedRow);
  const vatRate = productVatRate(product, matchedRow);
  const taxLine = taxLineForResolvedPrice({ product, matchedRow, grossMinor: calculatedMinor, quantity: selectedQuantity, taxSettings, vatRate });

  return {
    product,
    resolvedConfig,
    matchedRow,
    selectedOptions,
    quantity: selectedQuantity,
    finalPriceMinor: taxLine.grossMinor,
    netPriceMinor: taxLine.netMinor,
    vatMinor: taxLine.vatMinor,
    currency: String(matchedRow.currency || product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP'),
    taxSettings,
    vatRate: taxLine.vatRate,
    vatClass: taxLine.vatClass,
    vatReason: taxLine.vatReason,
    taxLine,
    pricingSource: 'saas-pricing-engine',
  };
}

export function formatMinorPrice(amountMinor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(amountMinor || 0) / 100);
}
