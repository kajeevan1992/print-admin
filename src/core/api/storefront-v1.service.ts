import { listInternalCatalogArray, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { saveOrder } from '@/core/orders/orders.service';
import { publicApiRequestFor, type PublicApiAuthContext } from '@/core/api/public-api-auth';
import { calculateNativeStorefrontPrice, formatMinorPrice, loadProductForNativePricing, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';
import { resolveProductConfig, rowPriceMinor } from '@/core/storefront/product-config-engine';
import { calculateVatLine } from '@/core/tax/vat-rules';
import type { TenantContext } from '@/core/tenant/types';

const STORE_RESOURCE = 'storefront-stores' as any;
const DOMAIN_RESOURCE = 'storefront-domains' as any;

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function nowIso() { return new Date().toISOString(); }
function arr(value: unknown): any[] { return Array.isArray(value) ? value : []; }
function host(value: unknown) { return clean(value).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''); }
function id(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function minor(value: unknown) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0; }
function asObject(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function scopedRequest(request: Request, auth: PublicApiAuthContext) { return publicApiRequestFor(request, auth.ctx); }
function baseUrl(request: Request) { const url = new URL(request.url); return `${url.protocol}//${url.host}`; }

export type StorefrontStoreRecord = {
  storeId: string;
  tenantId: string;
  slug: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  theme: string;
  branding: Record<string, any>;
  content: Record<string, any>;
  navigation: any[];
  domains: string[];
  defaultSubdomain?: string;
  previewUrl: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function contentFrom(product: Record<string, any>) {
  const content = asObject(product.metadataJson?.content || product.content);
  return {
    shortDescription: clean(content.shortDescription || product.description || product.subtitle),
    longDescription: clean(content.longDescription || product.longDescription),
    specifications: arr(content.specifications),
    designGuidelines: arr(content.designGuidelines),
    faqs: arr(content.faqs),
    orderingProcess: arr(content.orderingProcess),
    materialDetails: arr(content.materialDetails),
  };
}
function imageList(product: Record<string, any>) {
  const media = asObject(product.metadataJson?.media || product.media);
  return Array.from(new Set([product.image, product.imageUrl, product.thumbnail, product.heroImage, product.metadataJson?.image, media.heroImageUrl, ...arr(media.gallery)].filter(Boolean).map(String)));
}
function buyingMode(product: Record<string, any>) {
  const mode = clean(product.buyingMode || product.orderMode || product.metadataJson?.buyingMode || product.metadataJson?.orderMode).toLowerCase();
  const type = clean(product.productType || product.type || product.metadataJson?.productType).toUpperCase();
  return ['quote', 'quote-only', 'request-quote', 'quote_led', 'quote-led'].includes(mode) || type === 'QUOTE_LED' ? 'quote' : 'cart';
}
function initialPrice(product: Record<string, any>, resolvedConfig: Record<string, any>) {
  const matchedRow = resolvedConfig.matchedRow as Record<string, any> | null;
  const grossMinor = minor(rowPriceMinor(matchedRow) || resolvedConfig.priceMinor);
  if (!matchedRow || !grossMinor) return null;
  const quantity = Math.max(1, Math.round(Number(resolvedConfig.selectedQuantity || matchedRow.quantity || 1)));
  const taxLine = calculateVatLine({
    productId: product.id || product.slug || '',
    productSlug: product.slug || product.id || '',
    productName: product.name || product.title || product.slug || 'Storefront product',
    titleSnapshot: product.name || product.title || product.slug || 'Storefront product',
    sku: matchedRow.sku || matchedRow.oldSku || '',
    categoryName: product.categoryName || product.metadataJson?.categoryName || '',
    categorySlug: product.categorySlug || product.metadataJson?.categorySlug || '',
    totalPriceMinor: grossMinor,
    taxSettings: matchedRow.taxSettings || matchedRow.metadata?.taxSettings || product.taxSettings || product.metadataJson?.taxSettings || product.metadataJson?.pricing?.taxSettings,
    vatRate: matchedRow.vatRate ?? matchedRow.taxRate ?? product.vatRate ?? product.taxRate ?? product.metadataJson?.vatRate ?? product.metadataJson?.taxRate,
    resolverSnapshot: { source: 'storefront-v1-product-contract', product: { id: product.id, slug: product.slug } },
  }, quantity, grossMinor);
  const currency = clean(matchedRow.currency || product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP');
  return { currency, quantity, netMinor: taxLine.netMinor, vatMinor: taxLine.vatMinor, grossMinor: taxLine.grossMinor, finalPriceMinor: taxLine.grossMinor, formattedPrice: formatMinorPrice(taxLine.grossMinor, currency), vatRate: taxLine.vatRate, vatClass: taxLine.vatClass, vatReason: taxLine.vatReason };
}
export async function productContract(request: Request, auth: PublicApiAuthContext, productSlug: string) {
  const product = await loadProductForNativePricing(scopedRequest(request, auth), auth.ctx.tenantId, productSlug);
  const resolvedConfig = resolveProductConfig(product, {});
  return {
    product: {
      id: product.id,
      slug: product.slug || productSlug,
      title: product.title || product.name || productSlug,
      name: product.name || product.title || productSlug,
      description: product.description || product.subtitle || '',
      categoryId: product.categoryId || '',
      categoryName: product.categoryName || product.metadataJson?.categoryName || '',
      categorySlug: product.categorySlug || product.metadataJson?.categorySlug || '',
      productType: product.productType || product.metadataJson?.productType || '',
      buyingMode: buyingMode(product),
      currency: product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP',
      images: imageList(product),
    },
    content: contentFrom(product),
    configurator: {
      groups: resolvedConfig.groups,
      customerGroups: resolvedConfig.customerGroups,
      hiddenGroups: resolvedConfig.hiddenGroups,
      quantityGroup: resolvedConfig.quantityGroup,
      quantityRows: resolvedConfig.quantityRows,
      deliveryGroup: resolvedConfig.deliveryGroup,
      deliveryRows: resolvedConfig.deliveryRows,
      initialSelections: resolvedConfig.selections,
      selectedQuantity: resolvedConfig.selectedQuantity,
      selectedDelivery: resolvedConfig.selectedDelivery,
      messages: resolvedConfig.messages,
      capabilities: resolvedConfig.capabilities,
      pricingMatrixRowCount: resolvedConfig.pricingMatrixRowCount,
    },
    artwork: product.artwork || product.metadataJson?.artwork || product.metadataJson?.artworkRules || {},
    tax: { settings: product.taxSettings || product.metadataJson?.taxSettings || product.metadataJson?.pricing?.taxSettings || null, vatRate: product.vatRate ?? product.taxRate ?? product.metadataJson?.vatRate ?? product.metadataJson?.taxRate ?? null },
    initialPrice: initialPrice(product, resolvedConfig),
  };
}
export async function calculateStorefrontPricing(request: Request, auth: PublicApiAuthContext, body: Record<string, any>) {
  const productSlug = slug(body.productSlug || body.productId || body.slug);
  if (!productSlug) throw new Error('productSlug is required.');
  const selectedOptions = arr(body.selectedOptions || body.options).map((row) => asObject(row)) as NativeSelectedOptionRow[];
  const price = await calculateNativeStorefrontPrice({ request: scopedRequest(request, auth), tenantSlug: auth.ctx.tenantId, productSlug, selectedOptions, quantity: body.quantity || body.qty || 1, delivery: clean(body.turnaround || body.delivery || body.selectedDelivery) || null, customSize: asObject(body.customSize || body.size) });
  return {
    product: { id: price.product.id, slug: price.product.slug || productSlug, name: price.product.name || price.product.title || productSlug },
    currency: price.currency,
    quantity: price.quantity,
    netMinor: price.netPriceMinor,
    vatMinor: price.vatMinor,
    grossMinor: price.finalPriceMinor,
    finalPriceMinor: price.finalPriceMinor,
    formattedPrice: formatMinorPrice(price.finalPriceMinor, price.currency),
    vatRate: price.vatRate,
    vatClass: price.vatClass,
    vatReason: price.vatReason,
    taxLine: price.taxLine,
    selectedOptions: price.selectedOptions,
    selections: price.resolvedConfig.selections,
    selectedDelivery: price.resolvedConfig.selectedDelivery,
    sku: price.matchedRow?.sku || price.matchedRow?.oldSku || '',
    matchedRow: price.matchedRow,
    pricingSource: price.pricingSource,
  };
}
function normaliseStore(raw: any, ctx: TenantContext): StorefrontStoreRecord {
  const data = asObject(raw?.metadataJson || raw);
  const storeId = clean(data.storeId || data.id || raw?.slug || raw?.id);
  const storeSlug = slug(data.slug || data.storeSlug || storeId);
  return {
    storeId,
    tenantId: clean(data.tenantId || ctx.tenantId),
    slug: storeSlug,
    name: clean(data.name || data.title || storeSlug),
    status: (clean(data.status || 'draft').toLowerCase() as any) || 'draft',
    theme: clean(data.theme || data.selectedTheme || 'atlantis-native'),
    branding: asObject(data.branding),
    content: asObject(data.content),
    navigation: arr(data.navigation || data.nav),
    domains: arr(data.domains).map(host).filter(Boolean),
    defaultSubdomain: host(data.defaultSubdomain || data.subdomain),
    previewUrl: clean(data.previewUrl),
    publishedAt: clean(data.publishedAt) || undefined,
    createdAt: clean(data.createdAt) || nowIso(),
    updatedAt: clean(data.updatedAt) || nowIso(),
  };
}
async function readStores(ctx: TenantContext) { return (await listInternalCatalogArray(ctx, STORE_RESOURCE, { limit: 200 })).map((item) => normaliseStore(item, ctx)).filter((item) => item.storeId); }
export async function findStore(ctx: TenantContext, storeId: string) { const stores = await readStores(ctx); const key = clean(storeId); return stores.find((store) => [store.storeId, store.slug].includes(key)) || null; }
export async function resolveStoreByHost(ctx: TenantContext, lookupHost: string) {
  const wanted = host(lookupHost);
  const stores = await readStores(ctx);
  return stores.find((store) => store.domains.includes(wanted) || host(store.defaultSubdomain) === wanted || host(store.previewUrl) === wanted || store.slug === wanted.split('.')[0]) || null;
}
async function saveStore(ctx: TenantContext, store: StorefrontStoreRecord) {
  return upsertInternalCatalogRecord(ctx, STORE_RESOURCE, { id: store.storeId, slug: store.storeId, name: store.name, title: store.name, description: `Storefront store ${store.name}`, metadataJson: store });
}
export async function bootstrapStore(ctx: TenantContext, storeId: string) {
  const store = await findStore(ctx, storeId);
  if (!store) throw new Error('Store was not found or this credential is not allowed to access it.');
  const products = await listInternalCatalogArray(ctx, 'products' as any, { limit: 200 });
  const categories = await listInternalCatalogArray(ctx, 'categories' as any, { limit: 200 });
  return { store, tenant: { tenantId: ctx.tenantId, siteId: ctx.siteId || store.storeId }, theme: store.theme, branding: store.branding, content: store.content, navigation: store.navigation, products, categories };
}
export async function createStore(ctx: TenantContext, body: Record<string, any>, request: Request) {
  const storeSlug = slug(body.slug || body.name || body.storeName || 'store');
  const storeId = clean(body.storeId || body.id) || id('store');
  const baseDomain = host(process.env.STOREFRONT_BASE_DOMAIN || process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN || '');
  const defaultSubdomain = host(body.defaultSubdomain || body.subdomain || (baseDomain ? `${storeSlug}.${baseDomain}` : ''));
  const previewUrl = clean(body.previewUrl) || `${baseUrl(request)}/theme/atlantis?storeId=${encodeURIComponent(storeId)}`;
  const store: StorefrontStoreRecord = {
    storeId,
    tenantId: ctx.tenantId,
    slug: storeSlug,
    name: clean(body.name || body.title || storeSlug),
    status: 'draft',
    theme: clean(body.theme || body.selectedTheme || 'atlantis-native'),
    branding: asObject(body.branding),
    content: asObject(body.content),
    navigation: arr(body.navigation || body.nav),
    domains: arr(body.domains).map(host).filter(Boolean),
    defaultSubdomain,
    previewUrl,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (defaultSubdomain && !store.domains.includes(defaultSubdomain)) store.domains.unshift(defaultSubdomain);
  await saveStore(ctx, store);
  await Promise.all(store.domains.map((domain) => upsertInternalCatalogRecord(ctx, DOMAIN_RESOURCE, { id: `${storeId}-${domain}`, slug: domain, name: domain, title: domain, description: `Domain for ${store.name}`, metadataJson: { domain, storeId, tenantId: ctx.tenantId, status: 'draft', createdAt: store.createdAt, updatedAt: store.updatedAt } }).catch(() => null)));
  return store;
}
export async function updateStore(ctx: TenantContext, storeId: string, body: Record<string, any>) {
  const current = await findStore(ctx, storeId);
  if (!current) throw new Error('Store was not found.');
  const next = { ...current, ...body, storeId: current.storeId, tenantId: ctx.tenantId, slug: slug(body.slug || current.slug), domains: arr(body.domains || current.domains).map(host).filter(Boolean), updatedAt: nowIso() } as StorefrontStoreRecord;
  await saveStore(ctx, next);
  return next;
}
export async function publishStore(ctx: TenantContext, storeId: string) {
  const current = await findStore(ctx, storeId);
  if (!current) throw new Error('Store was not found.');
  const next = { ...current, status: 'published' as const, publishedAt: nowIso(), updatedAt: nowIso() };
  await saveStore(ctx, next);
  return next;
}
export async function addStoreDomain(ctx: TenantContext, storeId: string, body: Record<string, any>) {
  const current = await findStore(ctx, storeId);
  if (!current) throw new Error('Store was not found.');
  const domain = host(body.domain || body.host || body.name);
  if (!domain) throw new Error('domain is required.');
  const domains = Array.from(new Set([...(current.domains || []), domain]));
  const next = { ...current, domains, updatedAt: nowIso() };
  await saveStore(ctx, next);
  await upsertInternalCatalogRecord(ctx, DOMAIN_RESOURCE, { id: `${storeId}-${domain}`, slug: domain, name: domain, title: domain, description: `Domain for ${current.name}`, metadataJson: { domain, storeId, tenantId: ctx.tenantId, status: current.status, createdAt: current.createdAt, updatedAt: next.updatedAt } });
  return { store: next, domain: { domain, storeId, tenantId: ctx.tenantId, status: current.status } };
}
export async function createCheckoutSession(request: Request, auth: PublicApiAuthContext, body: Record<string, any>) {
  const pricing = await calculateStorefrontPricing(request, auth, body);
  const customer = asObject(body.customer);
  const customerEmail = clean(body.customerEmail || customer.email);
  if (!customerEmail) throw new Error('customer.email is required.');
  const productSlug = pricing.product.slug;
  const orderNumber = clean(body.idempotencyKey || body.checkoutId) ? `WEB-${slug(auth.store?.storeId || auth.ctx.siteId || 'store')}-${slug(body.idempotencyKey || body.checkoutId).slice(0, 32)}` : `WEB-${Date.now()}`;
  const item = { productId: productSlug, productSlug, productName: pricing.product.name, titleSnapshot: pricing.product.name, quantity: pricing.quantity, unitPriceMinor: Math.max(1, Math.round(pricing.finalPriceMinor / Math.max(1, pricing.quantity))), totalPriceMinor: pricing.finalPriceMinor, selectedOptions: pricing.selectedOptions, delivery: body.delivery || body.turnaround || null, customSize: body.customSize || null, artwork: body.artwork || null, sku: pricing.sku, vatRate: pricing.vatRate, vatClass: pricing.vatClass, vatReason: pricing.vatReason, vatMinor: pricing.vatMinor, netTotalMinor: pricing.netMinor, grossTotalMinor: pricing.grossMinor };
  const order = await saveOrder(scopedRequest(request, auth), { orderNumber, customerName: clean(body.customerName || customer.name || 'Customer'), customerEmail, customerPhone: clean(body.customerPhone || customer.phone), customerCompany: clean(customer.company || body.customerCompany), currency: pricing.currency, status: 'AWAITING_PAYMENT', paymentStatus: 'pending', paymentProvider: 'stripe', source: 'storefront-v1-api', storeId: auth.store?.storeId || auth.ctx.siteId || '', notes: 'Created from tenant-safe Storefront API v1 checkout/session.', internalNotes: ['Storefront API v1 calculated price, VAT and checkout session server-side.'], items: [item], rawCheckout: { body, pricing, tenantId: auth.ctx.tenantId, storeId: auth.store?.storeId || auth.ctx.siteId || '' } });
  const successUrl = clean(body.successUrl) || `${baseUrl(request)}/payment-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = clean(body.cancelUrl) || `${baseUrl(request)}/payment-cancel?orderId=${encodeURIComponent(order.id)}`;
  const stripe = await createStripeCheckoutSession(scopedRequest(request, auth), { orderId: order.id, customerEmail, successUrl, cancelUrl });
  return { order: { id: order.id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus, totalMinor: order.totalMinor, currency: order.currency }, checkout: { provider: 'stripe', sessionId: stripe.session?.id || '', url: stripe.session?.url || '', successUrl, cancelUrl }, pricing };
}
