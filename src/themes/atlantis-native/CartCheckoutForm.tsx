'use client';

import { useEffect, useState } from 'react';
import { BRAND } from './theme-helpers';

type SelectedOptionRow = { key: string; label: string; value: string; slug: string };

type Props = {
  tenantSlug: string;
  storeSlug: string;
  productSlug: string;
  categorySlug: string;
  productTitle: string;
  selectedOptions: SelectedOptionRow[];
  defaultQuantity: number;
};

type PriceState = { loading: boolean; ok: boolean; formattedPrice?: string; error?: string };

export default function CartCheckoutForm({ tenantSlug, storeSlug, productSlug, categorySlug, productTitle, selectedOptions, defaultQuantity }: Props) {
  const [quantity, setQuantity] = useState(Math.max(1, Number(defaultQuantity || 1)));
  const [price, setPrice] = useState<PriceState>({ loading: true, ok: false });

  useEffect(() => {
    let alive = true;
    setPrice({ loading: true, ok: false });
    fetch('/api/native-storefront/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug, storeSlug, productSlug, categorySlug, selectedOptions, quantity }),
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
  }, [tenantSlug, storeSlug, productSlug, categorySlug, selectedOptions, quantity]);

  return <form action="/api/native-storefront/checkout" method="post" className="mt-6 rounded-[24px] border p-5" style={{ borderColor: BRAND.line }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} />
    <input type="hidden" name="storeSlug" value={storeSlug} />
    <input type="hidden" name="productSlug" value={productSlug} />
    <input type="hidden" name="categorySlug" value={categorySlug} />
    <input type="hidden" name="productTitle" value={productTitle} />
    <input type="hidden" name="selectedOptions" value={JSON.stringify(selectedOptions)} />
    <input type="hidden" name="quantity" value={quantity} />

    <div className="text-[18px] font-black" style={{ color: BRAND.ink }}>Checkout details</div>
    <div className="mt-3 rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.muted }}>Basket total</div>
      <div className="mt-1 text-[26px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>{price.loading ? 'Checking price…' : price.ok ? price.formattedPrice : 'Price unavailable'}</div>
      {!price.loading && !price.ok ? <div className="mt-2 text-[12px]" style={{ color: BRAND.muted }}>{price.error}</div> : null}
    </div>

    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <input required name="customerName" placeholder="Name" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
      <input required name="customerEmail" type="email" placeholder="Email" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
      <input value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} type="number" min="1" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
      <select name="artworkStatus" defaultValue="send-later" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }}>
        <option value="ready">Artwork ready</option>
        <option value="send-later">Send artwork later</option>
        <option value="need-design">Need design help</option>
      </select>
    </div>

    <button disabled={!price.ok} className="mt-5 w-full rounded-full px-5 py-3 text-[12px] font-black text-white disabled:opacity-50" style={{ backgroundColor: BRAND.primary }}>Continue to secure payment</button>
    <p className="mt-4 text-[12px]" style={{ color: BRAND.muted }}>Price and tax are controlled by the backend admin setup for this product.</p>
  </form>;
}
