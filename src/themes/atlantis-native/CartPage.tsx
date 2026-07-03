import StorefrontChrome from './StorefrontChrome';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';

function titleFromSlug(value: string) {
  return String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function selectedOptionRows(product: ThemeProductCard | undefined, searchParams: Record<string, string>) {
  if (!product?.optionGroups?.length) return [];
  return product.optionGroups.map((group) => {
    const selectedSlug = searchParams[group.key] || group.values[0]?.slug || '';
    const selected = group.values.find((value) => value.slug === selectedSlug);
    return selected ? { key: group.key, label: group.label, value: selected.label, slug: selected.slug } : null;
  }).filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
}

export default function CartPage({ storeBase, navItems, productSlug, categorySlug, products = [], searchParams = {} }: { storeBase: string; navItems: NavItem[]; productSlug?: string; categorySlug?: string; products?: ThemeProductCard[]; searchParams?: Record<string, string> }) {
  const product = products.find((item) => item.slug === productSlug && (!categorySlug || item.category === categorySlug));
  const title = product?.title || titleFromSlug(productSlug || '') || 'Your cart';
  const optionRows = selectedOptionRows(product, searchParams);

  return <StorefrontChrome currentPath="/cart" navItems={navItems} storeBase={storeBase}><section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Cart</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product ? `${title} added to cart` : 'Your cart'}</h1><p className="mt-3 max-w-[720px] text-sm leading-7" style={{ color: BRAND.muted }}>{product ? 'This product is set for online ordering. The selected configuration is carried by the URL and ready for the checkout connection step.' : 'Cart is ready for the next checkout connection step.'}</p>{product ? <div className="mt-6 rounded-[24px] border p-5" style={{ borderColor: BRAND.line }}><div className="text-[18px] font-black" style={{ color: BRAND.ink }}>{product.title}</div><div className="mt-1 text-sm font-bold" style={{ color: BRAND.primary }}>{product.price}</div><div className="mt-3 text-sm" style={{ color: BRAND.muted }}>Category: {product.category}</div>{optionRows.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{optionRows.map((row) => <div key={row.key} className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{row.label}</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{row.value}</div></div>)}</div> : <div className="mt-5 rounded-[18px] border p-4 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No configured options were passed to the cart.</div>}</div> : null}<div className="mt-7 flex flex-wrap gap-3"><a href={storeBase} className="rounded-full px-5 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Continue shopping</a>{product ? <a href={`${storeBase}/${product.category}/${product.slug}`} className="rounded-full border px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Edit options</a> : null}</div></div></Shell></section></StorefrontChrome>;
}
