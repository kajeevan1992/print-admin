import crypto from 'crypto';
import { publicApiCanAccessStore, publicApiRequestFor, type PublicApiAuthContext, type PublicApiStoreAccess } from '@/core/api/public-api-auth';
import { listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import { platformPrisma } from '@/core/db/platform-prisma';
import { queueOrderPlacedEmails } from '@/core/email/order-notifications.service';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { upsertArtworkProductionTicket } from '@/core/storefront/artwork-production-bridge.service';
import { calculateNativeStorefrontPrice, formatMinorPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';
import { getStorefrontProduct, listStorefrontProducts } from '@/core/storefront/storefront-product-catalog';
import { calculateVatLine } from '@/core/tax/vat-rules';
import type { TenantContext } from '@/core/tenant/types';

const STORE_RESOURCE = 'storefront-stores';
const DOMAIN_RESOURCE = 'storefront-domains';
const IDEMPOTENCY_RESOURCE = 'storefront-idempotency';
const STORE_SLUG_RESOURCE = 'storefront-store-slugs';
const DOMAIN_NAMESPACE_TENANT = '__storefront_domains__';
const STORE_NAMESPACE_TENANT = '__storefront_stores__';
const DEFAULT_THEME = 'base';

type Json = Record<string, any>;
type StoreStatus = 'draft' | 'published' | 'suspended';
type DomainStatus = 'pending' | 'verified' | 'active' | 'failed';
type TenantRow = { id: string; slug: string; name: string; status: string; defaultSubdomain?: string; primaryDomain?: string | null; themeKey?: string };

export type StorefrontStore = {
  storeId: string; tenantId: string; tenantSlug: string; storeSlug: string; storeName: string;
  status: StoreStatus; themeId: string; branding: Json; content: Json; navigation: Json[];
  canonicalHost?: string; previewUrl: string; domains: Json[]; createdAt?: string; updatedAt?: string;
};

export class StorefrontApiError extends Error {
  status: number; code: string; fieldErrors?: Record<string, string[]>;
  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
    super(message); this.name = 'StorefrontApiError'; this.status = status; this.code = code; this.fieldErrors = fieldErrors;
  }
}

function clean(value: unknown) { return String(value ?? '').trim(); }
function lower(value: unknown) { return clean(value).toLowerCase(); }
function slug(value: unknown) { return lower(value).replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function asObject(value: unknown): Json { return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}; }
function asArray<T = any>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`; }
function hash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function bool(value: unknown, fallback = false) { return value === undefined || value === null || value === '' ? fallback : value === true || ['1', 'true', 'yes', 'on'].includes(lower(value)); }
function integer(value: unknown, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? Math.round(next) : fallback; }
function normaliseHost(value: unknown) { return lower(value).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, ''); }
function rootDomain() { return normaliseHost(process.env.STOREFRONT_ROOT_DOMAIN || process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || 'stores.print-saas.local'); }
function frontendBase() { return clean(process.env.STOREFRONT_FRONTEND_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || '').replace(/\/$/, ''); }
function previewUrl(storeId: string, canonicalHost: string) { return frontendBase() ? `${frontendBase()}/preview?storeId=${encodeURIComponent(storeId)}` : `https://${canonicalHost}/?previewStoreId=${encodeURIComponent(storeId)}`; }
function currency(value: unknown) { return clean(value || 'GBP').toUpperCase(); }
function title(value: unknown, fallback = '') { return clean(value) || fallback; }
function error(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>): never { throw new StorefrontApiError(status, code, message, fieldErrors); }
function storeAccess(store: StorefrontStore): PublicApiStoreAccess { return { storeId: store.storeId, tenantId: store.tenantId, siteId: store.storeId, slug: store.storeSlug, domains: store.domains.map((item) => normaliseHost(item.domain || item)).filter(Boolean), status: store.status }; }
function requestWithStore(request: Request, store: StorefrontStore, method = 'GET') { return publicApiRequestFor(request, { tenantId: store.tenantId, siteId: store.storeId }, method); }

function defaultBranding(storeName: string, branding: Json = {}) {
  return { storeName, logoUrl: '', primaryColour: '#18a7d0', primaryDarkColour: '#087d9d', inkColour: '#10222b', mutedColour: '#667780', backgroundColour: '#ffffff', lineColour: '#dce6ea', ...branding, storeName: clean(branding.storeName) || storeName };
}
function defaultContent(content: Json = {}) {
  return { announcement: '', heroTitle: '', heroSubtitle: '', heroImageUrl: '', footerText: '', pages: { home: { enabled: true, title: 'Home' }, products: { enabled: true, title: 'Products' }, contact: { enabled: true, title: 'Contact' }, ...asObject(content.pages) }, ...content };
}
function defaultNavigation(navigation?: unknown) {
  const supplied = asArray<Json>(navigation);
  if (supplied.length) return supplied.map((item, index) => ({ id: clean(item.id) || `nav-${index + 1}`, label: clean(item.label) || 'Page', path: clean(item.path) || '/', enabled: item.enabled !== false, order: integer(item.order, index + 1) }));
  return [{ id: 'home', label: 'Home', path: '/', enabled: true, order: 1 }, { id: 'products', label: 'Products', path: '/products', enabled: true, order: 2 }, { id: 'contact', label: 'Contact', path: '/contact', enabled: true, order: 3 }];
}

function storeFromRow(row: any): StorefrontStore | null {
  if (!row) return null;
  const meta = asObject(row.metadataJson); const storeId = clean(meta.storeId || meta.siteId || row.id); const tenantId = clean(meta.tenantId || row.tenantId); const storeSlug = slug(meta.storeSlug || meta.slug || row.slug);
  if (!storeId || !tenantId || !storeSlug) return null;
  const storeName = clean(meta.storeName || meta.branding?.storeName || row.name || storeSlug);
  const canonicalHost = normaliseHost(meta.canonicalHost || asArray<Json>(meta.domains).find((item) => ['active', 'verified'].includes(lower(item.status)))?.domain || '');
  return { storeId, tenantId, tenantSlug: slug(meta.tenantSlug || tenantId), storeSlug, storeName, status: ['published', 'suspended'].includes(lower(meta.status)) ? lower(meta.status) as StoreStatus : 'draft', themeId: clean(meta.themeId || DEFAULT_THEME), branding: defaultBranding(storeName, asObject(meta.branding)), content: defaultContent(asObject(meta.content)), navigation: defaultNavigation(meta.navigation), canonicalHost: canonicalHost || undefined, previewUrl: clean(meta.previewUrl) || previewUrl(storeId, canonicalHost || `${storeSlug}.${rootDomain()}`), domains: asArray<Json>(meta.domains), createdAt: clean(meta.createdAt || row.createdAt) || undefined, updatedAt: clean(meta.updatedAt || row.updatedAt) || undefined };
}
async function queryStore(whereSql: string, value: string) {
  const rows = await platformPrisma.$queryRawUnsafe<any[]>(`SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt" FROM "CoreCatalogRecord" WHERE resource=$1 AND ${whereSql} ORDER BY "updatedAt" DESC LIMIT 1`, STORE_RESOURCE, value);
  return storeFromRow(rows[0]);
}
export async function getStorefrontStore(storeId: string) { return queryStore('(id=$2 OR slug=$2 OR "metadataJson"->>\'storeId\'=$2 OR "metadataJson"->>\'siteId\'=$2)', clean(storeId)); }
async function getStoreBySlug(storeSlug: string) { return queryStore('(slug=$2 OR "metadataJson"->>\'storeSlug\'=$2)', slug(storeSlug)); }
async function tenantById(value: string): Promise<TenantRow | null> {
  const rows = await platformPrisma.$queryRawUnsafe<TenantRow[]>('SELECT id,slug,name,status,"defaultSubdomain","primaryDomain","themeKey" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', clean(value));
  return rows[0] || null;
}
async function writeRecord(client: any, input: { id: string; tenantId: string; resource: string; slug: string; name: string; description?: string; metadataJson: Json }, insertOnly = false) {
  if (insertOnly) {
    await client.$executeRawUnsafe('INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)', input.id, input.tenantId, input.resource, input.slug, input.name, input.description || '', input.metadataJson); return;
  }
  await client.$executeRawUnsafe('INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP) ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,"metadataJson"=EXCLUDED."metadataJson","updatedAt"=CURRENT_TIMESTAMP', input.id, input.tenantId, input.resource, input.slug, input.name, input.description || '', input.metadataJson);
}
async function persistStore(store: StorefrontStore, client: any = platformPrisma, insertOnly = false) {
  const savedAt = now(); const metadataJson = { ...store, updatedAt: savedAt, createdAt: store.createdAt || savedAt };
  await writeRecord(client, { id: store.storeId, tenantId: store.tenantId, resource: STORE_RESOURCE, slug: store.storeSlug, name: store.storeName, description: `Storefront ${store.storeSlug}`, metadataJson }, insertOnly);
  return { ...store, updatedAt: savedAt, createdAt: store.createdAt || savedAt };
}
function idempotencySlug(auth: PublicApiAuthContext, scope: string, key: string) { return hash(`${auth.apiKey}:${scope}:${key}`); }
async function readIdempotency(auth: PublicApiAuthContext, tenantId: string, scope: string, key: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, IDEMPOTENCY_RESOURCE, idempotencySlug(auth, scope, key));
  return asObject(rows[0]?.metadataJson).response || null;
}
async function saveIdempotency(auth: PublicApiAuthContext, tenantId: string, scope: string, key: string, response: Json) {
  await writeRecord(platformPrisma, { id: id('idem'), tenantId, resource: IDEMPOTENCY_RESOURCE, slug: idempotencySlug(auth, scope, key), name: `${scope} idempotency`, description: 'Server-side idempotency response', metadataJson: { scope, keyHash: hash(key), credentialHash: hash(auth.apiKey), response, completedAt: now() } });
}
function assertStoreAccess(auth: PublicApiAuthContext, store: StorefrontStore) { if (!publicApiCanAccessStore(auth, storeAccess(store))) error(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested store.'); }
function assertTenantAccess(auth: PublicApiAuthContext, tenantId: string) { if (!auth.serviceClient && auth.tenantId !== tenantId) error(403, 'TENANT_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested tenant.'); }
async function domainByHost(hostname: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; slug: string; metadataJson: any }>>('SELECT "tenantId",slug,"metadataJson" FROM "CoreCatalogRecord" WHERE resource=$1 AND slug=$2 ORDER BY "updatedAt" DESC LIMIT 1', DOMAIN_RESOURCE, normaliseHost(hostname));
  return rows[0] || null;
}
async function writeDomain(client: any, tenantId: string, storeId: string, storeSlug: string, domain: string, status: DomainStatus, type: 'platform' | 'custom', verification?: Json) {
  const hostname = normaliseHost(domain); const metadataJson = { domain: hostname, storeId, storeSlug, tenantId, status, type, verification: verification || null, updatedAt: now() };
  await writeRecord(client, { id: id('domain'), tenantId: DOMAIN_NAMESPACE_TENANT, resource: DOMAIN_RESOURCE, slug: hostname, name: hostname, description: `${type} storefront domain`, metadataJson }, true); return metadataJson;
}

export async function resolveStorefrontByHost(auth: PublicApiAuthContext, hostInput: string) {
  const hostname = normaliseHost(hostInput); if (!hostname) error(400, 'HOST_REQUIRED', 'A storefront host is required.', { host: ['Host is required.'] });
  const domain = await domainByHost(hostname); const domainMeta = asObject(domain?.metadataJson);
  if (!domain || !['active', 'verified'].includes(lower(domainMeta.status))) error(404, 'STOREFRONT_NOT_FOUND', 'No published storefront is available for this host.');
  const store = await getStorefrontStore(clean(domainMeta.storeId));
  if (!store || store.status !== 'published') error(404, 'STOREFRONT_NOT_FOUND', 'No published storefront is available for this host.');
  const tenant = await tenantById(store.tenantId);
  if (!tenant || ['SUSPENDED', 'PENDING_ACTIVATION'].includes(clean(tenant.status).toUpperCase())) error(404, 'STOREFRONT_NOT_FOUND', 'No published storefront is available for this host.');
  assertStoreAccess(auth, store);
  return { storeId: store.storeId, tenantId: store.tenantId, tenantSlug: tenant.slug || store.tenantSlug, storeSlug: store.storeSlug, status: store.status, canonicalHost: store.canonicalHost || hostname, themeId: store.themeId };
}

function productImage(product: Json) { const media = asObject(product.media); const images = asArray<any>(media.images || product.images || product.metadataJson?.images); const first = images[0]; return clean(media.primary || media.hero || product.imageUrl || product.image || (typeof first === 'string' ? first : first?.url)); }
function buyingMode(product: Json): 'cart' | 'quote' { const mode = lower(product.buyingMode || product.checkout?.mode || product.metadataJson?.buyingMode); const productType = clean(product.productType || product.metadataJson?.productType).toUpperCase(); return mode.includes('quote') || productType === 'QUOTE_LED' ? 'quote' : 'cart'; }
function productCard(product: Json) {
  const priceFromMinor = integer(product.priceFromMinor || product.metadataJson?.priceFromMinor || product.metadataJson?.pricing?.priceFromMinor, 0);
  return { id: clean(product.id), slug: slug(product.slug || product.id), categorySlug: slug(product.categorySlug || product.metadataJson?.categorySlug || product.categoryId || ''), title: title(product.name || product.title, slug(product.slug || product.id)), description: clean(product.description || product.content?.shortDescription || product.metadataJson?.description), imageUrl: productImage(product), ...(priceFromMinor > 0 ? { formattedFromPrice: formatMinorPrice(priceFromMinor, currency(product.currency)) } : {}), buyingMode: buyingMode(product) };
}
function categoryCard(category: Json, products: Json[]) {
  const categorySlug = slug(category.slug || category.id); const count = integer(category.productCount, products.filter((product) => slug(product.categorySlug || product.categoryId) === categorySlug).length);
  return { id: clean(category.id || categorySlug), slug: categorySlug, title: title(category.name || category.title, categorySlug), description: clean(category.description || category.metadataJson?.description), imageUrl: clean(category.imageUrl || category.metadataJson?.imageUrl || category.metadataJson?.image), productCount: Math.max(0, count) };
}
async function catalogForStore(request: Request, store: StorefrontStore) {
  const ctx: TenantContext = { tenantId: store.tenantId, siteId: store.storeId };
  const [categoryResult, productResult] = await Promise.all([listInternalCatalog(ctx, 'categories', { page: 1, limit: 300 }), listStorefrontProducts(requestWithStore(request, store))]);
  const rawCategories = asArray<Json>((categoryResult as any)?.items); const rawProducts = asArray<Json>((productResult as any)?.items);
  return { categories: rawCategories.map((item) => categoryCard(item, rawProducts)), products: rawProducts.map(productCard), rawProducts };
}
export async function getStorefrontBootstrap(auth: PublicApiAuthContext, request: Request, storeId: string) {
  const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store);
  const tenant = await tenantById(store.tenantId); if (!tenant) error(404, 'TENANT_NOT_FOUND', 'The storefront tenant was not found.'); const catalog = await catalogForStore(request, store);
  return { storeId: store.storeId, tenantId: store.tenantId, tenantSlug: tenant.slug || store.tenantSlug, storeSlug: store.storeSlug, status: store.status, themeId: store.themeId, branding: store.branding, navigation: store.navigation, categories: catalog.categories, products: catalog.products, content: store.content };
}

