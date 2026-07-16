import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { calculateNativeStorefrontPrice, formatMinorPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';

const BASKET_RESOURCE = 'storefront-baskets' as any;
const MAX_BASKET_LINES = 50;
const BASKET_TTL_DAYS = 30;

export type StorefrontBasketArtwork = {
  status: 'ready' | 'send-later' | 'need-design';
  notes: string;
  uploadId?: string | null;
  uploadName?: string;
};

export type StorefrontBasketLine = {
  id: string;
  productSlug: string;
  categorySlug: string;
  productName: string;
  image: string;
  selectedOptions: NativeSelectedOptionRow[];
  quantity: number;
  delivery: string;
  customSize?: Record<string, unknown> | null;
  sku: string;
  currency: string;
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  formattedTotal: string;
  vatRate?: number | null;
  vatClass?: string;
  vatReason?: string;
  pricingSource?: string;
  artwork: StorefrontBasketArtwork;
  createdAt: string;
  updatedAt: string;
};

export type StorefrontBasket = {
  schemaVersion: 1;
  id: string;
  tenantSlug: string;
  storeSlug: string;
  status: 'active' | 'converted' | 'abandoned';
  customerId?: string | null;
  lines: StorefrontBasketLine[];
  currency: string;
  itemCount: number;
  lineCount: number;
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  formattedTotal: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  convertedOrderId?: string | null;
};

export type BasketLineInput = {
  lineId?: string;
  productSlug: string;
  categorySlug?: string;
  productName?: string;
  selectedOptions?: NativeSelectedOptionRow[];
  quantity?: number;
  delivery?: string;
  customSize?: Record<string, unknown> | null;
  artwork?: Partial<StorefrontBasketArtwork>;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function nowIso() { return new Date().toISOString(); }
function expiryIso() { return new Date(Date.now() + BASKET_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(); }
function safeMinor(value: unknown) { const number = Number(value || 0); return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0; }
function safeQuantity(value: unknown) { const number = Number(value || 1); return Number.isFinite(number) ? Math.max(1, Math.round(number)) : 1; }
function safeArtwork(value?: Partial<StorefrontBasketArtwork> | null): StorefrontBasketArtwork {
  const status = ['ready', 'send-later', 'need-design'].includes(clean(value?.status)) ? clean(value?.status) as StorefrontBasketArtwork['status'] : 'send-later';
  return { status, notes: clean(value?.notes), uploadId: value?.uploadId ? clean(value.uploadId) : null, uploadName: clean(value?.uploadName) };
}
function safeSelectedOptions(value: unknown): NativeSelectedOptionRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({ key: clean(item?.key), label: clean(item?.label || item?.key), value: clean(item?.value || item?.slug), slug: clean(item?.slug || item?.value) })).filter((item) => item.key && item.value);
}
function productImage(product: Record<string, any>) {
  const media = product?.metadataJson?.media || product?.media || {};
  return clean(product?.image || product?.imageUrl || product?.thumbnail || product?.heroImage || product?.metadataJson?.image || media?.heroImageUrl);
}
function tenantScopedRequest(request: Request, tenantSlug: string) {
  const url = new URL(request.url);
  url.searchParams.set('tenantId', tenantSlug);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenantSlug);
  return new Request(url.toString(), { method: 'GET', headers });
}

export function newBasketId() { return crypto.randomUUID(); }
export function basketCookieName(tenantSlug: string, storeSlug: string) {
  const digest = crypto.createHash('sha1').update(`${slug(tenantSlug)}:${slug(storeSlug)}`).digest('hex').slice(0, 18);
  return `sf_basket_${digest}`;
}

async function resolveTenantId(tenantSlug: string) {
  const key = slug(tenantSlug);
  const tenant = await platformPrisma.tenant.findFirst({ where: { OR: [{ id: key }, { slug: key }, { defaultSubdomain: key }] }, select: { id: true } }).catch(() => null);
  return tenant?.id || key;
}

function emptyBasket(id: string, tenantSlug: string, storeSlug: string): StorefrontBasket {
  const now = nowIso();
  return { schemaVersion: 1, id, tenantSlug: slug(tenantSlug), storeSlug: slug(storeSlug), status: 'active', lines: [], currency: 'GBP', itemCount: 0, lineCount: 0, netMinor: 0, vatMinor: 0, grossMinor: 0, formattedTotal: formatMinorPrice(0, 'GBP'), createdAt: now, updatedAt: now, expiresAt: expiryIso(), convertedOrderId: null };
}

