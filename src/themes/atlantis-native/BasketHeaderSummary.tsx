'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';

type BasketSummary = {
  lineCount: number;
  itemCount: number;
  formattedTotal: string;
};

const EMPTY: BasketSummary = { lineCount: 0, itemCount: 0, formattedTotal: '£0.00' };

export default function BasketHeaderSummary({ tenantSlug, storeSlug, storeBase, studio = false }: { tenantSlug: string; storeSlug: string; storeBase: string; studio?: boolean }) {
  const [summary, setSummary] = useState<BasketSummary>(EMPTY);

  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/internal/storefront/basket?tenantSlug=${encodeURIComponent(tenantSlug)}&storeSlug=${encodeURIComponent(storeSlug)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => { if (alive && payload?.ok) setSummary(payload.summary || EMPTY); })
      .catch(() => undefined);
    const onChange = (event: Event) => {
      const next = (event as CustomEvent).detail;
      if (next && typeof next === 'object') setSummary({ lineCount: Number(next.lineCount || 0), itemCount: Number(next.itemCount || 0), formattedTotal: String(next.formattedTotal || '£0.00') });
      else load();
    };
    load();
    window.addEventListener('storefront:basket-changed', onChange);
    return () => { alive = false; window.removeEventListener('storefront:basket-changed', onChange); };
  }, [tenantSlug, storeSlug]);

  return <a href={`${storeBase}/cart`} aria-label={`Basket with ${summary.lineCount} line${summary.lineCount === 1 ? '' : 's'}`} className="relative flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[12px] font-semibold no-underline" style={{ borderColor: studio ? 'rgba(255,255,255,0.18)' : 'var(--storefront-line, #E3E8F0)', color: studio ? 'white' : 'var(--storefront-muted, #667487)', backgroundColor: studio ? 'rgba(255,255,255,0.08)' : 'white' }}>
    <ShoppingCart className="h-4 w-4" />
    <span className="font-semibold" style={{ color: studio ? 'white' : 'var(--storefront-muted, #667487)' }}>{summary.formattedTotal}</span>
    {summary.lineCount > 0 ? <span className="rounded-full px-1.5 py-0.5 text-[10px] text-white" style={{ background: 'linear-gradient(135deg, var(--storefront-primary, #18A7D0), var(--storefront-accent, #7B3FE4))' }}>{summary.lineCount}</span> : null}
  </a>;
}
