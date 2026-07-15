import StorefrontChrome from './StorefrontChrome';
import ProductOrderPanel from './ProductOrderPanel';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';
import { loadProductForNativePricing, formatMinorPrice } from '@/core/storefront/native-pricing.service';
import { resolveProductConfig, rowPriceMinor } from '@/core/storefront/product-config-engine';
import { calculateVatLine } from '@/core/tax/vat-rules';

function queryString(values: Record<string, string>, prefix: '?' | '&' = '?') {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (key && value && key !== 'quote') params.set(key, value); });
  const query = params.toString();
  return query ? `${prefix}${query}` : '';
}

function clean(value: unknown) { return String(value || '').trim(); }
function slugify(value: unknown) { return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function tenantRequest(tenantSlug: string) { return new Request(`https://internal.local/native-storefront?tenantId=${encodeURIComponent(tenantSlug)}`); }
function imageList(product: Record<string, any>) {
  const media = product.metadataJson?.media || product.media || {};
  const direct = [product.image, product.imageUrl, product.thumbnail, product.heroImage, product.metadataJson?.image, media.heroImageUrl].filter(Boolean).map(String);
  const gallery = Array.isArray(media.gallery) ? media.gallery.map(String) : [];
  return Array.from(new Set([...direct, ...gallery].filter(Boolean)));
}
function contentText(product: Record<string, any>) {
  const content = product.metadataJson?.content || product.content || {};
  return clean(content.shortDescription || product.description || product.subtitle || '');
}
function isQuoteProduct(product: Record<string, any>) {
  const mode = clean(product.buyingMode || product.orderMode || product.metadataJson?.buyingMode || product.metadataJson?.orderMode).toLowerCase();
  const type = clean(product.productType || product.type || product.metadataJson?.productType).toUpperCase();
  return ['quote', 'quote-only', 'request-quote', 'quote_led', 'quote-led'].includes(mode) || type === 'QUOTE_LED';
}
function groupOptions(group: Record<string, any> = {}) { return Array.isArray(group.options) ? group.options : Array.isArray(group.values) ? group.values : []; }
function optionSlug(option: Record<string, any> = {}) { return clean(option.slug || option.id || slugify(option.value || option.label || option.name)); }
function optionValue(option: Record<string, any> = {}) { return clean(option.value || option.label || option.name || option.slug || option.id); }
function selectedOptions(groups: Record<string, any>[] = [], searchParams: Record<string, string> = {}) {
  const output: Record<string, string> = {};
  for (const group of groups) {
    const key = clean(group.key || group.id || group.label || group.name);
    if (!key) continue;
    const options = groupOptions(group);
    const selected = searchParams[key] || searchParams[slugify(key)] || optionSlug(options.find((option: any) => option.default || option.recommended) || options[0] || {});
    if (selected) output[key] = selected;
  }
  return output;
}
function quoteHref(groups: Record<string, any>[], storeBase: string, category: string, slug: string, searchParams: Record<string, string>) {
  return `${storeBase}/quote/${category}/${slug}${queryString(selectedOptions(groups, searchParams))}`;
}
function initialPrice(product: Record<string, any>, resolvedConfig: Record<string, any>) {
  const matchedRow = resolvedConfig.matchedRow as Record<string, any> | null;
  const grossMinor = Number(rowPriceMinor(matchedRow) || resolvedConfig.priceMinor || 0);
  if (!matchedRow || !grossMinor) return null;
  const quantity = Math.max(1, Math.round(Number(resolvedConfig.selectedQuantity || matchedRow.quantity || 1)));
  const taxSettings = matchedRow.taxSettings || matchedRow.metadata?.taxSettings || product.taxSettings || product.metadataJson?.taxSettings || product.metadataJson?.pricing?.taxSettings;
  const vatRate = matchedRow.vatRate ?? matchedRow.taxRate ?? product.vatRate ?? product.taxRate ?? product.metadataJson?.vatRate ?? product.metadataJson?.taxRate;
  const taxLine = calculateVatLine({
    productId: product.id || product.slug || '',
    productSlug: product.slug || product.id || '',
    productName: product.name || product.title || product.slug || 'Storefront product',
    titleSnapshot: product.name || product.title || product.slug || 'Storefront product',
    sku: matchedRow.sku || matchedRow.oldSku || '',
    categoryName: product.categoryName || product.metadataJson?.categoryName || '',
    categorySlug: product.categorySlug || product.metadataJson?.categorySlug || '',
    totalPriceMinor: grossMinor,
    taxSettings,
    vatRate,
    resolverSnapshot: { product: { id: product.id, slug: product.slug, name: product.name || product.title, title: product.title || product.name, taxSettings, vatRate }, pricing: { source: 'native-product-page-initial-price', matchedRow } },
  }, quantity, grossMinor);
  const currency = clean(matchedRow.currency || product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP');
  return { currency, quantity, netMinor: taxLine.netMinor, vatMinor: taxLine.vatMinor, grossMinor: taxLine.grossMinor, formattedPrice: formatMinorPrice(taxLine.grossMinor, currency), vatRate: taxLine.vatRate, vatClass: taxLine.vatClass, vatReason: taxLine.vatReason };
}
async function loadBackendProductContract(tenantSlug: string, slug: string) {
  try {
    const product = await loadProductForNativePricing(tenantRequest(tenantSlug), tenantSlug, slug);
    const resolvedConfig = resolveProductConfig(product, {});
    const images = imageList(product);
    const title = clean(product.title || product.name);
    const categorySlug = clean(product.categorySlug || product.metadataJson?.categorySlug || '');
    if (!title || !categorySlug) return null;
    const price = initialPrice(product, resolvedConfig);
    return {
      product,
      title,
      description: contentText(product),
      images,
      image: images[0] || '',
      category: categorySlug,
      buyingMode: isQuoteProduct(product) ? 'quote' : 'cart',
      priceText: price?.formattedPrice || '',
      resolvedConfig,
      initialPrice: price,
    };
  } catch {
    return null;
  }
}

export default async function ProductPage({ tenantSlug, storeSlug, storeBase, navItems, slug, category, products: _products = [], searchParams = {} }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; slug: string; category: string; products?: ThemeProductCard[]; searchParams?: Record<string, string> }) {
  const product = await loadBackendProductContract(tenantSlug, slug);

  if (!product) {
    return <StorefrontChrome currentPath={`/${category}/${slug}`} navItems={navItems} storeBase={storeBase}><section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Unavailable</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>Product not available</h1><p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>This product is not currently published in the SaaS admin for this store.</p></div></Shell></section></StorefrontChrome>;
  }

  const productCategory = product.category;
  const currentPath = `${storeBase}/${productCategory}/${slug}`;
  const groups = Array.isArray(product.resolvedConfig.customerGroups) ? product.resolvedConfig.customerGroups : [];
  const configured = selectedOptions(groups, searchParams);
  const shareUrl = `${currentPath}${queryString(configured)}`;
  const quoteRef = searchParams.quote || '';
  const isQuote = product.buyingMode === 'quote';

  return <StorefrontChrome currentPath={`/${category}/${slug}`} navItems={navItems} storeBase={storeBase}>
    <section className="py-6"><Shell>{quoteRef ? <div className="mb-5 rounded-[24px] border bg-white p-5 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.primary }}>Quote request sent</div><div className="mt-2 text-sm font-bold" style={{ color: BRAND.ink }}>Your quote request has been sent to the store team. Reference: {quoteRef}</div></div> : null}<div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Product</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product.title}</h1>{product.description ? <p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>{product.description}</p> : null}</div></Shell></section>
    <section className="pb-10"><Shell><div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"><div className="rounded-[26px] border bg-white p-5 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>{product.image ? <img src={product.image} alt={product.title} className="h-[360px] w-full rounded-[18px] object-cover" /> : null}<div className="mt-5 text-[24px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>{product.title}</div>{product.priceText ? <div className="mt-2 text-sm font-bold" style={{ color: BRAND.primary }}>{product.priceText}</div> : null}<div className="mt-5 rounded-[18px] border p-4 text-[12px]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Shareable configured URL: <span style={{ color: BRAND.ink }}>{shareUrl}</span></div></div>{isQuote ? <div className="rounded-[26px] border bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}><div className="text-[22px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Request quote</div><div className="mt-2 text-[13px]" style={{ color: BRAND.muted }}>This product is set as quote-led in the SaaS product setup.</div><a href={quoteHref(groups, storeBase, productCategory, slug, searchParams)} className="mt-5 block w-full rounded-full px-5 py-3 text-center text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Request quote</a></div> : <ProductOrderPanel tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} category={productCategory} slug={slug} title={product.title} optionGroups={groups} quantityRows={product.resolvedConfig.quantityRows || []} deliveryRows={product.resolvedConfig.deliveryRows || []} initialSelections={product.resolvedConfig.selections || {}} initialQuantity={product.resolvedConfig.selectedQuantity || null} initialDelivery={product.resolvedConfig.selectedDelivery || null} initialPrice={product.initialPrice} searchParams={searchParams} />}</div></Shell></section>
  </StorefrontChrome>;
}