function optionRows(groups: Json[]) { return groups.map((group, groupIndex) => ({ id: clean(group.id || group.key || `group-${groupIndex + 1}`), key: clean(group.key || group.id || `group-${groupIndex + 1}`), label: clean(group.label || group.name || group.key || 'Option'), displayType: clean(group.displayType || 'pill'), options: asArray<Json>(group.options || group.values).map((option, optionIndex) => ({ id: clean(option.id || option.key || option.value || `option-${optionIndex + 1}`), slug: slug(option.slug || option.value || option.id || option.label), label: clean(option.label || option.name || option.value), value: clean(option.value || option.slug || option.id || option.label), description: clean(option.description || option.helpText), recommended: bool(option.recommended || option.default, optionIndex === 0), disabled: bool(option.disabled, false) })) })); }
function quantityRows(rows: Json[], currencyCode: string) { return rows.map((row) => ({ quantity: Math.max(1, integer(row.quantity || row.qty || row.value, 1)), label: clean(row.label || row.quantity || row.qty || row.value), ...(integer(row.priceMinor, 0) > 0 ? { formattedPrice: formatMinorPrice(integer(row.priceMinor), currencyCode) } : {}), recommended: bool(row.recommended || row.default, false), available: row.available !== false })); }
function deliveryRows(rows: Json[]) { return rows.map((row, index) => ({ id: clean(row.id || row.value || `delivery-${index + 1}`), value: clean(row.value || row.id || row.label), label: clean(row.label || row.name || row.value || 'Delivery'), description: clean(row.description || row.deliveryEstimate?.displayText), addon: clean(row.addon || row.priceLabel), recommended: bool(row.recommended || row.selected, index === 0), available: row.available !== false })); }
function selectedOptionRows(selections: Json, groups: Json[]): NativeSelectedOptionRow[] { return Object.entries(selections).map(([key, value]) => { const group = groups.find((item) => clean(item.key) === key || slug(item.key) === slug(key)); const option = asArray<Json>(group?.options || group?.values).find((item) => clean(item.value) === clean(value) || slug(item.slug || item.value || item.label) === slug(value)); return { key, label: clean(group?.label || key), value: clean(value), slug: slug(option?.slug || option?.value || value) }; }); }
function explicitAddonPrice(option: Json) { return Math.max(0, integer(option.addonPriceMinor ?? option.addOnPriceMinor ?? option.priceDeltaMinor ?? option.surchargeMinor ?? option.priceMinor ?? option.grossMinor, 0)); }
function isAddon(group: Json, option: Json) { const marker = lower([group.role, group.renderLocation, group.type, option.lineType, option.type, option.priceType].filter(Boolean).join(' ')); return option.isAddon === true || option.addon === true || option.addOn === true || marker.includes('add-on') || marker.includes('addon') || marker.includes('finishing') || marker.includes('service'); }
function mixedVatLines(price: Awaited<ReturnType<typeof calculateNativeStorefrontPrice>>) {
  const groups = asArray<Json>((price.resolvedConfig as any)?.groups); const selected = asArray<NativeSelectedOptionRow>(price.selectedOptions);
  const addOnCandidates = selected.map((row) => {
    const group = groups.find((item) => clean(item.key) === clean(row.key) || slug(item.key) === slug(row.key));
    const option = asArray<Json>(group?.options || group?.values).find((item) => clean(item.value) === clean(row.value) || slug(item.slug || item.value || item.label) === slug(row.slug || row.value));
    if (!group || !option || !isAddon(group, option)) return null; const grossMinor = explicitAddonPrice(option); if (grossMinor <= 0) return null;
    const taxSettings = asObject(option.taxSettings || option.metadataJson?.taxSettings || { taxClass: 'standard' }); const vatRate = option.vatRate ?? option.taxRate ?? taxSettings.vatRate;
    const vat = calculateVatLine({ name: option.label || group.label || row.label, titleSnapshot: option.label || row.label, taxSettings, vatRate, vatClass: option.vatClass || option.taxClass, metadataJson: option.metadataJson || {} }, 1, grossMinor);
    return { lineType: 'add-on', key: row.key, value: row.value, label: clean(option.label || row.label || group.label || row.key), taxSettings, ...vat };
  }).filter(Boolean) as Json[];
  const addOnGross = addOnCandidates.reduce((sum, line) => sum + integer(line.grossMinor), 0);
  if (!addOnCandidates.length || addOnGross <= 0 || addOnGross >= price.finalPriceMinor) return [{ lineType: 'base', label: clean(price.product.name || price.product.title || price.product.slug), grossMinor: price.finalPriceMinor, netMinor: price.netPriceMinor, vatMinor: price.vatMinor, vatRate: price.vatRate, vatClass: price.vatClass, vatReason: price.vatReason, taxSettings: price.taxSettings || null }];
  const baseGross = Math.max(0, price.finalPriceMinor - addOnGross);
  const baseVat = calculateVatLine({ productId: price.product.id, productSlug: price.product.slug, productName: price.product.name || price.product.title, titleSnapshot: price.product.name || price.product.title, categoryName: price.product.categoryName, categorySlug: price.product.categorySlug, taxSettings: price.taxSettings, vatRate: price.vatRate, resolverSnapshot: { product: price.product, pricing: { matchedRow: price.matchedRow } } }, price.quantity, baseGross);
  return [{ lineType: 'base', label: clean(price.product.name || price.product.title || price.product.slug), taxSettings: price.taxSettings || null, ...baseVat }, ...addOnCandidates];
}
async function calculateAuthoritativePrice(input: Parameters<typeof calculateNativeStorefrontPrice>[0]) {
  const raw = await calculateNativeStorefrontPrice(input); const taxLines = mixedVatLines(raw); const netPriceMinor = taxLines.reduce((sum, line) => sum + integer(line.netMinor), 0); const vatMinor = taxLines.reduce((sum, line) => sum + integer(line.vatMinor), 0); const finalPriceMinor = taxLines.reduce((sum, line) => sum + integer(line.grossMinor), 0); const profiles = new Set(taxLines.map((line) => `${line.vatRate}:${line.vatClass}`));
  return { ...raw, taxLines, netPriceMinor, vatMinor, finalPriceMinor, vatRate: profiles.size === 1 ? taxLines[0]?.vatRate ?? raw.vatRate : null, vatClass: profiles.size === 1 ? taxLines[0]?.vatClass || raw.vatClass : 'mixed', vatReason: profiles.size === 1 ? taxLines[0]?.vatReason || raw.vatReason : 'mixed-vat-lines' };
}
export function priceResult(price: Awaited<ReturnType<typeof calculateAuthoritativePrice>>) { return { currency: price.currency, quantity: price.quantity, netMinor: price.netPriceMinor, vatMinor: price.vatMinor, grossMinor: price.finalPriceMinor, formattedPrice: formatMinorPrice(price.finalPriceMinor, price.currency), vatRate: price.vatRate ?? null, vatClass: price.vatClass, vatReason: price.vatReason }; }

