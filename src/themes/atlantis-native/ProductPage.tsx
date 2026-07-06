import StorefrontChrome from './StorefrontChrome';
import ProductOrderPanel from './ProductOrderPanel';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';

function queryString(values: Record<string, string>, prefix: '?' | '&' = '?') {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (key && value && key !== 'quote') params.set(key, value); });
  const query = params.toString();
  return query ? `${prefix}${query}` : '';
}

function selectedOptions(product: ThemeProductCard, searchParams: Record<string, string>) {
  const output: Record<string, string> = {};
  for (const group of product.optionGroups || []) {
    const selected = searchParams[group.key] || group.values[0]?.slug || '';
    if (selected) output[group.key] = selected;
  }
  return output;
}

function quoteHref(product: ThemeProductCard, storeBase: string, category: string, slug: string, searchParams: Record<string, string>) {
  return `${storeBase}/quote/${category}/${slug}${queryString(selectedOptions(product, searchParams))}`;
}

export default function ProductPage({ tenantSlug, storeSlug, storeBase, navItems, slug, category, products = [], searchParams = {} }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; slug: string; category: string; products?: ThemeProductCard[]; searchParams?: Record<string, string> }) {
  const product = products.find((item) => item.slug === slug && item.category === category);

  if (!product) {
    return <StorefrontChrome currentPath={`/${category}/${slug}`} navItems={navItems} storeBase={storeBase}><section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Unavailable</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>Product not available</h1><p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>This product is not currently published for this store.</p></div></Shell></section></StorefrontChrome>;
  }

  const currentPath = `${storeBase}/${category}/${slug}`;
  const configured = selectedOptions(product, searchParams);
  const shareUrl = `${currentPath}${queryString(configured)}`;
  const quoteRef = searchParams.quote || '';
  const isQuote = product.buyingMode === 'quote';

  return <StorefrontChrome currentPath={`/${category}/${slug}`} navItems={navItems} storeBase={storeBase}>
    <section className="py-6"><Shell>{quoteRef ? <div className="mb-5 rounded-[24px] border bg-white p-5 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.primary }}>Quote request sent</div><div className="mt-2 text-sm font-bold" style={{ color: BRAND.ink }}>Your quote request has been sent to the store team. Reference: {quoteRef}</div></div> : null}<div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Product</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product.title}</h1>{product.text ? <p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>{product.text}</p> : null}</div></Shell></section>
    <section className="pb-10"><Shell><div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"><div className="rounded-[26px] border bg-white p-5 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>{product.image ? <img src={product.image} alt={product.title} className="h-[360px] w-full rounded-[18px] object-cover" /> : null}<div className="mt-5 text-[24px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>{product.title}</div><div className="mt-2 text-sm font-bold" style={{ color: BRAND.primary }}>{product.price}</div><div className="mt-5 rounded-[18px] border p-4 text-[12px]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Shareable configured URL: <span style={{ color: BRAND.ink }}>{shareUrl}</span></div></div>{isQuote ? <div className="rounded-[26px] border bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}><div className="text-[22px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Request quote</div><div className="mt-2 text-[13px]" style={{ color: BRAND.muted }}>This product is set as quote-led in the SaaS product setup.</div><a href={quoteHref(product, storeBase, category, slug, searchParams)} className="mt-5 block w-full rounded-full px-5 py-3 text-center text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Request quote</a></div> : <ProductOrderPanel tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} category={category} slug={slug} title={product.title} optionGroups={product.optionGroups || []} searchParams={searchParams} />}</div></Shell></section>
  </StorefrontChrome>;
}
