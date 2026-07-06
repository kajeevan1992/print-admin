import StorefrontChrome from './StorefrontChrome';
import CartCheckoutForm from './CartCheckoutForm';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';

function titleFromSlug(value: string) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalise(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function selectedOptionRows(product: ThemeProductCard | undefined, searchParams: Record<string, string>) {
  if (!product?.optionGroups?.length) return [];
  return product.optionGroups
    .map((group) => {
      const selectedSlug = searchParams[group.key] || group.values[0]?.slug || '';
      const selected = group.values.find((value) => value.slug === selectedSlug);
      return selected ? { key: group.key, label: group.label, value: selected.value || selected.label, slug: selected.slug } : null;
    })
    .filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
}

function optionQuery(rows: { key: string; slug: string }[], quantity: number) {
  const params = new URLSearchParams();
  params.set('quantity', String(quantity));
  rows.forEach((row) => { if (row.key && row.slug) params.set(row.key, row.slug); });
  const query = params.toString();
  return query ? `?${query}` : '';
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

export default function CartPage({ tenantSlug = '', storeSlug = '', storeBase, navItems, productSlug, categorySlug, products = [], searchParams = {} }: { tenantSlug?: string; storeSlug?: string; storeBase: string; navItems: NavItem[]; productSlug?: string; categorySlug?: string; products?: ThemeProductCard[]; searchParams?: Record<string, string> }) {
  const product = products.find((item) => item.slug === productSlug && (!categorySlug || item.category === categorySlug));
  const title = product?.title || titleFromSlug(productSlug || '') || 'Your basket';
  const optionRows = selectedOptionRows(product, searchParams);
  const defaultQuantity = quantityFromOptionRows(optionRows, searchParams);
  const configuredProductHref = product ? `${storeBase}/${product.category}/${product.slug}${optionQuery(optionRows, defaultQuantity)}` : storeBase;

  return <StorefrontChrome currentPath="/cart" navItems={navItems} storeBase={storeBase}>
    <section className="py-10">
      <Shell>
        <div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}>
          <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Basket</div>
          <h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product ? `${title} added to basket` : 'Your basket'}</h1>
          <p className="mt-3 max-w-[720px] text-sm leading-7" style={{ color: BRAND.muted }}>{product ? 'Review your product, options and backend price before checkout.' : 'Your basket is empty.'}</p>

          {product ? <div className="mt-6 rounded-[24px] border p-5" style={{ borderColor: BRAND.line }}>
            <div className="text-[18px] font-black" style={{ color: BRAND.ink }}>{product.title}</div>
            <div className="mt-1 text-sm font-bold" style={{ color: BRAND.primary }}>{product.price}</div>
            <div className="mt-3 text-sm" style={{ color: BRAND.muted }}>Category: {product.category}</div>
            {optionRows.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{optionRows.map((row) => <div key={row.key} className="rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{row.label}</div><div className="mt-1 text-sm font-black" style={{ color: BRAND.ink }}>{row.value}</div></div>)}</div> : null}
          </div> : null}

          {product ? <CartCheckoutForm tenantSlug={tenantSlug} storeSlug={storeSlug} productSlug={product.slug} categorySlug={product.category} productTitle={product.title} selectedOptions={optionRows} defaultQuantity={defaultQuantity} /> : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <a href={storeBase} className="rounded-full px-5 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Continue shopping</a>
            {product ? <a href={configuredProductHref} className="rounded-full border px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Edit options</a> : null}
          </div>
        </div>
      </Shell>
    </section>
  </StorefrontChrome>;
}