function totals(basket: StorefrontBasket): StorefrontBasket {
  const currency = basket.lines[0]?.currency || basket.currency || 'GBP';
  const netMinor = basket.lines.reduce((sum, line) => sum + safeMinor(line.netMinor), 0);
  const vatMinor = basket.lines.reduce((sum, line) => sum + safeMinor(line.vatMinor), 0);
  const grossMinor = basket.lines.reduce((sum, line) => sum + safeMinor(line.grossMinor), 0);
  return { ...basket, currency, itemCount: basket.lines.reduce((sum, line) => sum + safeQuantity(line.quantity), 0), lineCount: basket.lines.length, netMinor, vatMinor, grossMinor, formattedTotal: formatMinorPrice(grossMinor, currency), updatedAt: nowIso(), expiresAt: expiryIso() };
}

function normaliseStoredBasket(raw: any, id: string, tenantSlug: string, storeSlug: string): StorefrontBasket {
  const source = raw && typeof raw === 'object' ? raw : {};
  const basket = source.basket && typeof source.basket === 'object' ? source.basket : source;
  const fallback = emptyBasket(id, tenantSlug, storeSlug);
  const lines = Array.isArray(basket.lines) ? basket.lines.map((line: any) => ({
    id: clean(line.id) || crypto.randomUUID(),
    productSlug: slug(line.productSlug),
    categorySlug: slug(line.categorySlug),
    productName: clean(line.productName || line.productSlug),
    image: clean(line.image),
    selectedOptions: safeSelectedOptions(line.selectedOptions),
    quantity: safeQuantity(line.quantity),
    delivery: clean(line.delivery),
    customSize: line.customSize && typeof line.customSize === 'object' && !Array.isArray(line.customSize) ? line.customSize : null,
    sku: clean(line.sku), currency: clean(line.currency) || 'GBP', netMinor: safeMinor(line.netMinor), vatMinor: safeMinor(line.vatMinor), grossMinor: safeMinor(line.grossMinor), formattedTotal: clean(line.formattedTotal), vatRate: line.vatRate === null || line.vatRate === undefined ? null : Number(line.vatRate), vatClass: clean(line.vatClass), vatReason: clean(line.vatReason), pricingSource: clean(line.pricingSource), artwork: safeArtwork(line.artwork), createdAt: clean(line.createdAt) || nowIso(), updatedAt: clean(line.updatedAt) || nowIso(),
  })).filter((line: StorefrontBasketLine) => line.productSlug) : [];
  return totals({ ...fallback, ...basket, id, tenantSlug: slug(tenantSlug), storeSlug: slug(storeSlug), schemaVersion: 1, status: basket.status === 'converted' ? 'converted' : basket.status === 'abandoned' ? 'abandoned' : 'active', lines, createdAt: clean(basket.createdAt) || fallback.createdAt, convertedOrderId: clean(basket.convertedOrderId) || null });
}

async function readStoredBasket(tenantId: string, basketId: string, tenantSlug: string, storeSlug: string) {
  try {
    const record = await getInternalCatalogRecord({ tenantId }, BASKET_RESOURCE, basketId);
    const basket = normaliseStoredBasket((record as any)?.metadataJson, basketId, tenantSlug, storeSlug);
    if (basket.tenantSlug !== slug(tenantSlug) || basket.storeSlug !== slug(storeSlug)) return emptyBasket(basketId, tenantSlug, storeSlug);
    return basket;
  } catch {
    return emptyBasket(basketId, tenantSlug, storeSlug);
  }
}

