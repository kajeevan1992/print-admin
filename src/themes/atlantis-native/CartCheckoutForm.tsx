'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { StorefrontBasket } from '@/core/storefront/persistent-basket.service';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

type LineIssue = { lineId?: string; productName?: string; errors?: string[]; warnings?: string[] };
type AccountDefaults = { customerName: string; customerEmail: string; customerPhone: string; customerCompany: string; address?: { recipientName: string; company: string; line1: string; line2: string; town: string; county: string; postcode: string; country: string; phone: string } | null };
type PointOption = { slug: string; name: string; address: string; note: string; eligible: boolean; reason: string; earliestDate: string; remainingCapacity: number | null };
type MethodOption = { id: string; publicLabel: string; description: string; mode: string; formattedPrice: string; priceMinor: number; eligible: boolean; reason: string; requiresPostcode: boolean; requiresCollectionPoint: boolean; dispatchDate: string; estimatedArrivalDate: string; remainingCapacity: number | null; capacityState: string; collectionPoints: PointOption[] };

function list(items?: string[]) { return Array.isArray(items) ? items.filter(Boolean) : []; }
function preferenceKey(tenantSlug: string, storeSlug: string) { return `storefrontFulfilmentPreference:${tenantSlug}:${storeSlug}`; }
function dateLabel(value?: string) { if (!value) return ''; try { return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)); } catch { return value; } }
function money(minor: number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100); }

