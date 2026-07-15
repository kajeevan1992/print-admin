import crypto from 'crypto';
import { publicApiCanAccessStore, publicApiRequestFor, type PublicApiAuthContext, type PublicApiStoreAccess } from '@/core/api/public-api-auth';
import { bootstrapStore, calculateStorefrontPricing, productContract } from '@/core/api/storefront-v1.service';
import { upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { platformPrisma } from '@/core/db/platform-prisma';
import { queueOrderPlacedEmails } from '@/core/email/order-notifications.service';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { upsertArtworkProductionTicket } from '@/core/storefront/artwork-production-bridge.service';
import { formatMinorPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';
import { calculateVatLine } from '@/core/tax/vat-rules';
import type { TenantContext } from '@/core/tenant/types';

const STORE_RESOURCE = 'storefront-stores';
const DOMAIN_RESOURCE = 'storefront-domains';
const IDEMPOTENCY_RESOURCE = 'storefront-idempotency';
const SLUG_RESOURCE = 'storefront-store-slugs';
const GLOBAL_DOMAIN_TENANT = '__storefront_domains__';
const GLOBAL_STORE_TENANT = '__storefront_stores__';

type Json = Record<string, any>;
type StoreStatus = 'draft' | 'published' | 'suspended';

type Store = {
  storeId: string;
  tenantId: string;
  tenantSlug: string;
  storeSlug: string;
  storeName: string;
  status: StoreStatus;
  themeId: string;
  branding: Json;
  content: Json;
  navigation: Json[];
  canonicalHost: string;
  previewUrl: string;
  domains: Json[];
  createdAt: string;
  updatedAt: string;
};

export class StorefrontApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string[]>;
  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'StorefrontApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function clean(value: unknown) { return String(value ?? '').trim(); }
function lower(value: unknown) { return clean(value).toLowerCase(); }
function slug(value: unknown) { return lower(value).replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function object(value: unknown): Json { return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}; }
function array<T = any>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function integer(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.round(parsed) : fallback; }
function now() { return new Date().toISOString(); }
function uid(prefix: string) { return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`; }
function digest(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function host(value: unknown) { return lower(value).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, ''); }
function rootDomain() { return host(process.env.STOREFRONT_ROOT_DOMAIN || process.env.STOREFRONT_BASE_DOMAIN || process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || 'stores.print-saas.local'); }
function frontendUrl() { return clean(process.env.STOREFRONT_FRONTEND_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL).replace(/\/$/, ''); }
function fail(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>): never { throw new StorefrontApiError(status, code, message, fieldErrors); }

function defaultBranding(name: string, value: Json = {}) {
  return { logoUrl: '', primaryColour: '#18a7d0', primaryDarkColour: '#087d9d', inkColour: '#10222b', mutedColour: '#667780', backgroundColour: '#ffffff', lineColour: '#dce6ea', ...value, storeName: clean(value.storeName) || name };
}
function defaultContent(value: Json = {}) {
  return { announcement: '', heroTitle: '', heroSubtitle: '', heroImageUrl: '', footerText: '', ...value, pages: { home: { enabled: true, title: 'Home' }, products: { enabled: true, title: 'Products' }, contact: { enabled: true, title: 'Contact' }, ...object(value.pages) } };
}
function defaultNavigation(value: unknown) {
  const supplied = array<Json>(value);
  if (supplied.length) return supplied.map((item, index) => ({ id: clean(item.id) || `nav-${index + 1}`, label: clean(item.label) || 'Page', path: clean(item.path) || '/', enabled: item.enabled !== false, order: integer(item.order, index + 1) }));
  return [{ id: 'home', label: 'Home', path: '/', enabled: true, order: 1 }, { id: 'products', label: 'Products', path: '/products', enabled: true, order: 2 }, { id: 'contact', label: 'Contact', path: '/contact', enabled: true, order: 3 }];
}
function storeFromRow(row: any): Store | null {
  if (!row) return null;
  const meta = object(row.metadataJson);
  const storeId = clean(meta.storeId || meta.siteId || row.id);
  const tenantId = clean(meta.tenantId || row.tenantId);
  const storeSlug = slug(meta.storeSlug || meta.slug || row.slug);
  if (!storeId || !tenantId || !storeSlug) return null;
  const storeName = clean(meta.storeName || meta.name || meta.branding?.storeName || row.name || storeSlug);
  const domains = array<Json>(meta.domains).map((item) => typeof item === 'string' ? { domain: host(item), status: meta.status || 'draft', type: 'custom' } : { ...item, domain: host(item.domain) }).filter((item) => item.domain);
  const canonicalHost = host(meta.canonicalHost || meta.defaultSubdomain || domains.find((item) => ['active', 'verified', 'published'].includes(lower(item.status)))?.domain || `${storeSlug}.${rootDomain()}`);
  return { storeId, tenantId, tenantSlug: slug(meta.tenantSlug || tenantId), storeSlug, storeName, status: ['published', 'suspended'].includes(lower(meta.status)) ? lower(meta.status) as StoreStatus : 'draft', themeId: clean(meta.themeId || meta.theme || meta.selectedTheme || 'base'), branding: defaultBranding(storeName, object(meta.branding)), content: defaultContent(object(meta.content)), navigation: defaultNavigation(meta.navigation || meta.nav), canonicalHost, previewUrl: clean(meta.previewUrl) || (frontendUrl() ? `${frontendUrl()}/preview?storeId=${encodeURIComponent(storeId)}` : `https://${canonicalHost}/?previewStoreId=${encodeURIComponent(storeId)}`), domains, createdAt: clean(meta.createdAt || row.createdAt) || now(), updatedAt: clean(meta.updatedAt || row.updatedAt) || now() };
}
function accessShape(store: Store): PublicApiStoreAccess { return { storeId: store.storeId, tenantId: store.tenantId, siteId: store.storeId, slug: store.storeSlug, domains: store.domains.map((item) => item.domain), status: store.status }; }
function assertAccess(auth: PublicApiAuthContext, store: Store) { if (!publicApiCanAccessStore(auth, accessShape(store))) fail(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested store.'); }
function scopedAuth(auth: PublicApiAuthContext, store: Store): PublicApiAuthContext { return { ...auth, tenantId: store.tenantId, siteId: store.storeId, store: accessShape(store), ctx: { tenantId: store.tenantId, siteId: store.storeId } }; }
function scopedRequest(request: Request, store: Store) { return publicApiRequestFor(request, { tenantId: store.tenantId, siteId: store.storeId }, request.method || 'GET'); }

async function queryStore(condition: string, value: string) {
  const rows = await platformPrisma.$queryRawUnsafe<any[]>(`SELECT id,"tenantId",slug,name,"metadataJson","createdAt","updatedAt" FROM "CoreCatalogRecord" WHERE resource=$1 AND ${condition} ORDER BY "updatedAt" DESC LIMIT 1`, STORE_RESOURCE, value);
  return storeFromRow(rows[0]);
}
export function getStorefrontStore(storeId: string) { return queryStore('(id=$2 OR slug=$2 OR "metadataJson"->>\'storeId\'=$2 OR "metadataJson"->>\'siteId\'=$2)', clean(storeId)); }
function getStoreBySlug(storeSlug: string) { return queryStore('(slug=$2 OR "metadataJson"->>\'storeSlug\'=$2)', slug(storeSlug)); }
async function tenant(value: string) {
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT id,slug,name,status,"themeKey" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', clean(value));
  return rows[0] || null;
}
async function saveRecord(client: any, input: { id: string; tenantId: string; resource: string; slug: string; name: string; description?: string; metadataJson: Json }, insertOnly = false) {
  if (insertOnly) {
    await client.$executeRawUnsafe('INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)', input.id, input.tenantId, input.resource, input.slug, input.name, input.description || '', input.metadataJson);
    return;
  }
  await client.$executeRawUnsafe('INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP) ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,"metadataJson"=EXCLUDED."metadataJson","updatedAt"=CURRENT_TIMESTAMP', input.id, input.tenantId, input.resource, input.slug, input.name, input.description || '', input.metadataJson);
}
async function persistStore(store: Store, client: any = platformPrisma, insertOnly = false) {
  const saved = { ...store, updatedAt: now() };
  await saveRecord(client, { id: store.storeId, tenantId: store.tenantId, resource: STORE_RESOURCE, slug: store.storeSlug, name: store.storeName, description: `Storefront ${store.storeSlug}`, metadataJson: saved }, insertOnly);
  return saved;
}
async function domainRecord(domain: string) {
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT id,"tenantId",slug,"metadataJson" FROM "CoreCatalogRecord" WHERE resource=$1 AND slug=$2 ORDER BY "updatedAt" DESC LIMIT 1', DOMAIN_RESOURCE, host(domain));
  return rows[0] || null;
}
async function saveDomain(client: any, store: Store, domain: Json, insertOnly = false) {
  const hostname = host(domain.domain);
  await saveRecord(client, { id: uid('domain'), tenantId: GLOBAL_DOMAIN_TENANT, resource: DOMAIN_RESOURCE, slug: hostname, name: hostname, description: `Domain for ${store.storeName}`, metadataJson: { ...domain, domain: hostname, storeId: store.storeId, storeSlug: store.storeSlug, tenantId: store.tenantId, updatedAt: now() } }, insertOnly);
}
function idempotencySlug(auth: PublicApiAuthContext, scope: string, key: string) { return digest(`${auth.apiKey}:${scope}:${key}`); }
async function previousResponse(auth: PublicApiAuthContext, tenantId: string, scope: string, key: string) {
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, IDEMPOTENCY_RESOURCE, idempotencySlug(auth, scope, key));
  return object(rows[0]?.metadataJson).response || null;
}
async function saveResponse(auth: PublicApiAuthContext, tenantId: string, scope: string, key: string, response: Json) {
  await saveRecord(platformPrisma, { id: uid('idem'), tenantId, resource: IDEMPOTENCY_RESOURCE, slug: idempotencySlug(auth, scope, key), name: `${scope} idempotency`, metadataJson: { scope, keyHash: digest(key), credentialHash: digest(auth.apiKey), response, completedAt: now() } });
}
function validateIdempotency(key: string) { if (clean(key).length < 16 || clean(key).length > 200) fail(400, 'IDEMPOTENCY_KEY_INVALID', 'idempotency-key must be between 16 and 200 characters.'); }

export async function resolveStorefrontByHost(auth: PublicApiAuthContext, requestedHost: string) {
  const hostname = host(requestedHost);
  if (!hostname) fail(400, 'HOST_REQUIRED', 'A storefront host is required.', { host: ['Host is required.'] });
  const binding = await domainRecord(hostname);
  const meta = object(binding?.metadataJson);
  if (!binding || !['active', 'verified', 'published'].includes(lower(meta.status))) fail(404, 'STOREFRONT_NOT_FOUND', 'No published storefront is available for this host.');
  const store = await getStorefrontStore(clean(meta.storeId));
  if (!store || store.status !== 'published') fail(404, 'STOREFRONT_NOT_FOUND', 'No published storefront is available for this host.');
  const tenantRow = await tenant(store.tenantId);
  if (!tenantRow || ['SUSPENDED', 'PENDING_ACTIVATION'].includes(clean(tenantRow.status).toUpperCase())) fail(404, 'STOREFRONT_NOT_FOUND', 'No published storefront is available for this host.');
  assertAccess(auth, store);
  return { storeId: store.storeId, tenantId: store.tenantId, tenantSlug: tenantRow.slug || store.tenantSlug, storeSlug: store.storeSlug, status: store.status, canonicalHost: store.canonicalHost || hostname, themeId: store.themeId };
}

function categoryCard(item: Json, products: Json[]) {
  const categorySlug = slug(item.slug || item.id);
  return { id: clean(item.id || categorySlug), slug: categorySlug, title: clean(item.name || item.title || categorySlug), description: clean(item.description || item.metadataJson?.description), imageUrl: clean(item.imageUrl || item.metadataJson?.imageUrl || item.metadataJson?.image), productCount: integer(item.productCount, products.filter((product) => slug(product.categorySlug || product.categoryId) === categorySlug).length) };
}
function productCard(item: Json) {
  const meta = object(item.metadataJson);
  const priceMinor = integer(item.priceFromMinor || meta.priceFromMinor || meta.pricing?.priceFromMinor, 0);
  return { id: clean(item.id), slug: slug(item.slug || item.id), categorySlug: slug(item.categorySlug || meta.categorySlug || item.categoryId), title: clean(item.name || item.title || item.slug), description: clean(item.description || meta.description), imageUrl: clean(item.imageUrl || item.image || meta.imageUrl || meta.image), ...(priceMinor ? { formattedFromPrice: formatMinorPrice(priceMinor, clean(item.currency || 'GBP')) } : {}), buyingMode: lower(item.buyingMode || meta.buyingMode).includes('quote') ? 'quote' : 'cart' };
}
export async function getStorefrontBootstrap(auth: PublicApiAuthContext, request: Request, storeId: string) {
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  const raw = await bootstrapStore(scopedAuth(auth, store).ctx, store.storeId);
  const rawProducts = array<Json>(raw.products);
  return { storeId: store.storeId, tenantId: store.tenantId, tenantSlug: store.tenantSlug, storeSlug: store.storeSlug, status: store.status, themeId: store.themeId, branding: store.branding, navigation: store.navigation, categories: array<Json>(raw.categories).map((item) => categoryCard(item, rawProducts)), products: rawProducts.map(productCard), content: store.content };
}
export async function getStorefrontProductContract(auth: PublicApiAuthContext, request: Request, storeId: string, productSlug: string) {
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  try {
    const contract = await productContract(request, scopedAuth(auth, store), productSlug);
    return { ...contract.product, optionGroups: contract.configurator.customerGroups || contract.configurator.groups, quantityRows: contract.configurator.quantityRows, deliveryRows: contract.configurator.deliveryRows, initialSelections: contract.configurator.initialSelections, selectedQuantity: contract.configurator.selectedQuantity, selectedDelivery: contract.configurator.selectedDelivery, initialPrice: contract.initialPrice, artwork: contract.artwork, tax: contract.tax, content: contract.content };
  } catch (cause) {
    if (/not found/i.test(cause instanceof Error ? cause.message : '')) fail(404, 'PRODUCT_NOT_FOUND', 'Published product was not found for this storefront.');
    throw cause;
  }
}

function selectedOptions(value: unknown): NativeSelectedOptionRow[] {
  if (!Array.isArray(value)) fail(400, 'INVALID_SELECTED_OPTIONS', 'selectedOptions must be an array.', { selectedOptions: ['Expected an array.'] });
  return value.map((item) => ({ key: clean(item?.key), label: clean(item?.label), value: clean(item?.value), slug: clean(item?.slug) })).filter((item) => item.key && item.value);
}
function addOnPrice(option: Json) { return Math.max(0, integer(option.addonPriceMinor ?? option.addOnPriceMinor ?? option.priceDeltaMinor ?? option.surchargeMinor ?? option.priceMinor, 0)); }
function isAddOn(group: Json, option: Json) { const marker = lower([group.role, group.renderLocation, group.type, option.lineType, option.type, option.priceType].filter(Boolean).join(' ')); return option.isAddon === true || option.addon === true || marker.includes('add-on') || marker.includes('addon') || marker.includes('finishing') || marker.includes('service'); }
async function authoritativePricing(request: Request, auth: PublicApiAuthContext, store: Store, body: Json) {
  const productSlug = slug(body.productSlug || body.productId || body.slug);
  const quantity = Math.max(1, integer(body.quantity || body.qty, 0));
  if (!productSlug || !quantity) fail(400, 'INVALID_PRICE_REQUEST', 'productSlug and a positive quantity are required.');
  const options = selectedOptions(body.selectedOptions);
  const effectiveAuth = scopedAuth(auth, store);
  const pricing = await calculateStorefrontPricing(request, effectiveAuth, { productSlug, selectedOptions: options, quantity, delivery: clean(body.delivery || body.turnaround), customSize: body.customSize ? object(body.customSize) : {} });
  const contract = await productContract(request, effectiveAuth, productSlug);
  const groups = array<Json>(contract.configurator.groups);
  const addOns = options.map((row) => {
    const group = groups.find((item) => clean(item.key) === clean(row.key) || slug(item.key) === slug(row.key));
    const option = array<Json>(group?.options || group?.values).find((item) => clean(item.value) === clean(row.value) || slug(item.slug || item.value || item.label) === slug(row.slug || row.value));
    if (!group || !option || !isAddOn(group, option)) return null;
    const grossMinor = addOnPrice(option);
    if (!grossMinor) return null;
    const taxSettings = object(option.taxSettings || option.metadataJson?.taxSettings || { taxClass: 'standard' });
    const vat = calculateVatLine({ name: option.label || row.label, taxSettings, vatRate: option.vatRate ?? option.taxRate, vatClass: option.vatClass || option.taxClass }, 1, grossMinor);
    return { lineType: 'add-on', key: row.key, value: row.value, label: clean(option.label || row.label || group.label), taxSettings, ...vat };
  }).filter(Boolean) as Json[];
  const addOnGross = addOns.reduce((sum, line) => sum + integer(line.grossMinor), 0);
  let taxLines: Json[];
  if (!addOns.length || addOnGross >= pricing.grossMinor) {
    taxLines = [{ lineType: 'base', label: pricing.product.name, grossMinor: pricing.grossMinor, netMinor: pricing.netMinor, vatMinor: pricing.vatMinor, vatRate: pricing.vatRate, vatClass: pricing.vatClass, vatReason: pricing.vatReason }];
  } else {
    const baseGross = pricing.grossMinor - addOnGross;
    const baseVat = calculateVatLine({ productName: pricing.product.name, productSlug, taxSettings: contract.tax?.settings, vatRate: contract.tax?.vatRate, resolverSnapshot: { product: contract.product, pricing } }, quantity, baseGross);
    taxLines = [{ lineType: 'base', label: pricing.product.name, taxSettings: contract.tax?.settings || null, ...baseVat }, ...addOns];
  }
  const netMinor = taxLines.reduce((sum, line) => sum + integer(line.netMinor), 0);
  const vatMinor = taxLines.reduce((sum, line) => sum + integer(line.vatMinor), 0);
  const grossMinor = taxLines.reduce((sum, line) => sum + integer(line.grossMinor), 0);
  const profiles = new Set(taxLines.map((line) => `${line.vatRate}:${line.vatClass}`));
  return { ...pricing, productSlug, selectedOptions: options, taxLines, netMinor, vatMinor, grossMinor, finalPriceMinor: grossMinor, formattedPrice: formatMinorPrice(grossMinor, pricing.currency), vatRate: profiles.size === 1 ? taxLines[0]?.vatRate ?? null : null, vatClass: profiles.size === 1 ? taxLines[0]?.vatClass : 'mixed', vatReason: profiles.size === 1 ? taxLines[0]?.vatReason : 'mixed-vat-lines' };
}
function publicPrice(price: Json) { return { currency: price.currency, quantity: price.quantity, netMinor: price.netMinor, vatMinor: price.vatMinor, grossMinor: price.grossMinor, formattedPrice: price.formattedPrice, vatRate: price.vatRate ?? null, vatClass: price.vatClass, vatReason: price.vatReason }; }
export async function calculateStorefrontPrice(auth: PublicApiAuthContext, request: Request, storeId: string, body: Json) {
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  return publicPrice(await authoritativePricing(request, auth, store, body));
}

function customer(value: unknown) {
  const data = object(value);
  const result = { name: clean(data.name), email: lower(data.email), phone: clean(data.phone), company: clean(data.company) };
  if (!result.name || !result.email.includes('@') || !result.phone) fail(400, 'CHECKOUT_CUSTOMER_INVALID', 'Customer name, email and phone are required.');
  return result;
}
function address(value: unknown) { const data = object(value); return { line1: clean(data.line1), line2: clean(data.line2), town: clean(data.town), county: clean(data.county), postcode: clean(data.postcode).toUpperCase(), country: clean(data.country) || 'United Kingdom' }; }
function safeUrl(value: unknown, fallback: string) { const candidate = clean(value) || fallback; try { const parsed = new URL(candidate); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); return parsed.toString(); } catch { fail(400, 'INVALID_RETURN_URL', 'successUrl and cancelUrl must be valid HTTP(S) URLs.'); } }
export async function createStorefrontCheckoutSession(auth: PublicApiAuthContext, request: Request, storeId: string, idempotencyKey: string, body: Json) {
  validateIdempotency(idempotencyKey);
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  const previous = await previousResponse(auth, store.tenantId, 'checkout-session', idempotencyKey);
  if (previous) return previous;
  const buyer = customer(body.customer);
  const fulfilmentMode = lower(body.fulfilmentMode) === 'delivery' ? 'delivery' : lower(body.fulfilmentMode) === 'collection' ? 'collection' : '';
  if (!fulfilmentMode) fail(400, 'FULFILMENT_MODE_INVALID', 'fulfilmentMode must be delivery or collection.');
  const deliveryAddress = body.deliveryAddress ? address(body.deliveryAddress) : null;
  const billingAddress = body.billingAddress ? address(body.billingAddress) : deliveryAddress;
  if (fulfilmentMode === 'delivery' && (!deliveryAddress?.line1 || !deliveryAddress?.town || !deliveryAddress?.postcode)) fail(400, 'DELIVERY_ADDRESS_REQUIRED', 'A complete delivery address is required.');
  const artwork = object(body.artwork);
  const artworkStatus = lower(artwork.status);
  if (!['ready', 'send-later', 'need-design'].includes(artworkStatus)) fail(400, 'ARTWORK_STATUS_INVALID', 'artwork.status must be ready, send-later or need-design.');
  const price = await authoritativePricing(request, auth, store, body);
  const base = price.taxLines.find((line: Json) => line.lineType === 'base') || price.taxLines[0];
  const addOns = price.taxLines.filter((line: Json) => line.lineType === 'add-on').map((line: Json) => ({ titleSnapshot: line.label, name: line.label, quantity: 1, totalPriceMinor: line.grossMinor, vatRate: line.vatRate, vatClass: line.vatClass, vatReason: line.vatReason, taxSettings: line.taxSettings || null, metadataJson: { lineType: 'add-on', selectedOptionKey: line.key, selectedOptionValue: line.value } }));
  const orderNumber = `WEB-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const scoped = scopedRequest(request, store);
  const order = await saveOrder(scoped, { orderNumber, customerName: buyer.name, customerEmail: buyer.email, customerPhone: buyer.phone, customerCompany: buyer.company, customer: buyer, fulfilmentMode, fulfillmentMode: fulfilmentMode, deliveryAddress, billingAddress, currency: price.currency, status: 'AWAITING_PAYMENT', paymentStatus: 'pending', paymentProvider: 'stripe', source: 'storefront-v1', storeId: store.storeId, storeName: store.storeName, items: [{ productId: price.product.id, productSlug: price.productSlug, productName: price.product.name, titleSnapshot: price.product.name, quantity: price.quantity, totalPriceMinor: base.grossMinor, vatRate: base.vatRate, vatClass: base.vatClass, vatReason: base.vatReason, taxSettings: base.taxSettings || null, selectedOptions: price.selectedOptions, addOns }], artworkUploadId: clean(artwork.uploadId), artwork: { status: artworkStatus, uploadId: clean(artwork.uploadId), notes: clean(artwork.notes) }, rawCheckout: { storeId: store.storeId, tenantId: store.tenantId, productSlug: price.productSlug, selectedOptions: price.selectedOptions, quantity: price.quantity, delivery: clean(body.delivery), customSize: body.customSize || null, fulfilmentMode, buyer, deliveryAddress, billingAddress, artwork, authoritativePrice: publicPrice(price) } });
  const ctx: TenantContext = { tenantId: store.tenantId, siteId: store.storeId };
  await upsertArtworkProductionTicket({ ctx, orderId: order.id, orderNumber, customerName: buyer.name, customerEmail: buyer.email, customerPhone: buyer.phone, productName: price.product.name, productSlug: price.productSlug, categorySlug: slug(price.product.categorySlug || price.product.categoryId), quantity: price.quantity, selectedDelivery: clean(body.delivery), fulfilmentMode, deliveryAddress, billingAddress, artworkStatus, artworkNotes: clean(artwork.notes), upload: null, priceMinor: price.grossMinor, paymentStatus: 'pending', paymentProvider: 'stripe', orderStatus: 'AWAITING_PAYMENT' }).catch(() => null);
  const origin = new URL(request.url).origin;
  const successUrl = safeUrl(body.successUrl, `${origin}/checkout/success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`);
  const cancelUrl = safeUrl(body.cancelUrl, `${origin}/checkout/cancel?orderId=${encodeURIComponent(order.id)}`);
  const stripe = await createStripeCheckoutSession(scoped, { orderId: order.id, customerEmail: buyer.email, successUrl, cancelUrl });
  const paymentUrl = clean(stripe.session?.url);
  if (!paymentUrl) fail(500, 'PAYMENT_SESSION_FAILED', 'Stripe did not return a payment URL.');
  await queueOrderPlacedEmails(scoped, { ...order, paymentStatus: 'pending', stripeCheckoutSessionId: stripe.session?.id || '', paymentUrl }).catch(() => null);
  const response = { checkoutSessionId: clean(stripe.session?.id), orderId: order.id, orderNumber, paymentUrl, ...(stripe.session?.expires_at ? { expiresAt: new Date(Number(stripe.session.expires_at) * 1000).toISOString() } : {}), price: publicPrice(price) };
  await saveResponse(auth, store.tenantId, 'checkout-session', idempotencyKey, response);
  return response;
}

export async function createStorefront(auth: PublicApiAuthContext, idempotencyKey: string, body: Json) {
  validateIdempotency(idempotencyKey);
  const tenantRow = await tenant(clean(body.tenantId));
  if (!tenantRow) fail(404, 'TENANT_NOT_FOUND', 'The requested tenant was not found.');
  if (!auth.serviceClient && auth.tenantId !== tenantRow.id) fail(403, 'TENANT_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested tenant.');
  const previous = await previousResponse(auth, tenantRow.id, 'store-create', idempotencyKey);
  if (previous) return previous;
  const storeName = clean(body.storeName);
  const storeSlug = slug(body.storeSlug);
  const themeId = clean(body.themeId || tenantRow.themeKey || 'base');
  if (!storeName || !storeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) fail(400, 'STORE_CREATE_INVALID', 'tenantId, storeName, storeSlug and themeId are required.');
  if (await getStoreBySlug(storeSlug)) fail(409, 'STORE_SLUG_CONFLICT', 'The requested store slug is already allocated.');
  const storeId = uid('store');
  const canonicalHost = `${storeSlug}.${rootDomain()}`;
  const createdAt = now();
  const platformDomain = { domain: canonicalHost, status: 'active', type: 'platform', primary: true, verifiedAt: createdAt };
  const store: Store = { storeId, tenantId: tenantRow.id, tenantSlug: tenantRow.slug, storeSlug, storeName, status: 'draft', themeId, branding: defaultBranding(storeName, object(body.branding)), content: defaultContent(object(body.content)), navigation: defaultNavigation(body.navigation), canonicalHost, previewUrl: frontendUrl() ? `${frontendUrl()}/preview?storeId=${encodeURIComponent(storeId)}` : `https://${canonicalHost}/?previewStoreId=${encodeURIComponent(storeId)}`, domains: [platformDomain], createdAt, updatedAt: createdAt };
  try {
    await (platformPrisma as any).$transaction(async (tx: any) => {
      await saveRecord(tx, { id: uid('slug'), tenantId: GLOBAL_STORE_TENANT, resource: SLUG_RESOURCE, slug: storeSlug, name: storeName, metadataJson: { storeId, tenantId: tenantRow.id, storeSlug, createdAt } }, true);
      await persistStore(store, tx, true);
      await saveDomain(tx, store, platformDomain, true);
    });
  } catch (cause) {
    if (/unique/i.test(String(cause))) fail(409, 'STORE_SLUG_CONFLICT', 'The requested store slug or domain is already allocated.');
    throw cause;
  }
  const response = { storeId, tenantId: tenantRow.id, storeSlug, status: 'draft', themeId, previewUrl: store.previewUrl, canonicalHost };
  await saveResponse(auth, tenantRow.id, 'store-create', idempotencyKey, response);
  return response;
}
export async function updateStorefront(auth: PublicApiAuthContext, storeId: string, body: Json, request: Request) {
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  const next = await persistStore({ ...store, themeId: body.themeId === undefined ? store.themeId : clean(body.themeId) || store.themeId, branding: body.branding === undefined ? store.branding : defaultBranding(store.storeName, { ...store.branding, ...object(body.branding) }), content: body.content === undefined ? store.content : defaultContent({ ...store.content, ...object(body.content), pages: { ...object(store.content.pages), ...object(body.content?.pages) } }), navigation: body.navigation === undefined ? store.navigation : defaultNavigation(body.navigation), updatedAt: now() });
  return getStorefrontBootstrap(auth, request, next.storeId);
}
export async function publishStorefront(auth: PublicApiAuthContext, storeId: string) {
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  const activeDomain = store.domains.find((item) => ['active', 'verified', 'published'].includes(lower(item.status)));
  const missing = [!store.storeName && 'store name', !store.storeSlug && 'store slug', !store.themeId && 'theme', !store.branding?.storeName && 'branding', !activeDomain && 'verified domain'].filter(Boolean);
  if (missing.length) fail(409, 'STORE_NOT_PUBLISHABLE', `Storefront cannot be published. Missing: ${missing.join(', ')}.`);
  const next = await persistStore({ ...store, status: 'published', canonicalHost: host(store.canonicalHost || activeDomain?.domain), updatedAt: now() });
  for (const item of next.domains.filter((domain) => ['active', 'verified', 'published'].includes(lower(domain.status)))) await saveDomain(platformPrisma, next, { ...item, status: 'published', publishedAt: now() });
  return { storeId: next.storeId, tenantId: next.tenantId, storeSlug: next.storeSlug, status: next.status, themeId: next.themeId, previewUrl: next.previewUrl, canonicalHost: next.canonicalHost };
}
export async function addStorefrontDomain(auth: PublicApiAuthContext, storeId: string, body: Json) {
  const store = await getStorefrontStore(storeId);
  if (!store) fail(404, 'STOREFRONT_NOT_FOUND', 'Storefront was not found.');
  assertAccess(auth, store);
  const domain = host(body.domain);
  if (!domain || !domain.includes('.') || domain.endsWith(`.${rootDomain()}`)) fail(400, 'DOMAIN_INVALID', 'A valid custom domain is required.');
  if (await domainRecord(domain)) fail(409, 'DOMAIN_CONFLICT', 'This domain is already bound to another storefront.');
  const verificationValue = `storefront-verify=${crypto.randomBytes(24).toString('hex')}`;
  const binding = { domain, status: 'pending', type: 'custom', primary: body.makePrimary === true, verificationType: 'TXT', verificationName: `_print-saas.${domain}`, verificationValue, createdAt: now() };
  await saveDomain(platformPrisma, store, binding, true);
  const domains = [...store.domains.filter((item) => host(item.domain) !== domain), binding].map((item) => body.makePrimary === true ? { ...item, primary: host(item.domain) === domain } : item);
  await persistStore({ ...store, domains, canonicalHost: body.makePrimary === true ? domain : store.canonicalHost, updatedAt: now() });
  return { domain, status: 'pending', verificationType: binding.verificationType, verificationName: binding.verificationName, verificationValue };
}
