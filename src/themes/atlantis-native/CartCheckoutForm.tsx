'use client';

import { FormEvent, useState } from 'react';
import type { StorefrontBasket } from '@/core/storefront/persistent-basket.service';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

type LineIssue = { lineId?: string; productName?: string; errors?: string[]; warnings?: string[] };
type AccountDefaults = { customerName: string; customerEmail: string; customerPhone: string; customerCompany: string; address?: { recipientName: string; company: string; line1: string; line2: string; town: string; county: string; postcode: string; country: string; phone: string } | null };
function list(items?: string[]) { return Array.isArray(items) ? items.filter(Boolean) : []; }

export default function CartCheckoutForm({ tenantSlug, storeSlug, basket, appearance, brand, defaults }: { tenantSlug: string; storeSlug: string; basket: StorefrontBasket; appearance?: unknown; brand?: Partial<StorefrontBrandSettings>; defaults?: AccountDefaults }) {
  const [fulfilmentMode, setFulfilmentMode] = useState<'collection' | 'delivery'>('collection');
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [lineIssues, setLineIssues] = useState<LineIssue[]>([]);
  const widget = protectedWidgetTheme(appearance, brand);
  const fieldClass = `w-full ${widget.classes.field}`;
  const needsDeliveryAddress = fulfilmentMode === 'delivery';
  const showBillingAddress = needsDeliveryAddress && !billingSameAsDelivery;
  const readyLines = basket.lines.filter((line) => line.artwork.status === 'ready');
  const address = defaults?.address || null;

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCheckoutError(''); setLineIssues([]);
    const form = event.currentTarget; const data = new FormData(form);
    const missing = readyLines.filter((line) => { const file = data.get(`artworkFile:${line.id}`); return !(file instanceof File) || !file.size; });
    if (missing.length) { setCheckoutError('Upload artwork for every item marked “Upload artwork at checkout”, or change that item to send later/design help.'); setLineIssues(missing.map((line) => ({ lineId: line.id, productName: line.productName, errors: ['Artwork file is missing.'] }))); return; }
    setSubmitting(true);
    try { const response = await fetch('/api/native-storefront/basket-checkout', { method: 'POST', body: data, headers: { Accept: 'application/json', 'X-Checkout-Mode': 'json' } }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) { setCheckoutError(payload?.error || 'Checkout could not continue.'); setLineIssues(Array.isArray(payload?.lineIssues) ? payload.lineIssues : []); return; } if (payload.paymentUrl) window.location.assign(payload.paymentUrl); else setCheckoutError('Stripe payment URL was not returned.'); }
    catch (error) { setCheckoutError(error instanceof Error ? error.message : 'Checkout failed.'); }
    finally { setSubmitting(false); }
  }

  return <form data-protected-widget="basket-checkout" onSubmit={submitCheckout} action="/api/native-storefront/basket-checkout" method="post" encType="multipart/form-data" className={widget.classes.surface} style={{ ...widget.rootStyle, ...widget.styles.surface }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="storeSlug" value={storeSlug} /><input type="hidden" name="basketId" value={basket.id} /><input type="hidden" name="fulfilmentMode" value={fulfilmentMode} /><input type="hidden" name="billingSameAsDelivery" value={billingSameAsDelivery ? 'true' : 'false'} />
    <div className="hidden">{basket.lines.map((line) => <span key={`artwork-state-${line.id}`}><input type="hidden" name={`artworkStatus:${line.id}`} value={line.artwork.status} /><input type="hidden" name={`artworkNotes:${line.id}`} value={line.artwork.notes || ''} /></span>)}</div>
    <div className="text-[20px] font-black" style={widget.styles.text}>Checkout details</div>
    <div className={`${widget.classes.top} ${widget.classes.price}`} style={widget.styles.price}><div className={widget.classes.label} style={widget.styles.muted}>Server-priced basket total</div><div className="mt-1 text-[28px] font-black tracking-[-0.05em]" style={widget.styles.text}>{basket.formattedTotal}</div><div className="mt-2 text-[11px]" style={widget.styles.muted}>{basket.lineCount} line{basket.lineCount === 1 ? '' : 's'} · VAT {new Intl.NumberFormat('en-GB', { style: 'currency', currency: basket.currency }).format(basket.vatMinor / 100)}</div></div>

    <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}>
      <div className="flex items-center justify-between gap-3"><div className={widget.classes.label} style={widget.styles.text}>Contact</div>{defaults ? <div className="text-[10px] font-black uppercase tracking-[0.12em]" style={widget.styles.muted}>Loaded from account</div> : null}</div>
      <div className={`mt-4 grid sm:grid-cols-2 ${widget.classes.gap}`}><input required name="customerName" placeholder="Name" defaultValue={defaults?.customerName || ''} className={fieldClass} style={widget.styles.field} /><input name="customerCompany" placeholder="Company / business name (optional)" defaultValue={defaults?.customerCompany || address?.company || ''} className={fieldClass} style={widget.styles.field} /><input required name="customerEmail" type="email" placeholder="Email" defaultValue={defaults?.customerEmail || ''} className={fieldClass} style={widget.styles.field} /><input required name="customerPhone" type="tel" placeholder="Phone / WhatsApp" defaultValue={defaults?.customerPhone || address?.phone || ''} className={fieldClass} style={widget.styles.field} /></div>
    </div>

    <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}>
      <div className={widget.classes.label} style={widget.styles.text}>Fulfilment</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{([['collection', 'Collect from store'], ['delivery', 'Delivery / courier']] as const).map(([value, label]) => <label key={value} className={`cursor-pointer ${widget.classes.option}`} style={fulfilmentMode === value ? widget.styles.activeControl : widget.styles.inactiveControl}><input className="mr-2" type="radio" checked={fulfilmentMode === value} onChange={() => setFulfilmentMode(value)} />{label}</label>)}</div>
      {needsDeliveryAddress ? <div className={`mt-4 grid sm:grid-cols-2 ${widget.classes.gap}`}><input required name="deliveryAddress1" placeholder="Delivery address line 1" defaultValue={address?.line1 || ''} className={fieldClass} style={widget.styles.field} /><input name="deliveryAddress2" placeholder="Address line 2" defaultValue={address?.line2 || ''} className={fieldClass} style={widget.styles.field} /><input required name="deliveryTown" placeholder="Town / city" defaultValue={address?.town || ''} className={fieldClass} style={widget.styles.field} /><input name="deliveryCounty" placeholder="County" defaultValue={address?.county || ''} className={fieldClass} style={widget.styles.field} /><input required name="deliveryPostcode" placeholder="Postcode" defaultValue={address?.postcode || ''} className={fieldClass} style={widget.styles.field} /><input name="deliveryCountry" placeholder="Country" defaultValue={address?.country || 'United Kingdom'} className={fieldClass} style={widget.styles.field} /></div> : <p className="mt-3 text-[12px]" style={widget.styles.muted}>The full basket will be prepared for collection from this store.</p>}
      {needsDeliveryAddress ? <label className="mt-4 flex items-center gap-2 text-[12px] font-bold" style={widget.styles.text}><input type="checkbox" checked={billingSameAsDelivery} onChange={(event) => setBillingSameAsDelivery(event.target.checked)} /> Billing address is same as delivery</label> : null}
      {showBillingAddress ? <div className={`mt-4 grid sm:grid-cols-2 ${widget.classes.gap}`}><input required name="billingAddress1" placeholder="Billing address line 1" defaultValue={address?.line1 || ''} className={fieldClass} style={widget.styles.field} /><input name="billingAddress2" placeholder="Address line 2" defaultValue={address?.line2 || ''} className={fieldClass} style={widget.styles.field} /><input required name="billingTown" placeholder="Town / city" defaultValue={address?.town || ''} className={fieldClass} style={widget.styles.field} /><input name="billingCounty" placeholder="County" defaultValue={address?.county || ''} className={fieldClass} style={widget.styles.field} /><input required name="billingPostcode" placeholder="Postcode" defaultValue={address?.postcode || ''} className={fieldClass} style={widget.styles.field} /><input name="billingCountry" placeholder="Country" defaultValue={address?.country || 'United Kingdom'} className={fieldClass} style={widget.styles.field} /></div> : null}
    </div>

    {readyLines.length ? <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}><div className={widget.classes.label} style={widget.styles.text}>Artwork uploads by item</div><div className="mt-4 space-y-4">{readyLines.map((line) => <div key={line.id} className="rounded-[16px] border p-4" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="text-[13px] font-black" style={widget.styles.text}>{line.productName}</div><div className="mt-1 text-[11px]" style={widget.styles.muted}>Quantity {line.quantity}{line.artwork.notes ? ` · ${line.artwork.notes}` : ''}</div><input required name={`artworkFile:${line.id}`} type="file" accept=".pdf,.ai,.eps,.psd,.jpg,.jpeg,.png,.tif,.tiff" className={`mt-3 ${fieldClass}`} style={widget.styles.field} /></div>)}</div></div> : null}
    {checkoutError ? <div className={`${widget.classes.top} ${widget.classes.section} text-[12px]`} style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }}><div className="font-black">{checkoutError}</div>{lineIssues.length ? <div className="mt-3 space-y-3">{lineIssues.map((issue, index) => <div key={`${issue.lineId || 'line'}-${index}`}><div className="font-black">{issue.productName || 'Basket item'}</div>{list(issue.errors).length ? <ul className="mt-1 list-disc pl-5">{list(issue.errors).map((item) => <li key={item}>{item}</li>)}</ul> : null}{list(issue.warnings).length ? <ul className="mt-1 list-disc pl-5">{list(issue.warnings).map((item) => <li key={item}>{item}</li>)}</ul> : null}</div>)}</div> : null}</div> : null}
    <button disabled={!basket.lines.length || submitting} className={`${widget.classes.top} w-full text-white disabled:opacity-50 ${widget.classes.button}`} style={widget.styles.primaryButton}>{submitting ? 'Checking basket and artwork…' : `Pay ${basket.formattedTotal}`}</button><p className="mt-4 text-[12px]" style={widget.styles.muted}>Every line is repriced by the SaaS backend before the order and Stripe session are created.</p>
  </form>;
}