export async function getStorefrontProductContract(auth: PublicApiAuthContext, request: Request, storeId: string, productSlug: string) {
  const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store);
  const scopedUrl = new URL(request.url); scopedUrl.searchParams.set('slug', slug(productSlug)); const productResult = await getStorefrontProduct(requestWithStore(new Request(scopedUrl, { headers: request.headers }), store)); const product = asObject((productResult as any)?.product);
  if (!(productResult as any)?.found || !product.id) error(404, 'PRODUCT_NOT_FOUND', 'Published product was not found for this storefront.');
  const resolved = asObject(product.resolvedConfig); const groups = asArray<Json>(resolved.customerGroups || product.storefrontConfig?.customerGroups || product.optionGroups); const initialSelections = asObject(resolved.selections); const selectedQuantity = resolved.selectedQuantity === null || resolved.selectedQuantity === undefined ? null : integer(resolved.selectedQuantity, 1); const selectedDelivery = clean(resolved.selectedDelivery) || null;
  let initialPrice: Json | null = null; try { initialPrice = priceResult(await calculateAuthoritativePrice({ request: requestWithStore(request, store), tenantSlug: store.tenantSlug, productSlug: product.slug, selectedOptions: selectedOptionRows(initialSelections, groups), quantity: selectedQuantity || 1, delivery: selectedDelivery, customSize: null })); } catch {}
  const images = asArray<any>(product.media?.images || product.images || product.metadataJson?.images).map((item) => clean(typeof item === 'string' ? item : item?.url)).filter(Boolean); const hero = productImage(product); if (hero && !images.includes(hero)) images.unshift(hero);
  return { ...productCard(product), images, optionGroups: optionRows(groups), quantityRows: quantityRows(asArray<Json>(resolved.quantityRows), currency(product.currency)), deliveryRows: deliveryRows(asArray<Json>(resolved.deliveryRows || product.deliveryOptions)), initialSelections: Object.fromEntries(Object.entries(initialSelections).map(([key, value]) => [key, clean(value)])), selectedQuantity, selectedDelivery, initialPrice, customSize: asObject(product.customSize || product.metadataJson?.customSize || product.artworkRules?.customSize), artwork: asObject(product.artwork || product.artworkRules || product.metadataJson?.artwork), tax: { vatRate: product.vatRate ?? product.metadataJson?.vatRate ?? null, taxSettings: product.taxSettings || product.metadataJson?.taxSettings || null }, content: asObject(product.content || product.metadataJson?.content) };
}
function validateSelectedOptions(value: unknown): NativeSelectedOptionRow[] { if (!Array.isArray(value)) error(400, 'INVALID_SELECTED_OPTIONS', 'selectedOptions must be an array.', { selectedOptions: ['Expected an array.'] }); return value.map((item) => ({ key: clean(item?.key), label: clean(item?.label), value: clean(item?.value), slug: clean(item?.slug) })).filter((item) => item.key && item.value); }
export async function calculateStorefrontPrice(auth: PublicApiAuthContext, request: Request, storeId: string, body: Json) {
  const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store); const productSlug = slug(body.productSlug); const quantityValue = Math.max(1, integer(body.quantity, 0));
  if (!productSlug || !quantityValue) error(400, 'INVALID_PRICE_REQUEST', 'productSlug and a positive quantity are required.', { productSlug: productSlug ? [] : ['Product slug is required.'], quantity: quantityValue ? [] : ['Positive quantity is required.'] });
  return priceResult(await calculateAuthoritativePrice({ request: requestWithStore(request, store), tenantSlug: store.tenantSlug, productSlug, selectedOptions: validateSelectedOptions(body.selectedOptions), quantity: quantityValue, delivery: clean(body.delivery) || null, customSize: body.customSize ? asObject(body.customSize) : null }));
}
function validUrl(value: unknown, fallback: string): string { const candidate = clean(value) || fallback; try { const parsed = new URL(candidate); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid'); return parsed.toString(); } catch { return error(400, 'INVALID_RETURN_URL', 'successUrl and cancelUrl must be valid HTTP(S) URLs.'); } }
function checkoutCustomer(value: unknown) { const customer = asObject(value); const name = clean(customer.name); const emailAddress = lower(customer.email); const phone = clean(customer.phone); if (!name || !emailAddress || !phone || !emailAddress.includes('@')) error(400, 'CHECKOUT_CUSTOMER_INVALID', 'Customer name, email and phone are required.', { customer: ['Provide a valid name, email and phone.'] }); return { name, email: emailAddress, phone, company: clean(customer.company) }; }
function checkoutAddress(value: unknown) { const address = asObject(value); return { line1: clean(address.line1), line2: clean(address.line2), town: clean(address.town), county: clean(address.county), postcode: clean(address.postcode).toUpperCase(), country: clean(address.country) || 'United Kingdom' }; }
function orderItemsFromPrice(price: Awaited<ReturnType<typeof calculateAuthoritativePrice>>, productSlug: string, productName: string, selectedOptions: NativeSelectedOptionRow[]) {
  const taxLines = asArray<Json>((price as any).taxLines); const base = taxLines.find((line) => line.lineType === 'base') || { grossMinor: price.finalPriceMinor, vatRate: price.vatRate, vatClass: price.vatClass, vatReason: price.vatReason, taxSettings: price.taxSettings };
  const addOns = taxLines.filter((line) => line.lineType === 'add-on').map((line) => ({ titleSnapshot: clean(line.label || line.key || 'Add-on'), name: clean(line.label || line.key || 'Add-on'), quantity: 1, totalPriceMinor: integer(line.grossMinor), vatRate: line.vatRate, vatClass: line.vatClass, vatReason: line.vatReason, taxSettings: line.taxSettings || null, metadataJson: { selectedOptionKey: line.key, selectedOptionValue: line.value, lineType: 'add-on' } }));
  return [{ productId: clean(price.product.id), productSlug, slug: productSlug, productName, titleSnapshot: productName, quantity: price.quantity, totalPriceMinor: integer(base.grossMinor), vatRate: base.vatRate, vatClass: base.vatClass, vatReason: base.vatReason, taxSettings: base.taxSettings || price.taxSettings || null, selectedOptions, resolverSnapshot: { product: price.product, pricing: { matchedRow: price.matchedRow, source: price.pricingSource } }, addOns }];
}

export async function createStorefrontCheckoutSession(auth: PublicApiAuthContext, request: Request, storeId: string, idempotencyKey: string, body: Json) {
  if (clean(idempotencyKey).length < 16) error(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A unique idempotency-key header of at least 16 characters is required.'); const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store); const previous = await readIdempotency(auth, store.tenantId, 'checkout-session', idempotencyKey); if (previous) return previous;
  const productSlug = slug(body.productSlug); const selectedOptions = validateSelectedOptions(body.selectedOptions); const quantityValue = Math.max(1, integer(body.quantity, 0)); const fulfilmentMode = lower(body.fulfilmentMode) === 'delivery' ? 'delivery' : lower(body.fulfilmentMode) === 'collection' ? 'collection' : ''; const customer = checkoutCustomer(body.customer); const artwork = asObject(body.artwork); const artworkStatus = lower(artwork.status);
  if (!productSlug || !quantityValue || !fulfilmentMode || !['ready', 'send-later', 'need-design'].includes(artworkStatus)) error(400, 'CHECKOUT_REQUEST_INVALID', 'Product, quantity, fulfilment mode and artwork status are required.'); const deliveryAddress = body.deliveryAddress ? checkoutAddress(body.deliveryAddress) : null; const billingAddress = body.billingAddress ? checkoutAddress(body.billingAddress) : deliveryAddress; if (fulfilmentMode === 'delivery' && (!deliveryAddress?.line1 || !deliveryAddress?.town || !deliveryAddress?.postcode)) error(400, 'DELIVERY_ADDRESS_REQUIRED', 'A complete delivery address is required for delivery orders.');
  const scopedRequest = requestWithStore(request, store); const price = await calculateAuthoritativePrice({ request: scopedRequest, tenantSlug: store.tenantSlug, productSlug, selectedOptions, quantity: quantityValue, delivery: clean(body.delivery) || null, customSize: body.customSize ? asObject(body.customSize) : null }); const productName = title(price.product.name || price.product.title, productSlug); const orderNumber = `WEB-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const order = await saveOrder(scopedRequest, { orderNumber, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, customerCompany: customer.company, customer, fulfilmentMode, fulfillmentMode: fulfilmentMode, selectedDelivery: clean(body.delivery), deliveryAddress, billingAddress, currency: price.currency, status: 'AWAITING_PAYMENT', paymentStatus: 'pending', paymentProvider: 'stripe', source: 'storefront-v1', storeId: store.storeId, storeName: store.storeName, notes: `Storefront API order for ${store.storeName}. Artwork: ${artworkStatus}.`, items: orderItemsFromPrice(price, productSlug, productName, selectedOptions), artworkUploadId: clean(artwork.uploadId), artwork: { status: artworkStatus, uploadId: clean(artwork.uploadId), notes: clean(artwork.notes) }, rawCheckout: { storeId: store.storeId, tenantId: store.tenantId, productSlug, selectedOptions, quantity: price.quantity, delivery: clean(body.delivery), customSize: body.customSize || null, fulfilmentMode, customer, deliveryAddress, billingAddress, artwork, acceptedQuoteId: clean(body.acceptedQuoteId), authoritativePrice: priceResult(price) } });
  const tenantCtx: TenantContext = { tenantId: store.tenantId, siteId: store.storeId };
  await upsertArtworkProductionTicket({ ctx: tenantCtx, orderId: order.id, orderNumber, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, productName, productSlug, categorySlug: slug(price.product.categorySlug || price.product.categoryId), quantity: price.quantity, selectedDelivery: clean(body.delivery), fulfilmentMode, deliveryAddress, billingAddress, artworkStatus, artworkNotes: clean(artwork.notes), upload: null, priceMinor: price.finalPriceMinor, paymentStatus: 'pending', paymentProvider: 'stripe', orderStatus: 'AWAITING_PAYMENT' }).catch(() => null);
  const origin = new URL(request.url).origin; const successUrl = validUrl(body.successUrl, `${origin}/checkout/success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`); const cancelUrl = validUrl(body.cancelUrl, `${origin}/checkout/cancel?orderId=${encodeURIComponent(order.id)}`); const stripe = await createStripeCheckoutSession(scopedRequest, { orderId: order.id, customerEmail: customer.email, successUrl, cancelUrl }); const paymentUrl = clean(stripe.session?.url); if (!paymentUrl) error(500, 'PAYMENT_SESSION_FAILED', 'Stripe did not return a payment URL.'); await queueOrderPlacedEmails(scopedRequest, { ...order, paymentStatus: 'pending', paymentProvider: 'stripe', stripeCheckoutSessionId: stripe.session?.id || '', paymentUrl }).catch(() => null);
  const response = { checkoutSessionId: clean(stripe.session?.id), orderId: order.id, orderNumber, paymentUrl, ...(stripe.session?.expires_at ? { expiresAt: new Date(Number(stripe.session.expires_at) * 1000).toISOString() } : {}), price: priceResult(price) }; await saveIdempotency(auth, store.tenantId, 'checkout-session', idempotencyKey, response); return response;
}

export async function createStorefront(auth: PublicApiAuthContext, idempotencyKey: string, body: Json) {
  if (clean(idempotencyKey).length < 16) error(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A unique idempotency-key header of at least 16 characters is required.'); const tenant = await tenantById(clean(body.tenantId)); if (!tenant) error(404, 'TENANT_NOT_FOUND', 'The requested tenant was not found.'); assertTenantAccess(auth, tenant.id); const storeName = clean(body.storeName); const storeSlug = slug(body.storeSlug); const themeId = clean(body.themeId || tenant.themeKey || DEFAULT_THEME);
  if (!storeName || !storeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug) || !themeId) error(400, 'STORE_CREATE_INVALID', 'tenantId, storeName, storeSlug and themeId are required.', { storeSlug: ['Use lowercase letters, numbers and hyphens only.'] }); const previous = await readIdempotency(auth, tenant.id, 'store-create', idempotencyKey); if (previous) return previous; if (await getStoreBySlug(storeSlug)) error(409, 'STORE_SLUG_CONFLICT', 'The requested store slug is already allocated.');
  const storeId = id('store'); const canonicalHost = `${storeSlug}.${rootDomain()}`; const createdAt = now(); const domain = { domain: canonicalHost, status: 'active', type: 'platform', verifiedAt: createdAt, primary: true };
  const store: StorefrontStore = { storeId, tenantId: tenant.id, tenantSlug: tenant.slug, storeSlug, storeName, status: 'draft', themeId, branding: defaultBranding(storeName, asObject(body.branding)), content: defaultContent(asObject(body.content)), navigation: defaultNavigation(body.navigation), canonicalHost, previewUrl: previewUrl(storeId, canonicalHost), domains: [domain], createdAt, updatedAt: createdAt };
  try { await (platformPrisma as any).$transaction(async (tx: any) => { await writeRecord(tx, { id: id('store-slug'), tenantId: STORE_NAMESPACE_TENANT, resource: STORE_SLUG_RESOURCE, slug: storeSlug, name: storeName, description: 'Global storefront slug reservation', metadataJson: { storeId, tenantId: tenant.id, storeSlug, createdAt } }, true); await persistStore(store, tx, true); await writeDomain(tx, tenant.id, storeId, storeSlug, canonicalHost, 'active', 'platform'); }); } catch (cause) { if (String(cause).toLowerCase().includes('unique')) error(409, 'STORE_SLUG_CONFLICT', 'The requested store slug or domain is already allocated.'); throw cause; }
  const response = { storeId, tenantId: tenant.id, storeSlug, status: 'draft', themeId, previewUrl: store.previewUrl, canonicalHost }; await saveIdempotency(auth, tenant.id, 'store-create', idempotencyKey, response); return response;
}
export async function updateStorefront(auth: PublicApiAuthContext, storeId: string, body: Json, request: Request) {
  const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store);
  const next: StorefrontStore = { ...store, themeId: body.themeId === undefined ? store.themeId : clean(body.themeId) || store.themeId, branding: body.branding === undefined ? store.branding : defaultBranding(store.storeName, { ...store.branding, ...asObject(body.branding) }), content: body.content === undefined ? store.content : defaultContent({ ...store.content, ...asObject(body.content), pages: { ...asObject(store.content.pages), ...asObject(body.content?.pages) } }), navigation: body.navigation === undefined ? store.navigation : defaultNavigation(body.navigation), updatedAt: now() };
  await persistStore(next); return getStorefrontBootstrap(auth, request, next.storeId);
}
export async function publishStorefront(auth: PublicApiAuthContext, storeId: string) {
  const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store); const tenant = await tenantById(store.tenantId); const problems: string[] = []; if (!tenant) problems.push('tenant association'); if (!store.storeName) problems.push('store name'); if (!store.storeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store.storeSlug)) problems.push('valid store slug'); if (!store.themeId) problems.push('supported theme'); if (!store.branding?.storeName) problems.push('branding'); const activeDomain = store.domains.find((item) => ['active', 'verified'].includes(lower(item.status))); if (!activeDomain) problems.push('verified domain binding'); if (problems.length) error(409, 'STORE_NOT_PUBLISHABLE', `Storefront cannot be published. Missing: ${problems.join(', ')}.`); const canonicalHost = normaliseHost(store.canonicalHost || activeDomain.domain); const next = await persistStore({ ...store, status: 'published', canonicalHost, updatedAt: now() }); return { storeId: next.storeId, tenantId: next.tenantId, storeSlug: next.storeSlug, status: next.status, themeId: next.themeId, previewUrl: next.previewUrl, canonicalHost };
}
export async function addStorefrontDomain(auth: PublicApiAuthContext, storeId: string, body: Json) {
  const store = await getStorefrontStore(storeId); if (!store) error(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.'); assertStoreAccess(auth, store); const domain = normaliseHost(body.domain); if (!domain || !domain.includes('.') || domain.endsWith(`.${rootDomain()}`)) error(400, 'DOMAIN_INVALID', 'A valid custom domain is required.'); if (await domainByHost(domain)) error(409, 'DOMAIN_CONFLICT', 'This domain is already bound to another storefront.'); const verificationValue = `storefront-verify=${crypto.randomBytes(24).toString('hex')}`; const binding = { domain, status: 'pending', type: 'custom', primary: bool(body.makePrimary), verificationType: 'TXT', verificationName: `_print-saas.${domain}`, verificationValue, createdAt: now() }; await writeDomain(platformPrisma, store.tenantId, store.storeId, store.storeSlug, domain, 'pending', 'custom', { type: binding.verificationType, name: binding.verificationName, value: verificationValue }); const domains = [...store.domains.filter((item) => normaliseHost(item.domain || item) !== domain), binding].map((item) => body.makePrimary ? { ...item, primary: normaliseHost(item.domain || item) === domain } : item); await persistStore({ ...store, domains, canonicalHost: body.makePrimary ? domain : store.canonicalHost, updatedAt: now() }); return { domain, status: 'pending', verificationType: binding.verificationType, verificationName: binding.verificationName, verificationValue };
}
