'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

 type ConfigOption = Record<string, any> & { id?: string; value?: string; label?: string; slug?: string; disabled?: boolean; visible?: boolean; recommended?: boolean; default?: boolean; priceMinor?: number; quantity?: string | number; qty?: string | number; available?: boolean; description?: string };
 type ConfigGroup = Record<string, any> & { key?: string; label?: string; name?: string; displayType?: string; options?: ConfigOption[]; values?: ConfigOption[] };
 type PriceState = { loading: boolean; ok: boolean; formattedPrice?: string; error?: string; meta?: Record<string, any> };

 type Props = {
   tenantSlug: string;
   storeSlug: string;
   storeBase: string;
   category: string;
   slug: string;
   title: string;
   optionGroups?: ConfigGroup[];
   quantityRows?: ConfigOption[];
   deliveryRows?: ConfigOption[];
   initialSelections?: Record<string, any>;
   initialQuantity?: string | number | null;
   initialDelivery?: string | null;
   initialPrice?: Record<string, any> | null;
   searchParams?: Record<string, string>;
   appearance?: unknown;
   brand?: Partial<StorefrontBrandSettings>;
 };

 function cleanSlug(value: unknown) { return String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
 function groupKey(group: ConfigGroup) { return String(group.key || group.id || group.label || group.name || '').trim(); }
 function groupLabel(group: ConfigGroup) { return String(group.label || group.name || group.key || 'Option').trim(); }
 function groupOptions(group: ConfigGroup): ConfigOption[] { const rows = Array.isArray(group.options) ? group.options : Array.isArray(group.values) ? group.values : []; return rows.filter((item) => item && item.visible !== false && item.disabled !== true); }
 function optionLabel(option: ConfigOption) { return String(option.label || option.name || option.title || option.value || option.slug || option.id || '').trim(); }
 function optionValue(option: ConfigOption) { return String(option.value || option.label || option.name || option.slug || option.id || '').trim(); }
 function optionSlug(option: ConfigOption) { return String(option.slug || option.id || cleanSlug(optionValue(option))).trim(); }
 function sameSelected(left: unknown, right: unknown) { return cleanSlug(left) === cleanSlug(right); }
 function moneyMinor(value: unknown, currency = 'GBP') { const amount = Number(value || 0); return amount > 0 ? new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount / 100) : ''; }
 function rowQty(row: ConfigOption) { return row.quantity || row.qty || row.value || row.label || row.id || ''; }
 function rowPrice(row: ConfigOption) { return row.formattedPrice || row.priceFormatted || moneyMinor(row.priceMinor || row.totalMinor || row.grossMinor, row.currency || 'GBP'); }
 function rowDescription(row: ConfigOption) { return row.description || row.latest || row.publicLabel || row.deliveryEstimate?.displayText || row.cutoffMessage || ''; }

 function initialSelected(groups: ConfigGroup[] = [], initialSelections: Record<string, any> = {}, searchParams: Record<string, string> = {}) {
   const next: Record<string, string> = {};
   groups.forEach((group) => {
     const key = groupKey(group);
     if (!key) return;
     const options = groupOptions(group);
     const requested = searchParams[key] || searchParams[cleanSlug(key)] || initialSelections[key] || initialSelections[cleanSlug(key)] || '';
     const matched = requested ? options.find((option) => sameSelected(optionSlug(option), requested) || sameSelected(optionValue(option), requested) || sameSelected(optionLabel(option), requested)) : null;
     const fallback = matched || options.find((option) => option.default || option.recommended) || options[0];
     if (fallback) next[key] = optionSlug(fallback);
   });
   return next;
 }

 function selectedOptionRows(groups: ConfigGroup[] = [], selected: Record<string, string>) {
   return groups.map((group) => {
     const key = groupKey(group);
     const options = groupOptions(group);
     const selectedSlug = selected[key] || optionSlug(options[0] || {});
     const option = options.find((item) => optionSlug(item) === selectedSlug) || options[0];
     return option && key ? { key, label: groupLabel(group), value: optionValue(option), slug: optionSlug(option) } : null;
   }).filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
 }

 function initialQuantity(quantityRows: ConfigOption[] = [], initial: unknown, searchParams: Record<string, string>) {
   const explicit = Number(searchParams.quantity || searchParams.qty || initial || '');
   if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
   const first = quantityRows.find((row) => row.default || row.recommended || row.available !== false) || quantityRows[0];
   const value = Number(rowQty(first || {}));
   return Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
 }

 function initialDelivery(deliveryRows: ConfigOption[] = [], initial: unknown, searchParams: Record<string, string>) {
   const requested = searchParams.delivery || searchParams.turnaround || String(initial || '');
   const matched = requested ? deliveryRows.find((row) => sameSelected(row.value || row.id || row.label, requested)) : null;
   const fallback = matched || deliveryRows.find((row) => row.selected || row.default || row.recommended || row.available !== false) || deliveryRows[0];
   return fallback ? String(fallback.value || fallback.id || fallback.label || '') : '';
 }

 export default function ProductOrderPanel({ tenantSlug, storeSlug, storeBase, category, slug, title, optionGroups = [], quantityRows = [], deliveryRows = [], initialSelections = {}, initialQuantity: initialQty, initialDelivery: initialDeliveryValue, initialPrice = null, searchParams = {}, appearance, brand }: Props) {
   const [selected, setSelected] = useState<Record<string, string>>(() => initialSelected(optionGroups, initialSelections, searchParams));
   const [quantity, setQuantity] = useState(() => initialQuantity(quantityRows, initialQty, searchParams));
   const [delivery, setDelivery] = useState(() => initialDelivery(deliveryRows, initialDeliveryValue, searchParams));
   const [price, setPrice] = useState<PriceState>(() => initialPrice?.formattedPrice ? { loading: false, ok: true, formattedPrice: String(initialPrice.formattedPrice), meta: initialPrice } : { loading: true, ok: false });
   const [saving, setSaving] = useState(false);
   const [basketError, setBasketError] = useState('');
   const rows = useMemo(() => selectedOptionRows(optionGroups, selected), [optionGroups, selected]);
   const basketLineId = String(searchParams.basketLine || '').trim();
   const widget = protectedWidgetTheme(appearance, brand);

   useEffect(() => {
     let alive = true;
     setPrice((current) => ({ ...current, loading: true, ok: false }));
     fetch('/api/internal/storefront/price', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ tenantSlug, storeSlug, productSlug: slug, categorySlug: category, selectedOptions: rows, quantity, delivery }),
     })
       .then((response) => response.json())
       .then((payload) => {
         if (!alive) return;
         if (payload?.ok) setPrice({ loading: false, ok: true, formattedPrice: payload.data?.formattedPrice, meta: payload.data });
         else setPrice({ loading: false, ok: false, error: payload?.error?.message || payload?.error || 'Price unavailable' });
       })
       .catch((error) => {
         if (alive) setPrice({ loading: false, ok: false, error: error instanceof Error ? error.message : 'Price unavailable' });
       });
     return () => { alive = false; };
   }, [tenantSlug, storeSlug, slug, category, rows, quantity, delivery]);

   async function saveBasketLine() {
     if (!price.ok || saving) return;
     setSaving(true);
     setBasketError('');
     try {
       const response = await fetch('/api/internal/storefront/basket', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
         body: JSON.stringify({ tenantSlug, storeSlug, lineId: basketLineId || undefined, productSlug: slug, categorySlug: category, productName: title, selectedOptions: rows, quantity, delivery }),
       });
       const payload = await response.json().catch(() => ({}));
       if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Basket could not be updated.');
       window.dispatchEvent(new CustomEvent('storefront:basket-changed', { detail: payload.summary || null }));
       window.location.assign(`${storeBase}/cart`);
     } catch (error) {
       setBasketError(error instanceof Error ? error.message : 'Basket could not be updated.');
     } finally {
       setSaving(false);
     }
   }

   return <div data-protected-widget="product-configurator" className={widget.classes.surface} style={{ ...widget.rootStyle, ...widget.styles.surface }}>
     <div className="text-[22px] font-black tracking-[-0.04em]" style={widget.styles.text}>{basketLineId ? 'Edit basket item' : 'Order setup'}</div>
     <div className="mt-2 text-[13px] font-bold" style={widget.styles.muted}>These fields come from the backend product configurator contract.</div>

     {optionGroups.length ? <div className={`${widget.classes.top} space-y-4`}>{optionGroups.map((group) => {
       const key = groupKey(group);
       const display = String(group.displayType || group.style || '').toLowerCase();
       const automaticMode = display.includes('tile') || display.includes('card') ? 'cards' : 'pills';
       const mode = widget.appearance.optionStyle === 'auto' ? automaticMode : widget.appearance.optionStyle;
       const optionClass = mode === 'pills' ? widget.classes.optionPill : mode === 'segments' ? widget.classes.optionSegment : widget.classes.optionCard;
       const layoutClass = mode === 'pills' ? 'mt-2 flex flex-wrap gap-2' : 'mt-2 grid gap-2 sm:grid-cols-2';
       return <div key={key || groupLabel(group)}>
         <div className={widget.classes.label} style={widget.styles.text}>{groupLabel(group)}</div>
         <div className={layoutClass}>{groupOptions(group).map((value) => {
           const active = selected[key] === optionSlug(value);
           return <button key={optionSlug(value)} type="button" onClick={() => setSelected((current) => ({ ...current, [key]: optionSlug(value) }))} className={optionClass} style={active ? widget.styles.activeControl : widget.styles.inactiveControl}>
             <span>{optionLabel(value)}</span>
             {value.recommended ? <span className="ml-2 rounded-full px-2 py-1 text-[9px] uppercase tracking-[0.1em] text-white" style={widget.styles.primaryButton}>Recommended</span> : null}
             {value.sublabel || value.description ? <div className="mt-1 text-[11px] font-semibold" style={widget.styles.muted}>{value.sublabel || value.description}</div> : null}
           </button>;
         })}</div>
       </div>;
     })}</div> : <div className={`${widget.classes.top} ${widget.classes.section} text-[12px]`} style={{ ...widget.styles.section, ...widget.styles.muted }}>No customer-facing product options are configured for this product yet.</div>}

     <div className={widget.classes.top}>
       <label className={`block ${widget.classes.label}`} style={widget.styles.text}>Quantity / print run</label>
       {quantityRows.length ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{quantityRows.map((row) => {
         const qty = Number(rowQty(row));
         const active = qty === quantity;
         return <button key={String(rowQty(row))} type="button" onClick={() => Number.isFinite(qty) && qty > 0 ? setQuantity(Math.round(qty)) : undefined} className={widget.classes.optionCard} style={active ? widget.styles.activeControl : widget.styles.inactiveControl}>
           <div className="text-[14px] font-black" style={widget.styles.text}>{String(rowQty(row))}</div>
           {rowPrice(row) ? <div className="mt-1 text-[12px] font-bold" style={widget.styles.primaryText}>{rowPrice(row)}</div> : null}
         </button>;
       })}</div> : <input value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} min="1" type="number" className={`mt-2 w-full ${widget.classes.field}`} style={widget.styles.field} />}
     </div>

     {deliveryRows.length ? <div className={widget.classes.top}>
       <div className={widget.classes.label} style={widget.styles.text}>Turnaround / delivery</div>
       <div className="mt-2 space-y-2">{deliveryRows.map((row) => {
         const value = String(row.value || row.id || row.label || '');
         const active = delivery === value;
         return <button key={value || optionLabel(row)} type="button" onClick={() => setDelivery(value)} className={`w-full ${widget.classes.optionCard}`} style={active ? widget.styles.activeControl : widget.styles.inactiveControl}>
           <div className="text-[13px] font-black" style={widget.styles.text}>{optionLabel(row)}</div>
           {rowDescription(row) ? <div className="mt-1 text-[12px] font-semibold" style={widget.styles.muted}>{rowDescription(row)}</div> : null}
           {row.addon ? <div className="mt-1 text-[12px] font-bold" style={widget.styles.primaryText}>{row.addon}</div> : null}
         </button>;
       })}</div>
     </div> : null}

     <div className={`${widget.classes.top} ${widget.classes.price}`} style={widget.styles.price}>
       <div className={widget.classes.label} style={widget.styles.muted}>Live backend price</div>
       <div className="mt-1 text-[28px] font-black tracking-[-0.05em]" style={widget.styles.text}>{price.loading ? 'Checking price…' : price.ok ? price.formattedPrice : 'Price unavailable'}</div>
       {!price.loading && !price.ok ? <div className="mt-2 text-[12px]" style={widget.styles.muted}>{price.error}</div> : null}
       {price.meta?.vatReason ? <div className="mt-2 text-[11px]" style={widget.styles.muted}>Tax rule: {String(price.meta.vatReason)}</div> : null}
     </div>

     {basketError ? <div className={`${widget.classes.top} ${widget.classes.section} text-[12px]`} style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }}>{basketError}</div> : null}
     <button type="button" onClick={saveBasketLine} disabled={!price.ok || saving} className={`${widget.classes.top} block w-full text-center text-white disabled:opacity-50 ${widget.classes.button}`} style={widget.styles.primaryButton}>{saving ? 'Saving basket…' : basketLineId ? 'Update basket' : 'Add to basket'}</button>
     <div className="mt-4 text-[12px]" style={widget.styles.muted}>{title} pricing, availability, quantity, delivery and VAT are controlled by backend product setup.</div>
   </div>;
 }
