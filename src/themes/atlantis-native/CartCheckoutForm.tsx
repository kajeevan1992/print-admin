'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BRAND } from './theme-helpers';

type SelectedOptionRow = { key: string; label: string; value: string; slug: string };
type Props = { tenantSlug: string; storeSlug: string; productSlug: string; categorySlug: string; productTitle: string; selectedOptions: SelectedOptionRow[]; defaultQuantity: number; selectedDelivery?: string };
type PriceState = { loading: boolean; ok: boolean; formattedPrice?: string; error?: string; snapshot?: Record<string, any> | null };
type PreflightState = { status?: string; errors?: string[]; warnings?: string[]; customerInstructions?: string; acceptedFileTypes?: string[]; upload?: Record<string, any> | null };

function list(items?: string[]) { return Array.isArray(items) ? items.filter(Boolean) : []; }

export default function CartCheckoutForm({ tenantSlug, storeSlug, productSlug, categorySlug, productTitle, selectedOptions, defaultQuantity, selectedDelivery = '' }: Props) {
  const [quantity, setQuantity] = useState(Math.max(1, Number(defaultQuantity || 1)));
  const [delivery, setDelivery] = useState(selectedDelivery || '');
  const [artworkStatus, setArtworkStatus] = useState('send-later');
  const [price, setPrice] = useState<PriceState>({ loading: true, ok: false, snapshot: null });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [preflight, setPreflight] = useState<PreflightState | null>(null);
  const selectedOptionsJson = useMemo(() => JSON.stringify(selectedOptions || []), [selectedOptions]);
  const priceSnapshotJson = useMemo(() => JSON.stringify(price.snapshot || null), [price.snapshot]);

  useEffect(() => {
    let alive = true;
    setPrice({ loading: true, ok: false, snapshot: null });
    fetch('/api/internal/storefront/price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, productSlug, categorySlug, selectedOptions, quantity, delivery }) })
      .then((response) => response.json())
      .then((payload) => { if (!alive) return; if (payload?.ok) setPrice({ loading: false, ok: true, formattedPrice: payload.data?.formattedPrice, snapshot: payload.data }); else setPrice({ loading: false, ok: false, error: payload?.error?.message || payload?.error || 'Price unavailable', snapshot: null }); })
      .catch((error) => { if (alive) setPrice({ loading: false, ok: false, error: error instanceof Error ? error.message : 'Price unavailable', snapshot: null }); });
    return () => { alive = false; };
  }, [tenantSlug, storeSlug, productSlug, categorySlug, selectedOptions, quantity, delivery]);

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError('');
    setPreflight(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    if (artworkStatus === 'ready') {
      const file = data.get('artworkFile');
      if (!(file instanceof File) || !file.size) {
        setCheckoutError('Please upload your artwork before payment, or choose upload later/design help.');
        setPreflight({ status: 'missing-file', errors: ['No artwork file was uploaded.'] });
        return;
      }
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/native-storefront/checkout', { method: 'POST', body: data, headers: { Accept: 'application/json', 'X-Checkout-Mode': 'json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setCheckoutError(payload?.error || 'Checkout could not continue.');
        setPreflight(payload?.preflight || null);
        return;
      }
      if (payload.paymentUrl) window.location.assign(payload.paymentUrl);
      else setCheckoutError('Stripe payment URL was not returned.');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={submitCheckout} action="/api/native-storefront/checkout" method="post" encType="multipart/form-data" className="mt-6 rounded-[24px] border p-5" style={{ borderColor: BRAND.line }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} />
    <input type="hidden" name="storeSlug" value={storeSlug} />
    <input type="hidden" name="productSlug" value={productSlug} />
    <input type="hidden" name="categorySlug" value={categorySlug} />
    <input type="hidden" name="productTitle" value={productTitle} />
    <input type="hidden" name="selectedOptions" value={selectedOptionsJson} />
    <input type="hidden" name="quantity" value={quantity} />
    <input type="hidden" name="delivery" value={delivery} />
    <input type="hidden" name="priceSnapshot" value={priceSnapshotJson} />

    <div className="text-[18px] font-black" style={{ color: BRAND.ink }}>Checkout details</div>
    <div className="mt-3 rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.muted }}>Backend basket total</div>
      <div className="mt-1 text-[26px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>{price.loading ? 'Checking price…' : price.ok ? price.formattedPrice : 'Price unavailable'}</div>
      {!price.loading && !price.ok ? <div className="mt-2 text-[12px]" style={{ color: BRAND.muted }}>{price.error}</div> : null}
    </div>

    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <input required name="customerName" placeholder="Name" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
      <input required name="customerEmail" type="email" placeholder="Email" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
      <input value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} type="number" min="1" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
      {delivery ? <input value={delivery} onChange={(event) => setDelivery(event.target.value)} placeholder="Delivery / turnaround" className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} /> : null}
    </div>

    <div className="mt-5 rounded-[20px] border p-4" style={{ borderColor: BRAND.line }}>
      <div className="text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.ink }}>Artwork</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{[['ready', 'Upload now'], ['send-later', 'Send later'], ['need-design', 'Need design help']].map(([value, label]) => <label key={value} className="cursor-pointer rounded-[16px] border p-3 text-[12px] font-black" style={{ borderColor: artworkStatus === value ? BRAND.primary : BRAND.line, color: artworkStatus === value ? BRAND.primary : BRAND.ink, backgroundColor: artworkStatus === value ? 'rgba(24,167,208,0.08)' : 'white' }}><input className="mr-2" type="radio" name="artworkStatus" value={value} checked={artworkStatus === value} onChange={() => { setArtworkStatus(value); setCheckoutError(''); setPreflight(null); }} />{label}</label>)}</div>
      {artworkStatus === 'ready' ? <div className="mt-4"><label className="block text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>Upload artwork file</label><input required name="artworkFile" type="file" accept=".pdf,.ai,.eps,.psd,.jpg,.jpeg,.png,.tif,.tiff" className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} /><p className="mt-2 text-[11px]" style={{ color: BRAND.muted }}>We will preflight this file before Stripe payment starts. Blocking issues must be fixed or switched to design help/upload later.</p></div> : null}
      <textarea name="artworkNotes" placeholder={artworkStatus === 'need-design' ? 'Tell us what design help you need' : 'Artwork notes or instructions'} className="mt-4 min-h-[90px] w-full rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: BRAND.line }} />
    </div>

    {checkoutError ? <div className="mt-5 rounded-[18px] border p-4 text-[12px]" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }}>
      <div className="font-black">{checkoutError}</div>
      {list(preflight?.errors).length ? <div className="mt-3"><div className="font-black">Issues to fix:</div><ul className="mt-2 list-disc space-y-1 pl-5">{list(preflight?.errors).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      {list(preflight?.warnings).length ? <div className="mt-3"><div className="font-black">Warnings:</div><ul className="mt-2 list-disc space-y-1 pl-5">{list(preflight?.warnings).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { setArtworkStatus('need-design'); setCheckoutError(''); setPreflight(null); }} className="rounded-full px-4 py-2 text-[11px] font-black text-white" style={{ backgroundColor: BRAND.primary }}>Switch to design help</button><button type="button" onClick={() => { setArtworkStatus('send-later'); setCheckoutError(''); setPreflight(null); }} className="rounded-full border px-4 py-2 text-[11px] font-black" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Upload later instead</button></div>
    </div> : null}

    <button disabled={!price.ok || submitting} className="mt-5 w-full rounded-full px-5 py-3 text-[12px] font-black text-white disabled:opacity-50" style={{ backgroundColor: BRAND.primary }}>{submitting ? 'Checking artwork…' : 'Continue to checkout'}</button>
    <p className="mt-4 text-[12px]" style={{ color: BRAND.muted }}>Price, tax and artwork are handled by existing backend services before payment.</p>
  </form>;
}
