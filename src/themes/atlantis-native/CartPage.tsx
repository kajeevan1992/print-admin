import StorefrontChrome from './StorefrontChrome';
import CartCheckoutForm from './CartCheckoutForm';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';
import { loadProductForNativePricing } from '@/core/storefront/native-pricing.service';
import { resolveProductConfig } from '@/core/storefront/product-config-engine';

function titleFromSlug(value: string) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function clean(value: unknown) { return String(value || '').trim(); }
function slugify(value: unknown) { return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function tenantRequest(tenantSlug: string) { return new Request(`https://internal.local/native-cart?tenantId=${encodeURIComponent(tenantSlug)}`); }
function optionRows(group: Record<string, any> = {}) { return Array.isArray(group.options) ? group.options : Array.isArray(group.values) ? group.values : []; }
function optionLabel(option: Record<string, any> = {}) { return clean(option.label || option.name || option.title || option.value || option.slug || option.id); }
function optionValue(option: Record<string, any> = {}) { return clean(option.value || option.label || option.name || option.slug || option.id); }
function optionSlug(option: Record<string, any> = {}) { return clean(option.slug || option.id || slugify(optionValue(option))); }
function same(left: unknown, right: unknown) { return slugify(left) === slugify(right); }
function normalise(value: unknown) { return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' '); }
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

function selectedOptionRowsFromFallback(product: ThemeProductCard | undefined, searchParams: Record<string, string>) {
  if (!product?.optionGroups?.length) return [];
  return product.optionGroups
    .map((group) => {
      const selectedSlug = searchParams[group.key] || group.values[0]?.slug || '';
      const selected = group.values.find((value) => value.slug === selectedSlug) || group.values[0];
      return selected ? { key: group.key, label: group.label, value: selected.value || selected.label, slug: selected.slug } : null;
    })
    .filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
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

function quantityFromOptionRows(rows: { key: string; label: string; value: string; slug: string }[], searchParams: Record<string, string>) {
  const explicit = Number(searchParams.quantity || searchParams.qty || '');
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const row = rows.find((item) => ['quantity', 'qty', 'print run', 'print-run', 'run size'].some((term) => normalise(`${item.key} ${item.label}`).includes(term)));
  if (!row) return 1;
  const direct = Number(row.value || row.slug || '');
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  const match = String(row.value || row.slug || '').match(/\d+/);
  return match ? Math.max(1, Math.round(Number(match[0]))) : 1;
}

function deliveryFromRows(deliveryRows: Record<string, any>[] = [], searchParams: Record<string, string>) {
  const requested = clean(searchParams.delivery || searchParams.turnaround || '');
  const selected = requested ? deliveryRows.find((row) => same(row.value || row.id || row.label, requested)) : null;
  const fallback = selected || deliveryRows.find((row) => row.selected || row.default || row.recommended || row.available !== false) || deliveryRows[0];
  return fallback ? clean(fallback.value || fallback.id || fallback.label) : '';
}

async function backendCartProduct(tenantSlug: string, productSlug?: string, fallback?: ThemeProductCard | null) {
  if (!tenantSlug || !productSlug) return null;
  try {
    const product = await loadProductForNativePricing(tenantRequest(tenantSlug), tenantSlug, productSlug);
    const resolvedConfig = resolveProductConfig(product, {});
    return {
      title: clean(product.title || product.name || fallback?.title || titleFromSlug(productSlug)),
      category: clean(product.categorySlug || product.metadataJson?.categorySlug || fallback?.category || ''),
      slug: clean(product.slug || productSlug),
      price: fallback?.price || '',
      groups: Array.isArray(resolvedConfig.customerGroups) ? resolvedConfig.customerGroups : [],
      quantityRows: Array.isArray(resolvedConfig.quantityRows) ? resolvedConfig.quantityRows : [],
      deliveryRows: Array.isArray(resolvedConfig.deliveryRows) ? resolvedConfig.deliveryRows : [],
    };
  } catch {
    return null;
  }
}

export default async function CartPage({ tenantSlug = '', storeSlug = '', storeBase, navItems, productSlug, categorySlug, products = [], searchParams = {} }: { tenantSlug?: string; storeSlug?: string; storeBase: string; navItems: NavItem[]; productSlug?: string; categorySlug?: string; products?: ThemeProductCard[]; searchParams?: Record<string, string> }) {
  const fallbackProduct = products.find((item) => item.slug === productSlug && (!categorySlug || item.category === categorySlug));
  const backendProduct = await backendCartProduct(tenantSlug, productSlug, fallbackProduct || null);
  const product = backendProduct || (fallbackProduct ? { title: fallbackProduct.title, category: fallbackProduct.category, slug: fallbackProduct.slug, price: fallbackProduct.price, groups: [], quantityRows: [], deliveryRows: [] } : null);
  const title = product?.title || titleFromSlug(productSlug || '') || 'Your basket';
  const optionRows = backendProduct ? selectedOptionRowsFromBackend(backendProduct.groups, searchParams) : selectedOptionRowsFromFallback(fallbackProduct, searchParams);
  const defaultQuantity = backendProduct ? quantityFromRows(backendProduct.quantityRows, searchParams) : quantityFromOptionRows(optionRows, searchParams);
  const selectedDelivery = backendProduct ? deliveryFromRows(backendProduct.deliveryRows, searchParams) : clean(searchParams.delivery || searchParams.turnaround || '');
  const configuredProductHref = product ? `${storeBase}/${product.category || categorySlug || 'products'}/${product.slug}${optionQuery(optionRows, defaultQuantity, selectedDelivery)}` : storeBase;

  return <StorefrontChrome currentPath="/cart" navItems={navItems} storeBase={storeBase}>
    <section className="py-10">
      <Shell>
        <div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}>
          <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Basket</div>
          <h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product ? `${title} added to basket` : 'Your basket'}</h1>
          <p className="mt-3 max-w-[720px] text-sm leading-7" style={{ color: BRAND.muted }}>{product ? 'Review your backend-resolved product, options and price before checkout.' : 'Your basket is empty.'}</p>

          {product ? <div className="mt-6 rounded-[24px] border p-5" style={{ borderColor: BRAND.line }}>
            <div className="text-[18px] font-black" style={{ color: BRAND.ink }}>{product.title}</div>
            {product.price ? <div className="mt-1 text-sm font-bold" style={{ color: BRAND.primary }}>{product.price}</div> : null}
            <div className="mt-3 text-sm" style={{ color: BRAND.muted }}>Category: {product.category || categorySlug || 'Product'}</div>
            {optionRows.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{optionRows.map((row) => <div key={row.key} className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{row.label}</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{row.value}</div></div>)}</div> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>Quantity</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{defaultQuantity}</div></div>
              {selectedDelivery ? <div className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>Delivery / turnaround</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{selectedDelivery}</div></div> : null}
            </div>
          </div> : null}

          {product ? <CartCheckoutForm tenantSlug={tenantSlug} storeSlug={storeSlug} productSlug={product.slug} categorySlug={product.category || categorySlug || ''} productTitle={product.title} selectedOptions={optionRows} defaultQuantity={defaultQuantity} selectedDelivery={selectedDelivery} /> : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <a href={storeBase} className="rounded-full px-5 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Continue shopping</a>
            {product ? <a href={configuredProductHref} className="rounded-full border px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Edit options</a> : null}
          </div>
        </div>
      </Shell>
    </section>
  </StorefrontChrome>;
}
