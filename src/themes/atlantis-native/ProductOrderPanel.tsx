'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ThemeProductOptionGroup } from './catalog-adapter';
import { BRAND } from './theme-helpers';

type PriceState = {
  loading: boolean;
  ok: boolean;
  formattedPrice?: string;
  error?: string;
};

type Props = {
  tenantSlug: string;
  storeSlug: string;
  storeBase: string;
  category: string;
  slug: string;
  title: string;
  optionGroups?: ThemeProductOptionGroup[];
  searchParams?: Record<string, string>;
};

function optionValue(option: { label: string; slug: string; value?: string }) {
  return option.value || option.label || option.slug;
}

function initialSelected(groups: ThemeProductOptionGroup[] = [], searchParams: Record<string, string> = {}) {
  const next: Record<string, string> = {};
  groups.forEach((group) => {
    const selected = searchParams[group.key] || group.values[0]?.slug || '';
    if (selected) next[group.key] = selected;
  });
  return next;
}

function priceRows(groups: ThemeProductOptionGroup[] = [], selected: Record<string, string>) {
  return groups.map((group) => {
    const selectedSlug = selected[group.key] || group.values[0]?.slug || '';
    const option = group.values.find((item) => item.slug === selectedSlug) || group.values[0];
    return option ? { key: group.key, label: group.label, value: optionValue(option), slug: option.slug } : null;
  }).filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
}

function basketHref(storeBase: string, category: string, slug: string, rows: { key: string; slug: string }[], quantity: number) {
  const params = new URLSearchParams();
  params.set('product', slug);
  params.set('category', category);
  params.set('quantity', String(quantity));
  rows.forEach((row) => { if (row.key && row.slug) params.set(row.key, row.slug); });
  return `${storeBase}/cart?${params.toString()}`;
}

export default function ProductOrderPanel({ tenantSlug, storeSlug, storeBase, category, slug, title, optionGroups = [], searchParams = {} }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>(() => initialSelected(optionGroups, searchParams));
  const [quantity, setQuantity] = useState(() => Math.max(1, Number(searchParams.quantity || searchParams.qty || 1)));
  const [price, setPrice] = useState<PriceState>({ loading: true, ok: false });
  const rows = useMemo(() => priceRows(optionGroups, selected), [optionGroups, selected]);
  const addToBasketHref = useMemo(() => basketHref(storeBase, category, slug, rows, quantity), [storeBase, category, slug, rows, quantity]);

  useEffect(() => {
    let alive = true;
    setPrice({ loading: true, ok: false });
    fetch('/api/native-storefront/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug, storeSlug, productSlug: slug, categorySlug: category, selectedOptions: rows, quantity }),
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!alive) return;
        if (payload?.ok) setPrice({ loading: false, ok: true, formattedPrice: payload.data?.formattedPrice });
        else setPrice({ loading: false, ok: false, error: payload?.error || 'Price unavailable' });
      })
      .catch((error) => {
        if (alive) setPrice({ loading: false, ok: false, error: error instanceof Error ? error.message : 'Price unavailable' });
      });
    return () => { alive = false; };
  }, [tenantSlug, storeSlug, slug, category, rows, quantity]);

  return <div className="rounded-[26px] border bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>
    <div className="text-[22px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Order setup</div>
    <div className="mt-2 text-[13px] font-bold" style={{ color: BRAND.muted }}>Choose your options and quantity. The live price comes from the SaaS backend.</div>

    {optionGroups.length ? <div className="mt-5 space-y-4">{optionGroups.map((group) => <div key={group.key}>
      <div className="text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.ink }}>{group.label}</div>
      <div className="mt-2 flex flex-wrap gap-2">{group.values.map((value) => {
        const active = selected[group.key] === value.slug;
        return <button key={value.slug} type="button" onClick={() => setSelected((current) => ({ ...current, [group.key]: value.slug }))} className="rounded-full border px-4 py-2 text-[12px] font-black" style={{ borderColor: active ? BRAND.primary : BRAND.line, color: active ? BRAND.primary : BRAND.ink, backgroundColor: active ? 'rgba(24,167,208,0.08)' : 'white' }}>{value.label}</button>;
      })}</div>
    </div>)}</div> : <div className="mt-5 rounded-[18px] border p-4 text-[12px]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No storefront options are configured for this SaaS product yet.</div>}

    <label className="mt-5 block text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.ink }}>Quantity</label>
    <input value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} min="1" type="number" className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />

    <div className="mt-5 rounded-[20px] border p-5" style={{ borderColor: BRAND.line }}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.muted }}>Live price</div>
      <div className="mt-1 text-[28px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>{price.loading ? 'Checking price…' : price.ok ? price.formattedPrice : 'Price unavailable'}</div>
      {!price.loading && !price.ok ? <div className="mt-2 text-[12px]" style={{ color: BRAND.muted }}>{price.error}</div> : null}
    </div>

    {price.ok ? <a href={addToBasketHref} className="mt-5 block w-full rounded-full px-5 py-3 text-center text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Add to basket</a> : <button disabled className="mt-5 block w-full rounded-full px-5 py-3 text-center text-[12px] font-black text-white opacity-50" style={{ backgroundColor: BRAND.primary }}>Add to basket</button>}
    <div className="mt-4 text-[12px]" style={{ color: BRAND.muted }}>{title} pricing is controlled by admin product setup, pricing matrix and tax settings.</div>
  </div>;
}
