import StorefrontChrome from './StorefrontChrome';
import CartCheckoutForm from './CartCheckoutForm';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';
import { loadProductForNativePricing } from '@/core/storefront/native-pricing.service';
import { resolveProductConfig } from '@/core/storefront/product-config-engine';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeRouteViews } from '@/v0-themes/contracts';
import { buildV0ThemePageContext, themeProductToV0 } from '@/theme-runtime/v0-view-props';

function clean(value: unknown) { return String(value || '').trim(); }
function slugify(value: unknown) { return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function tenantRequest(tenantSlug: string) { return new Request(`https://internal.local/native-cart?tenantId=${encodeURIComponent(tenantSlug)}`); }
function optionRows(group: Record<string, any> = {}) { return Array.isArray(group.options) ? group.options : Array.isArray(group.values) ? group.values : []; }
function optionLabel(option: Record<string, any> = {}) { return clean(option.label || option.name || option.title || option.value || option.slug || option.id); }
function optionValue(option: Record<string, any> = {}) { return clean(option.value || option.label || option.name || option.slug || option.id); }
function optionSlug(option: Record<string, any> = {}) { return clean(option.slug || option.id || slugify(optionValue(option))); }
function same(left: unknown, right: unknown) { return slugify(left) === slugify(right); }
function groupKey(group: Record<string, any> = {}) { return clean(group.key || group.id || group.label || group.name); }
function groupLabel(group: Record<string, any> = {}) { return clean(group.label || group.name || group.key || 'Option'); }

function selectedOptionRowsFromBackend(groups: Record<string, any>[] = [], searchParams: Record<string, string>) {
  return groups.map((group) => {
    const key = groupKey(group);
    const rows = optionRows(group).filter((option: any) => option && option.visible !== false && option.disabled !== true);
    if (!key || !rows.length) return null;
    const requested = searchParams[key] || searchParams[slugify(key)] || '';
    const selected = requested ? rows.find((option: any) => same(optionSlug(option), requested) || same(optionValue(option), requested) || same(optionLabel(option), requested)) : null;
    const fallback = selected || rows.find((option: any) => option.default || option.recommended) || rows[0];
    return fallback ? { key, label: groupLabel(group), value: optionValue(fallback), slug: optionSlug(fallback) } : null;
  }).filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
}

function optionQuery(rows: { key: string; slug: string }[], quantity: number, delivery?: string) {
  const params = new URLSearchParams();
  params.set('quantity', String(quantity));
  if (delivery) params.set('delivery', delivery);
  rows.forEach((row) => { if (row.key && row.slug) params.set(row.key, row.slug); });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function quantityFromRows(quantityRows: Record<string, any>[] = [], searchParams: Record<string, string>) {
  const explicit = Number(searchParams.quantity || searchParams.qty || '');
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const row = quantityRows.find((item) => item.default || item.recommended || item.available !== false) || quantityRows[0];
  const value = Number(row?.quantity || row?.qty || row?.value || row?.label || '');
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
}

function deliveryFromRows(deliveryRows: Record<string, any>[] = [], searchParams: Record<string, string>) {
  const requested = clean(searchParams.delivery || searchParams.turnaround || '');
  const selected = requested ? deliveryRows.find((row) => same(row.value || row.id || row.label, requested)) : null;
  const fallback = selected || deliveryRows.find((row) => row.selected || row.default || row.recommended || row.available !== false) || deliveryRows[0];
  return fallback ? clean(fallback.value || fallback.id || fallback.label) : '';
}

async function backendCartProduct(tenantSlug: string, productSlug?: string) {
  if (!tenantSlug || !productSlug) return null;
  try {
    const product = await loadProductForNativePricing(tenantRequest(tenantSlug), tenantSlug, productSlug);
    const resolvedConfig = resolveProductConfig(product, {});
    const title = clean(product.title || product.name);
    const slug = clean(product.slug || productSlug);
    const category = clean(product.categorySlug || product.metadataJson?.categorySlug || '');
    if (!title || !slug || !category) return null;
    return { title, category, slug, groups: Array.isArray(resolvedConfig.customerGroups) ? resolvedConfig.customerGroups : [], quantityRows: Array.isArray(resolvedConfig.quantityRows) ? resolvedConfig.quantityRows : [], deliveryRows: Array.isArray(resolvedConfig.deliveryRows) ? resolvedConfig.deliveryRows : [] };
  } catch { return null; }
}

export default async function CartPage({ tenantSlug = '', storeSlug = '', storeBase, navItems, productSlug, categorySlug: _categorySlug, products = [], searchParams = {}, settings, routeViews }: { tenantSlug?: string; storeSlug?: string; storeBase: string; navItems: NavItem[]; productSlug?: string; categorySlug?: string; products?: ThemeProductCard[]; searchParams?: Record<string, string>; settings?: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews }) {
  const product = await backendCartProduct(tenantSlug, productSlug);
  const selectedRows = product ? selectedOptionRowsFromBackend(product.groups, searchParams) : [];
  const defaultQuantity = product ? quantityFromRows(product.quantityRows, searchParams) : 1;
  const selectedDelivery = product ? deliveryFromRows(product.deliveryRows, searchParams) : '';
  const configuredProductHref = product ? `${storeBase}/${product.category}/${product.slug}${optionQuery(selectedRows, defaultQuantity, selectedDelivery)}` : '';
  const publishedProduct = product ? products.find((item) => item.slug === product.slug) : undefined;
  const checkout = product ? <CartCheckoutForm tenantSlug={tenantSlug} storeSlug={storeSlug} productSlug={product.slug} categorySlug={product.category} productTitle={product.title} selectedOptions={selectedRows} defaultQuantity={defaultQuantity} selectedDelivery={selectedDelivery} /> : undefined;

  if (routeViews?.CartPage && settings) {
    const View = routeViews.CartPage;
    const safeProduct = publishedProduct ? themeProductToV0(publishedProduct, storeBase) : product ? { slug: product.slug, category: product.category, title: product.title, description: '', image: '', price: '', href: `${storeBase}/${product.category}/${product.slug}` } : undefined;
    return <View {...buildV0ThemePageContext({ storeBase, currentPath: '/cart', navItems, settings })} product={safeProduct} selectedOptions={selectedRows.map(({ key, label, value }) => ({ key, label, value }))} quantity={defaultQuantity} delivery={selectedDelivery} configuredProductHref={configuredProductHref} slots={{ checkout }} />;
  }

  return <StorefrontChrome currentPath="/cart" navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Basket</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product ? `${product.title} added to basket` : 'Your basket'}</h1><p className="mt-3 max-w-[720px] text-sm leading-7" style={{ color: BRAND.muted }}>{product ? 'Review your SaaS-admin resolved product, options and price before checkout.' : 'Your basket is empty or the product is not currently published in the SaaS admin.'}</p>{product ? <div className="mt-6 rounded-[24px] border p-5" style={{ borderColor: BRAND.line }}><div className="text-[18px] font-black" style={{ color: BRAND.ink }}>{product.title}</div><div className="mt-3 text-sm" style={{ color: BRAND.muted }}>Category: {product.category}</div>{selectedRows.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{selectedRows.map((row) => <div key={row.key} className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{row.label}</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{row.value}</div></div>)}</div> : null}<div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>Quantity</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{defaultQuantity}</div></div>{selectedDelivery ? <div className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>Delivery / turnaround</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{selectedDelivery}</div></div> : null}</div></div> : null}{checkout}<div className="mt-7 flex flex-wrap gap-3"><a href={storeBase} className="rounded-full px-5 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Continue shopping</a>{configuredProductHref ? <a href={configuredProductHref} className="rounded-full border px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Edit options</a> : null}</div></div></Shell></section></StorefrontChrome>;
}