async function priceLine(request: Request, tenantSlug: string, input: BasketLineInput, existing?: StorefrontBasketLine | null): Promise<StorefrontBasketLine> {
  const productSlug = slug(input.productSlug || existing?.productSlug);
  if (!productSlug) throw new Error('Basket line is missing a product.');
  const selectedOptions = safeSelectedOptions(input.selectedOptions ?? existing?.selectedOptions ?? []);
  const quantity = safeQuantity(input.quantity ?? existing?.quantity ?? 1);
  const delivery = clean(input.delivery ?? existing?.delivery);
  const customSize = input.customSize ?? existing?.customSize ?? null;
  const price = await calculateNativeStorefrontPrice({ request: tenantScopedRequest(request, tenantSlug), tenantSlug, productSlug, selectedOptions, quantity, delivery: delivery || null, customSize });
  const currency = clean(price.currency) || 'GBP';
  const productName = clean(price.product?.name || price.product?.title || input.productName || existing?.productName || productSlug);
  const timestamp = nowIso();
  return {
    id: clean(input.lineId || existing?.id) || crypto.randomUUID(),
    productSlug,
    categorySlug: slug(input.categorySlug || existing?.categorySlug || price.product?.categorySlug || price.product?.metadataJson?.categorySlug),
    productName,
    image: productImage(price.product) || existing?.image || '',
    selectedOptions: safeSelectedOptions(price.selectedOptions?.length ? price.selectedOptions : selectedOptions),
    quantity: safeQuantity(price.quantity || quantity),
    delivery: clean(price.resolvedConfig?.selectedDelivery || delivery),
    customSize,
    sku: clean(price.matchedRow?.sku || price.matchedRow?.oldSku),
    currency,
    netMinor: safeMinor(price.netPriceMinor),
    vatMinor: safeMinor(price.vatMinor),
    grossMinor: safeMinor(price.finalPriceMinor),
    formattedTotal: formatMinorPrice(price.finalPriceMinor, currency),
    vatRate: price.vatRate ?? null,
    vatClass: clean(price.vatClass),
    vatReason: clean(price.vatReason),
    pricingSource: clean(price.pricingSource),
    artwork: safeArtwork(input.artwork || existing?.artwork),
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export async function savePersistentBasket(basket: StorefrontBasket) {
  const tenantId = await resolveTenantId(basket.tenantSlug);
  const next = totals(basket);
  await upsertInternalCatalogRecord({ tenantId }, BASKET_RESOURCE, { id: next.id, slug: next.id, name: `Storefront basket ${next.id}`, description: `Persistent basket for ${next.tenantSlug}/${next.storeSlug}`, metadataJson: next as any } as any);
  return next;
}

export async function loadPersistentBasket(request: Request, tenantSlug: string, storeSlug: string, basketId: string, options: { reprice?: boolean; persistRefresh?: boolean } = {}) {
  const safeId = clean(basketId) || newBasketId();
  const tenantId = await resolveTenantId(tenantSlug);
  let basket = await readStoredBasket(tenantId, safeId, tenantSlug, storeSlug);
  if (basket.status !== 'active') basket = emptyBasket(safeId, tenantSlug, storeSlug);
  if (options.reprice && basket.lines.length) {
    const lines = await Promise.all(basket.lines.map((line) => priceLine(request, tenantSlug, { ...line, lineId: line.id }, line)));
    basket = totals({ ...basket, lines });
    if (options.persistRefresh) await savePersistentBasket(basket);
  }
  return basket;
}

export async function addOrUpdateBasketLine(request: Request, tenantSlug: string, storeSlug: string, basketId: string, input: BasketLineInput) {
  let basket = await loadPersistentBasket(request, tenantSlug, storeSlug, basketId, { reprice: false });
  const existing = input.lineId ? basket.lines.find((line) => line.id === clean(input.lineId)) || null : null;
  const line = await priceLine(request, tenantSlug, input, existing);
  if (existing) basket = { ...basket, lines: basket.lines.map((item) => item.id === existing.id ? line : item) };
  else {
    if (basket.lines.length >= MAX_BASKET_LINES) throw new Error(`A basket can contain up to ${MAX_BASKET_LINES} lines.`);
    basket = { ...basket, lines: [...basket.lines, line] };
  }
  return savePersistentBasket(totals(basket));
}

export async function updateBasketLineArtwork(request: Request, tenantSlug: string, storeSlug: string, basketId: string, lineId: string, artwork: Partial<StorefrontBasketArtwork>) {
  const basket = await loadPersistentBasket(request, tenantSlug, storeSlug, basketId, { reprice: false });
  if (!basket.lines.some((line) => line.id === lineId)) throw new Error('Basket line was not found.');
  return savePersistentBasket({ ...basket, lines: basket.lines.map((line) => line.id === lineId ? { ...line, artwork: safeArtwork({ ...line.artwork, ...artwork }), updatedAt: nowIso() } : line) });
}

export async function removeBasketLine(request: Request, tenantSlug: string, storeSlug: string, basketId: string, lineId: string) {
  const basket = await loadPersistentBasket(request, tenantSlug, storeSlug, basketId, { reprice: false });
  return savePersistentBasket({ ...basket, lines: basket.lines.filter((line) => line.id !== lineId) });
}

export async function markBasketConverted(basket: StorefrontBasket, orderId: string) {
  return savePersistentBasket({ ...basket, status: 'converted', convertedOrderId: orderId, lines: [], itemCount: 0, lineCount: 0, netMinor: 0, vatMinor: 0, grossMinor: 0, formattedTotal: formatMinorPrice(0, basket.currency || 'GBP') });
}

export function basketSummary(basket: StorefrontBasket) {
  return { basketId: basket.id, lineCount: basket.lineCount, itemCount: basket.itemCount, currency: basket.currency, netMinor: basket.netMinor, vatMinor: basket.vatMinor, grossMinor: basket.grossMinor, formattedTotal: basket.formattedTotal };
}

export function basketLineEditHref(storeBase: string, line: StorefrontBasketLine) {
  const params = new URLSearchParams({ basketLine: line.id, quantity: String(line.quantity) });
  if (line.delivery) params.set('delivery', line.delivery);
  line.selectedOptions.forEach((option) => { if (option.key && option.slug) params.set(option.key, option.slug); });
  return `${storeBase}/${line.categorySlug}/${line.productSlug}?${params.toString()}`;
}
