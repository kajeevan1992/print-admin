'use client';

import { useMemo, useState } from 'react';
import { Edit3, FileText, Trash2 } from 'lucide-react';
import CartCheckoutForm from './CartCheckoutForm';
import type { StorefrontBasket, StorefrontBasketArtwork } from '@/core/storefront/persistent-basket.service';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

type BasketWithLinks = StorefrontBasket & { lines: Array<StorefrontBasket['lines'][number] & { editHref: string }> };
type AccountDefaults = { customerName: string; customerEmail: string; customerPhone: string; customerCompany: string; address?: { recipientName: string; company: string; line1: string; line2: string; town: string; county: string; postcode: string; country: string; phone: string } | null };

function artworkLabel(status: string) { if (status === 'ready') return 'Upload artwork at checkout'; if (status === 'need-design') return 'Design help required'; return 'Artwork will be supplied later'; }

export default function PersistentBasketView({ tenantSlug, storeSlug, storeBase, initialBasket, appearance, brand, accountDefaults }: { tenantSlug: string; storeSlug: string; storeBase: string; initialBasket: BasketWithLinks; appearance?: unknown; brand?: Partial<StorefrontBrandSettings>; accountDefaults?: AccountDefaults }) {
  const [basket, setBasket] = useState(initialBasket);
  const [busyLine, setBusyLine] = useState('');
  const [error, setError] = useState('');
  const widget = protectedWidgetTheme(appearance, brand);
  const empty = basket.lines.length === 0;
  const summary = useMemo(() => ({ lineCount: basket.lineCount, itemCount: basket.itemCount, formattedTotal: basket.formattedTotal }), [basket]);

  function applyBasket(payload: any) {
    if (!payload?.basket) return;
    const next = { ...payload.basket, lines: payload.basket.lines.map((line: any) => ({ ...line, editHref: `${storeBase}/${line.categorySlug}/${line.productSlug}?${new URLSearchParams({ basketLine: line.id, quantity: String(line.quantity), ...(line.delivery ? { delivery: line.delivery } : {}), ...Object.fromEntries((line.selectedOptions || []).map((option: any) => [option.key, option.slug])) }).toString()}` })) } as BasketWithLinks;
    setBasket(next);
    window.dispatchEvent(new CustomEvent('storefront:basket-changed', { detail: payload.summary || { ...summary, lineCount: next.lineCount, itemCount: next.itemCount, formattedTotal: next.formattedTotal } }));
  }

  async function removeLine(lineId: string) {
    setBusyLine(lineId); setError('');
    try { const response = await fetch('/api/internal/storefront/basket', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, lineId }) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Basket item could not be removed.'); applyBasket(payload); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Basket item could not be removed.'); }
    finally { setBusyLine(''); }
  }

  async function saveArtwork(lineId: string, status: StorefrontBasketArtwork['status'], notes: string) {
    setBusyLine(lineId); setError('');
    try { const response = await fetch('/api/internal/storefront/basket', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, lineId, action: 'artwork', artwork: { status, notes } }) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Artwork instructions could not be saved.'); applyBasket(payload); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Artwork instructions could not be saved.'); }
    finally { setBusyLine(''); }
  }

  function updateLocalArtwork(lineId: string, patch: Partial<StorefrontBasketArtwork>) { setBasket((current) => ({ ...current, lines: current.lines.map((line) => line.id === lineId ? { ...line, artwork: { ...line.artwork, ...patch } } : line) })); }

  return <div data-protected-widget="persistent-basket" style={widget.rootStyle}>
    {error ? <div className="mb-5 rounded-[18px] border border-amber-300 bg-amber-50 p-4 text-[12px] font-bold text-amber-900">{error}</div> : null}
    {empty ? <div className={widget.classes.surface} style={widget.styles.surface}><div className="text-[26px] font-black tracking-[-0.04em]" style={widget.styles.text}>Your basket is empty</div><p className="mt-3 text-[13px]" style={widget.styles.muted}>Choose a product, configure the print run and add it to your saved basket.</p><a href={storeBase} className={`${widget.classes.top} inline-flex text-white no-underline ${widget.classes.button}`} style={widget.styles.primaryButton}>Continue shopping</a></div> : <>
      <div className="space-y-4">{basket.lines.map((line) => <article key={line.id} className={widget.classes.surface} style={widget.styles.surface}><div className="grid gap-5 md:grid-cols-[120px_1fr_auto]"><div className="overflow-hidden rounded-[16px] border" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>{line.image ? <img src={line.image} alt={line.productName} className="h-28 w-full object-cover" /> : <div className="grid h-28 place-items-center bg-slate-50"><FileText className="h-7 w-7 text-slate-300" /></div>}</div><div><div className="text-[20px] font-black tracking-[-0.035em]" style={widget.styles.text}>{line.productName}</div><div className="mt-1 text-[12px] font-bold" style={widget.styles.muted}>Quantity {line.quantity}{line.delivery ? ` · ${line.delivery}` : ''}{line.sku ? ` · SKU ${line.sku}` : ''}</div>{line.selectedOptions.length ? <div className="mt-4 flex flex-wrap gap-2">{line.selectedOptions.map((option) => <span key={`${line.id}-${option.key}`} className="rounded-full border px-3 py-1 text-[11px] font-bold" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', color: 'var(--storefront-muted, #667487)' }}>{option.label}: {option.value}</span>)}</div> : null}<div className="mt-5 grid gap-3 sm:grid-cols-[190px_1fr_auto]"><select value={line.artwork.status} onChange={(event) => updateLocalArtwork(line.id, { status: event.target.value as StorefrontBasketArtwork['status'] })} className={widget.classes.field} style={widget.styles.field}><option value="ready">Upload artwork at checkout</option><option value="send-later">Send artwork later</option><option value="need-design">Need design help</option></select><input value={line.artwork.notes || ''} onChange={(event) => updateLocalArtwork(line.id, { notes: event.target.value })} placeholder="Artwork notes for this item" className={widget.classes.field} style={widget.styles.field} /><button type="button" disabled={busyLine === line.id} onClick={() => saveArtwork(line.id, line.artwork.status, line.artwork.notes || '')} className={`border ${widget.classes.button}`} style={widget.styles.secondaryButton}>{busyLine === line.id ? 'Saving…' : 'Save artwork'}</button></div><div className="mt-2 text-[11px]" style={widget.styles.muted}>{artworkLabel(line.artwork.status)}</div></div><div className="flex min-w-[150px] flex-col items-end justify-between gap-4"><div className="text-right"><div className="text-[22px] font-black" style={widget.styles.text}>{line.formattedTotal}</div><div className="mt-1 text-[11px]" style={widget.styles.muted}>Includes {new Intl.NumberFormat('en-GB', { style: 'currency', currency: line.currency }).format(line.vatMinor / 100)} VAT</div></div><div className="flex gap-2"><a href={line.editHref} className={`inline-flex items-center gap-2 border no-underline ${widget.classes.button}`} style={widget.styles.secondaryButton}><Edit3 className="h-4 w-4" />Edit</a><button type="button" disabled={busyLine === line.id} onClick={() => removeLine(line.id)} className={`inline-flex items-center gap-2 border ${widget.classes.button}`} style={{ ...widget.styles.secondaryButton, color: '#b91c1c' }}><Trash2 className="h-4 w-4" />Remove</button></div></div></div></article>)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className={widget.classes.surface} style={widget.styles.surface}><div className="text-[18px] font-black" style={widget.styles.text}>Basket summary</div><div className="mt-5 space-y-3 text-[13px]"><div className="flex justify-between" style={widget.styles.muted}><span>{basket.lineCount} product line{basket.lineCount === 1 ? '' : 's'}</span><span>{basket.itemCount} printed item{basket.itemCount === 1 ? '' : 's'}</span></div><div className="flex justify-between" style={widget.styles.muted}><span>Net</span><strong style={widget.styles.text}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: basket.currency }).format(basket.netMinor / 100)}</strong></div><div className="flex justify-between" style={widget.styles.muted}><span>VAT</span><strong style={widget.styles.text}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: basket.currency }).format(basket.vatMinor / 100)}</strong></div><div className="flex justify-between border-t pt-4 text-[22px] font-black" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', ...widget.styles.text }}><span>Total</span><span>{basket.formattedTotal}</span></div></div><a href={storeBase} className={`mt-6 inline-flex border no-underline ${widget.classes.button}`} style={widget.styles.secondaryButton}>Continue shopping</a></div><CartCheckoutForm tenantSlug={tenantSlug} storeSlug={storeSlug} basket={basket} appearance={appearance} brand={brand} defaults={accountDefaults} /></div>
    </>}
  </div>;
}
