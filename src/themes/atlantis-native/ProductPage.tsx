import StorefrontChrome from './StorefrontChrome';
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

function optionQuery(searchParams: Record<string, string>, key: string, value: string) {
  return queryString({ ...searchParams, [key]: value });
}

function selectedOptions(product: ThemeProductCard, searchParams: Record<string, string>) {
  const output: Record<string, string> = {};
  for (const group of product.optionGroups || []) {
    const selected = searchParams[group.key] || group.values[0]?.slug || '';
    if (selected) output[group.key] = selected;
  }
  return output;
}

function productAction(product: ThemeProductCard, storeBase: string, category: string, slug: string, searchParams: Record<string, string>) {
  const isQuote = product.buyingMode === 'quote';
  const options = selectedOptions(product, searchParams);
  return {
    label: isQuote ? 'Request quote' : 'Add to cart',
    href: isQuote ? `${storeBase}/quote/${category}/${slug}${queryString(options)}` : `${storeBase}/cart?product=${encodeURIComponent(slug)}&category=${encodeURIComponent(category)}${queryString(options, '&')}`,
    note: isQuote ? 'This product is set as quote-led in the SaaS product setup.' : 'This product is set for online ordering. Product options and live pricing will be handled by the SaaS cart/checkout flow.',
  };
}

export default function ProductPage({ storeBase, navItems, slug, category, products = [], searchParams = {} }: { storeBase: string; navItems: NavItem[]; slug: string; category: string; products?: ThemeProductCard[]; searchParams?: Record<string, string> }) {
  const product = products.find((item) => item.slug === slug && item.category === category);

  if (!product) {
    return <StorefrontChrome currentPath={`/${category}/${slug}`} navItems={navItems} storeBase={storeBase}><section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Unavailable</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>Product not available</h1><p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>This product is not currently published for this store.</p></div></Shell></section></StorefrontChrome>;
  }

  const action = productAction(product, storeBase, category, slug, searchParams);
  const currentPath = `${storeBase}/${category}/${slug}`;
  const configured = selectedOptions(product, searchParams);
  const shareUrl = `${currentPath}${queryString(configured)}`;
  const quoteRef = searchParams.quote || '';

  return <StorefrontChrome currentPath={`/${category}/${slug}`} navItems={navItems} storeBase={storeBase}><section className="py-6"><Shell>{quoteRef ? <div className="mb-5 rounded-[24px] border bg-white p-5 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.primary }}>Quote request sent</div><div className="mt-2 text-sm font-bold" style={{ color: BRAND.ink }}>Your quote request has been sent to the store team. Reference: {quoteRef}</div></div> : null}<div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Product</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product.title}</h1>{product.text ? <p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>{product.text}</p> : null}</div></Shell></section><section className="pb-10"><Shell><div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"><div className="rounded-[26px] border bg-white p-5 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>{product.image ? <img src={product.image} alt={product.title} className="h-[360px] w-full rounded-[18px] object-cover" /> : null}<div className="mt-5 text-[24px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>{product.title}</div></div><div className="rounded-[26px] border bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}><div className="text-[22px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Order setup</div><div className="mt-2 text-[13px] font-bold" style={{ color: BRAND.primary }}>{product.price}</div><div className="mt-4 rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[12px] font-black" style={{ color: BRAND.ink }}>SaaS product mode: {product.buyingMode === 'quote' ? 'Request quote' : 'Online order'}</div><div className="mt-2 text-[12px]" style={{ color: BRAND.muted }}>{action.note}</div></div>{product.optionGroups?.length ? <div className="mt-5 space-y-4">{product.optionGroups.map((group) => <div key={group.key}><div className="text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.ink }}>{group.label}</div><div className="mt-2 flex flex-wrap gap-2">{group.values.map((value) => { const active = configured[group.key] === value.slug; return <a key={value.slug} href={`${currentPath}${optionQuery(searchParams, group.key, value.slug)}`} className="rounded-full border px-4 py-2 text-[12px] font-black no-underline" style={{ borderColor: active ? BRAND.primary : BRAND.line, color: active ? BRAND.primary : BRAND.ink, backgroundColor: active ? 'rgba(24,167,208,0.08)' : 'white' }}>{value.label}</a>; })}</div></div>)}</div> : <div className="mt-5 rounded-[18px] border p-4 text-[12px]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No storefront options are configured for this SaaS product yet.</div>}<div className="mt-5 rounded-[18px] border p-4 text-[12px]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Shareable configured URL: <span style={{ color: BRAND.ink }}>{shareUrl}</span></div><a href={action.href} className="mt-5 block w-full rounded-full px-5 py-3 text-center text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>{action.label}</a></div></div></Shell></section></StorefrontChrome>;
}