export default function CartCheckoutForm({ tenantSlug, storeSlug, basket, appearance, brand, defaults }: { tenantSlug: string; storeSlug: string; basket: StorefrontBasket; appearance?: unknown; brand?: Partial<StorefrontBrandSettings>; defaults?: AccountDefaults }) {
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [lineIssues, setLineIssues] = useState<LineIssue[]>([]);
  const [options, setOptions] = useState<MethodOption[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [deliveryPostcode, setDeliveryPostcode] = useState(defaults?.address?.postcode || '');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const widget = protectedWidgetTheme(appearance, brand);
  const fieldClass = `w-full ${widget.classes.field}`;
  const readyLines = basket.lines.filter((line) => line.artwork.status === 'ready');
  const address = defaults?.address || null;
  const selectedOption = useMemo(() => options.find((option) => option.id === selectedMethodId) || null, [options, selectedMethodId]);
  const fulfilmentMode: 'collection' | 'delivery' = selectedOption?.mode === 'collection' ? 'collection' : 'delivery';
  const needsDeliveryAddress = fulfilmentMode === 'delivery';
  const showBillingAddress = needsDeliveryAddress && !billingSameAsDelivery;
  const selectedPointOption = selectedOption?.collectionPoints.find((point) => point.slug === selectedPoint) || null;
  const checkoutTotalMinor = basket.grossMinor + (selectedOption?.priceMinor || 0);

  async function loadOptions(postcode = deliveryPostcode, point = selectedPoint, preferredMethodId = selectedMethodId) {
    setLoadingOptions(true); setCheckoutError('');
    try {
      const params = new URLSearchParams({ tenantSlug, storeSlug, basketId: basket.id });
      if (postcode.trim()) params.set('postcode', postcode.trim());
      if (point) params.set('collectionPointSlug', point);
      if (preferredMethodId) params.set('selectedMethodId', preferredMethodId);
      const response = await fetch(`/api/native-storefront/fulfilment-options?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Delivery options could not be loaded.');
      const next = Array.isArray(payload?.evaluation?.options) ? payload.evaluation.options as MethodOption[] : [];
      setOptions(next);
      const preferred = next.find((option) => option.id === preferredMethodId && option.eligible) || next.find((option) => option.eligible) || null;
      if (preferred) {
        setSelectedMethodId(preferred.id);
        if (preferred.requiresCollectionPoint) {
          const preferredPoint = preferred.collectionPoints.find((item) => item.slug === point && item.eligible) || preferred.collectionPoints.find((item) => item.eligible) || null;
          setSelectedPoint(preferredPoint?.slug || '');
        }
      }
      return next;
    } catch (error) { setCheckoutError(error instanceof Error ? error.message : 'Delivery options could not be loaded.'); return []; }
    finally { setLoadingOptions(false); }
  }

  useEffect(() => {
    let saved: any = null;
    try { saved = JSON.parse(window.localStorage.getItem(preferenceKey(tenantSlug, storeSlug)) || 'null'); } catch {}
    if (saved?.postcode && !deliveryPostcode) setDeliveryPostcode(saved.postcode);
    if (saved?.collectionPointId) setSelectedPoint(saved.collectionPointId);
    if (saved?.methodId) setSelectedMethodId(saved.methodId);
    void loadOptions(saved?.postcode || deliveryPostcode, saved?.collectionPointId || '', saved?.methodId || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, storeSlug, basket.id]);

  function chooseMethod(option: MethodOption) {
    if (!option.eligible) { setCheckoutError(option.reason || 'This fulfilment method is not available.'); return; }
    setSelectedMethodId(option.id); setCheckoutError('');
    if (option.requiresCollectionPoint) {
      const point = option.collectionPoints.find((item) => item.eligible);
      setSelectedPoint(point?.slug || '');
    }
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCheckoutError(''); setLineIssues([]);
    if (!selectedOption?.eligible) { setCheckoutError(selectedOption?.reason || 'Choose an available collection or delivery method.'); return; }
    if (selectedOption.requiresCollectionPoint && !selectedPointOption?.eligible) { setCheckoutError(selectedPointOption?.reason || 'Choose an available collection point.'); return; }
    const form = event.currentTarget; const data = new FormData(form);
    const missing = readyLines.filter((line) => { const file = data.get(`artworkFile:${line.id}`); return !(file instanceof File) || !file.size; });
    if (missing.length) { setCheckoutError('Upload artwork for every item marked “Upload artwork at checkout”, or change that item to send later/design help.'); setLineIssues(missing.map((line) => ({ lineId: line.id, productName: line.productName, errors: ['Artwork file is missing.'] }))); return; }
    setSubmitting(true);
    try { const response = await fetch('/api/native-storefront/basket-checkout', { method: 'POST', body: data, headers: { Accept: 'application/json', 'X-Checkout-Mode': 'json' } }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) { setCheckoutError(payload?.error || 'Checkout could not continue.'); setLineIssues(Array.isArray(payload?.lineIssues) ? payload.lineIssues : []); if (payload?.code === 'FULFILMENT_CHANGED') void loadOptions(); return; } if (payload.paymentUrl) window.location.assign(payload.paymentUrl); else setCheckoutError('Stripe payment URL was not returned.'); }
    catch (error) { setCheckoutError(error instanceof Error ? error.message : 'Checkout failed.'); }
    finally { setSubmitting(false); }
  }

  return <form data-protected-widget="basket-checkout" onSubmit={submitCheckout} action="/api/native-storefront/basket-checkout" method="post" encType="multipart/form-data" className={widget.classes.surface} style={{ ...widget.rootStyle, ...widget.styles.surface }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="storeSlug" value={storeSlug} /><input type="hidden" name="basketId" value={basket.id} /><input type="hidden" name="fulfilmentMode" value={fulfilmentMode} /><input type="hidden" name="fulfilmentMethodId" value={selectedOption?.id || ''} /><input type="hidden" name="collectionPointSlug" value={selectedPoint} /><input type="hidden" name="billingSameAsDelivery" value={billingSameAsDelivery ? 'true' : 'false'} />
    <div className="hidden">{basket.lines.map((line) => <span key={`artwork-state-${line.id}`}><input type="hidden" name={`artworkStatus:${line.id}`} value={line.artwork.status} /><input type="hidden" name={`artworkNotes:${line.id}`} value={line.artwork.notes || ''} /></span>)}</div>
    <div className="text-[20px] font-black" style={widget.styles.text}>Checkout details</div>
    <div className={`${widget.classes.top} ${widget.classes.price}`} style={widget.styles.price}><div className={widget.classes.label} style={widget.styles.muted}>Verified order total</div><div className="mt-1 text-[28px] font-black tracking-[-0.05em]" style={widget.styles.text}>{money(checkoutTotalMinor, basket.currency)}</div><div className="mt-2 text-[11px]" style={widget.styles.muted}>Products {basket.formattedTotal}{selectedOption ? ` · ${selectedOption.publicLabel} ${selectedOption.formattedPrice}` : ''} · Product VAT {money(basket.vatMinor, basket.currency)}</div></div>

    <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}>
      <div className="flex items-center justify-between gap-3"><div className={widget.classes.label} style={widget.styles.text}>Contact</div>{defaults ? <div className="text-[10px] font-black uppercase tracking-[0.12em]" style={widget.styles.muted}>Loaded from account</div> : null}</div>
      <div className={`mt-4 grid sm:grid-cols-2 ${widget.classes.gap}`}><input required name="customerName" placeholder="Name" defaultValue={defaults?.customerName || ''} className={fieldClass} style={widget.styles.field} /><input name="customerCompany" placeholder="Company / business name (optional)" defaultValue={defaults?.customerCompany || address?.company || ''} className={fieldClass} style={widget.styles.field} /><input required name="customerEmail" type="email" placeholder="Email" defaultValue={defaults?.customerEmail || ''} className={fieldClass} style={widget.styles.field} /><input required name="customerPhone" type="tel" placeholder="Phone / WhatsApp" defaultValue={defaults?.customerPhone || address?.phone || ''} className={fieldClass} style={widget.styles.field} /></div>
    </div>

    <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}>
      <div className="flex items-center justify-between gap-3"><div className={widget.classes.label} style={widget.styles.text}>Collection or delivery</div><button type="button" onClick={() => void loadOptions()} className="text-[11px] font-black" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{loadingOptions ? 'Checking…' : 'Refresh options'}</button></div>
      <div className="mt-4 grid gap-3">{options.map((option) => <button key={option.id} type="button" disabled={!option.eligible} onClick={() => chooseMethod(option)} className={`text-left ${widget.classes.option} disabled:cursor-not-allowed disabled:opacity-55`} style={selectedMethodId === option.id ? widget.styles.activeControl : widget.styles.inactiveControl}><div className="flex items-center justify-between gap-3"><strong>{option.publicLabel}</strong><span>{option.formattedPrice}</span></div><div className="mt-1 text-[11px]" style={widget.styles.muted}>{option.eligible ? `${option.description || 'Available'} · Earliest ${dateLabel(option.estimatedArrivalDate)}${option.remainingCapacity !== null ? ` · ${option.remainingCapacity} slots left` : ''}` : option.reason}</div></button>)}</div>
      {!loadingOptions && !options.length ? <div className="mt-4 rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', ...widget.styles.muted }}>No delivery methods are configured for this store.</div> : null}

      {selectedOption?.requiresCollectionPoint ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{selectedOption.collectionPoints.map((point) => <button key={point.slug} type="button" disabled={!point.eligible} onClick={() => { setSelectedPoint(point.slug); void loadOptions('', point.slug, selectedOption.id); }} className={`rounded-[16px] border p-4 text-left disabled:opacity-50`} style={{ borderColor: selectedPoint === point.slug ? 'var(--storefront-primary, #18A7D0)' : 'var(--storefront-line, #E3E8F0)' }}><div className="text-[13px] font-black" style={widget.styles.text}>{point.name}</div><div className="mt-1 text-[11px]" style={widget.styles.muted}>{point.address || point.note}</div><div className="mt-1 text-[11px]" style={{ color: point.eligible ? 'var(--storefront-primary, #18A7D0)' : '#b45309' }}>{point.eligible ? `Earliest ${dateLabel(point.earliestDate)}${point.remainingCapacity !== null ? ` · ${point.remainingCapacity} slots left` : ''}` : point.reason}</div></button>)}</div> : null}

      {needsDeliveryAddress ? <div className={`mt-4 grid sm:grid-cols-2 ${widget.classes.gap}`}><input required name="deliveryAddress1" placeholder="Delivery address line 1" defaultValue={address?.line1 || ''} className={fieldClass} style={widget.styles.field} /><input name="deliveryAddress2" placeholder="Address line 2" defaultValue={address?.line2 || ''} className={fieldClass} style={widget.styles.field} /><input required name="deliveryTown" placeholder="Town / city" defaultValue={address?.town || ''} className={fieldClass} style={widget.styles.field} /><input name="deliveryCounty" placeholder="County" defaultValue={address?.county || ''} className={fieldClass} style={widget.styles.field} /><div><input required name="deliveryPostcode" placeholder="Postcode" value={deliveryPostcode} onChange={(event) => setDeliveryPostcode(event.target.value.toUpperCase())} onBlur={() => void loadOptions(deliveryPostcode, '', selectedMethodId)} className={fieldClass} style={widget.styles.field} /><button type="button" onClick={() => void loadOptions(deliveryPostcode, '', selectedMethodId)} className="mt-2 text-[11px] font-black" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Check this postcode</button></div><input name="deliveryCountry" placeholder="Country" defaultValue={address?.country || 'United Kingdom'} className={fieldClass} style={widget.styles.field} /></div> : selectedPointOption ? <p className="mt-4 text-[12px]" style={widget.styles.muted}>Collection from {selectedPointOption.name}{selectedPointOption.address ? ` · ${selectedPointOption.address}` : ''}.</p> : null}
      {needsDeliveryAddress ? <label className="mt-4 flex items-center gap-2 text-[12px] font-bold" style={widget.styles.text}><input type="checkbox" checked={billingSameAsDelivery} onChange={(event) => setBillingSameAsDelivery(event.target.checked)} /> Billing address is same as delivery</label> : null}
      {showBillingAddress ? <div className={`mt-4 grid sm:grid-cols-2 ${widget.classes.gap}`}><input required name="billingAddress1" placeholder="Billing address line 1" defaultValue={address?.line1 || ''} className={fieldClass} style={widget.styles.field} /><input name="billingAddress2" placeholder="Address line 2" defaultValue={address?.line2 || ''} className={fieldClass} style={widget.styles.field} /><input required name="billingTown" placeholder="Town / city" defaultValue={address?.town || ''} className={fieldClass} style={widget.styles.field} /><input name="billingCounty" placeholder="County" defaultValue={address?.county || ''} className={fieldClass} style={widget.styles.field} /><input required name="billingPostcode" placeholder="Postcode" defaultValue={address?.postcode || ''} className={fieldClass} style={widget.styles.field} /><input name="billingCountry" placeholder="Country" defaultValue={address?.country || 'United Kingdom'} className={fieldClass} style={widget.styles.field} /></div> : null}
    </div>

    {readyLines.length ? <div className={`${widget.classes.top} ${widget.classes.section}`} style={widget.styles.section}><div className={widget.classes.label} style={widget.styles.text}>Artwork uploads by item</div><div className="mt-4 space-y-4">{readyLines.map((line) => <div key={line.id} className="rounded-[16px] border p-4" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="text-[13px] font-black" style={widget.styles.text}>{line.productName}</div><div className="mt-1 text-[11px]" style={widget.styles.muted}>Quantity {line.quantity}{line.artwork.notes ? ` · ${line.artwork.notes}` : ''}</div><input required name={`artworkFile:${line.id}`} type="file" accept=".pdf,.ai,.eps,.psd,.jpg,.jpeg,.png,.tif,.tiff" className={`mt-3 ${fieldClass}`} style={widget.styles.field} /></div>)}</div></div> : null}
    {checkoutError ? <div className={`${widget.classes.top} ${widget.classes.section} text-[12px]`} style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }}><div className="font-black">{checkoutError}</div>{lineIssues.length ? <div className="mt-3 space-y-3">{lineIssues.map((issue, index) => <div key={`${issue.lineId || 'line'}-${index}`}><div className="font-black">{issue.productName || 'Basket item'}</div>{list(issue.errors).length ? <ul className="mt-1 list-disc pl-5">{list(issue.errors).map((item) => <li key={item}>{item}</li>)}</ul> : null}{list(issue.warnings).length ? <ul className="mt-1 list-disc pl-5">{list(issue.warnings).map((item) => <li key={item}>{item}</li>)}</ul> : null}</div>)}</div> : null}</div> : null}
    <button disabled={!basket.lines.length || submitting || loadingOptions || !selectedOption?.eligible} className={`${widget.classes.top} w-full text-white disabled:opacity-50 ${widget.classes.button}`} style={widget.styles.primaryButton}>{submitting ? 'Reserving fulfilment and checking artwork…' : `Pay ${money(checkoutTotalMinor, basket.currency)}`}</button><p className="mt-4 text-[12px]" style={widget.styles.muted}>Products, delivery price, postcode eligibility and capacity are rechecked by the SaaS backend before Stripe opens.</p>
  </form>;
}
