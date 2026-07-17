'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, MapPin, Package, Store, Truck, X } from 'lucide-react';
import type { CollectionPoint } from './collection-points';

const BRAND = { line: 'var(--storefront-line, #E3E8F0)', ink: 'var(--storefront-ink, #161A22)', muted: 'var(--storefront-muted, #667487)', primary: 'var(--storefront-primary, #18A7D0)' };

type PointOption = { slug: string; name: string; address: string; note: string; eligible: boolean; reason: string; earliestDate: string; remainingCapacity: number | null; capacityState: string };
type MethodOption = { id: string; publicLabel: string; description: string; mode: string; carrier: string; serviceLevel: string; formattedPrice: string; eligible: boolean; reason: string; requiresPostcode: boolean; requiresCollectionPoint: boolean; cutoffTime: string; dispatchDate: string; estimatedArrivalDate: string; capacityState: string; collectionPoints: PointOption[] };
type Preference = { methodId?: string; method?: string; methodLabel?: string; collectionPointId?: string | null; collectionPointLabel?: string | null; postcode?: string | null; formattedPrice?: string; estimatedArrivalDate?: string; updatedAt?: string } | null;

type Props = { compact?: boolean; forceOpen?: boolean; onClose?: () => void; collectionPoints?: CollectionPoint[]; tenantSlug: string; storeSlug: string; basketId?: string };

function iconFor(mode: string) { if (mode === 'collection') return Store; if (mode === 'local-courier') return Truck; return Package; }
function storageKey(tenantSlug: string, storeSlug: string) { return `storefrontFulfilmentPreference:${tenantSlug}:${storeSlug}`; }
function safeReadPreference(key: string): Preference { if (typeof window === 'undefined') return null; try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function savePreference(key: string, preference: Preference) { if (typeof window === 'undefined') return; window.localStorage.setItem(key, JSON.stringify(preference)); window.dispatchEvent(new CustomEvent('storefront:fulfilment-changed', { detail: preference })); }
function dateLabel(value?: string) { if (!value) return ''; try { return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)); } catch { return value; } }

function OptionCard({ option, active, onClick }: { option: MethodOption; active: boolean; onClick: () => void }) {
  const Icon = iconFor(option.mode);
  const postcodePrompt = option.requiresPostcode && /enter a delivery postcode/i.test(option.reason);
  const selectable = option.eligible || postcodePrompt || option.requiresCollectionPoint;
  return <button type="button" disabled={!selectable} onClick={onClick} className="group flex w-full items-center gap-4 rounded-[18px] border bg-white px-4 py-4 text-left transition enabled:hover:-translate-y-[1px] enabled:hover:shadow-[0_14px_30px_rgba(0,0,0,0.06)] disabled:cursor-not-allowed disabled:opacity-55" style={{ borderColor: active ? BRAND.primary : BRAND.line, background: active ? 'color-mix(in srgb, var(--storefront-primary, #18A7D0) 8%, white)' : 'white' }}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--storefront-primary, #18A7D0) 14%, white)', color: BRAND.primary }}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-black tracking-[-0.02em]" style={{ color: BRAND.ink }}>{option.publicLabel}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black" style={{ color: BRAND.ink }}>{option.formattedPrice}</span></span><span className="mt-1 block text-[12px] leading-5" style={{ color: BRAND.muted }}>{option.description || option.serviceLevel}</span><span className="mt-1 block text-[11px]" style={{ color: option.eligible || postcodePrompt ? BRAND.primary : '#b45309' }}>{option.eligible ? `Earliest ${dateLabel(option.estimatedArrivalDate)}` : option.reason}</span></span>{active ? <Check className="h-5 w-5 shrink-0" style={{ color: BRAND.primary }} /> : <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />}</button>;
}

export default function FulfillmentSelector({ compact = false, forceOpen = false, onClose, collectionPoints = [], tenantSlug, storeSlug, basketId }: Props) {
  const key = storageKey(tenantSlug, storeSlug);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'method' | 'collection' | 'postcode'>('method');
  const [options, setOptions] = useState<MethodOption[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [postcode, setPostcode] = useState('');
  const [preference, setPreference] = useState<Preference>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadOptions(nextPostcode = postcode, nextPoint = selectedPoint) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ tenantSlug, storeSlug });
      if (basketId) params.set('basketId', basketId);
      if (nextPostcode.trim()) params.set('postcode', nextPostcode.trim());
      if (nextPoint) params.set('collectionPointSlug', nextPoint);
      if (selectedMethodId) params.set('selectedMethodId', selectedMethodId);
      const response = await fetch(`/api/native-storefront/fulfilment-options?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Fulfilment options could not be loaded.');
      setOptions(Array.isArray(payload?.evaluation?.options) ? payload.evaluation.options : []);
      return Array.isArray(payload?.evaluation?.options) ? payload.evaluation.options as MethodOption[] : [];
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Fulfilment options could not be loaded.'); return []; }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const saved = safeReadPreference(key);
    setPreference(saved);
    if (saved?.methodId) setSelectedMethodId(saved.methodId);
    if (saved?.collectionPointId) setSelectedPoint(saved.collectionPointId);
    if (saved?.postcode) setPostcode(saved.postcode);
    void loadOptions(saved?.postcode || '', saved?.collectionPointId || '');
    const onChange = (event: Event) => setPreference((event as CustomEvent).detail || safeReadPreference(key));
    window.addEventListener('storefront:fulfilment-changed', onChange);
    return () => window.removeEventListener('storefront:fulfilment-changed', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, storeSlug, basketId]);
  useEffect(() => { if (forceOpen) { setOpen(true); setStep('method'); void loadOptions(); } }, [forceOpen]);

  const selectedMethod = useMemo(() => options.find((option) => option.id === selectedMethodId) || null, [options, selectedMethodId]);
  const fallbackPoint = collectionPoints[0] ? { slug: collectionPoints[0].slug, name: collectionPoints[0].name, address: collectionPoints[0].address, note: collectionPoints[0].note, eligible: true, reason: '', earliestDate: '', remainingCapacity: null, capacityState: 'unlimited' } : null;
  const points = selectedMethod?.collectionPoints?.length ? selectedMethod.collectionPoints : fallbackPoint ? [fallbackPoint] : [];
  const selectedPointData = points.find((point) => point.slug === selectedPoint) || points[0] || null;
  const pillLabel = preference?.methodLabel || options.find((option) => option.id === preference?.methodId)?.publicLabel || 'Collection / delivery';
  const close = () => { setOpen(false); setStep('method'); setError(''); onClose?.(); };

  function commit(option: MethodOption, point?: PointOption | null, finalPostcode = postcode) {
    const next = { methodId: option.id, method: option.mode, methodLabel: option.publicLabel, collectionPointId: option.requiresCollectionPoint ? point?.slug || null : null, collectionPointLabel: option.requiresCollectionPoint ? point?.name || null : null, postcode: option.requiresPostcode ? finalPostcode.trim().toUpperCase() : null, formattedPrice: option.formattedPrice, estimatedArrivalDate: option.estimatedArrivalDate, updatedAt: new Date().toISOString() };
    setPreference(next); savePreference(key, next); close();
  }

  async function chooseMethod(option: MethodOption) {
    setSelectedMethodId(option.id); setError('');
    if (option.requiresCollectionPoint) { const first = option.collectionPoints.find((point) => point.eligible); if (first) setSelectedPoint(first.slug); setStep('collection'); return; }
    if (option.requiresPostcode) { setStep('postcode'); return; }
    if (option.eligible) commit(option);
  }

  async function confirmPostcode() {
    if (!postcode.trim()) { setError('Enter a delivery postcode.'); return; }
    const nextOptions = await loadOptions(postcode, '');
    const option = nextOptions.find((item) => item.id === selectedMethodId);
    if (!option?.eligible) { setError(option?.reason || 'This delivery method is not available for that postcode.'); return; }
    commit(option, null, postcode);
  }

  async function confirmCollection() {
    if (!selectedMethod || !selectedPointData) { setError('Choose an available collection point.'); return; }
    const nextOptions = await loadOptions('', selectedPointData.slug);
    const option = nextOptions.find((item) => item.id === selectedMethod.id);
    const point = option?.collectionPoints.find((item) => item.slug === selectedPointData.slug);
    if (!option?.eligible || !point?.eligible) { setError(point?.reason || option?.reason || 'This collection point is not available.'); return; }
    commit(option, point, '');
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setStep('method'); void loadOptions(); }} className={`hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-[12px] font-black tracking-[-0.01em] transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_rgba(0,0,0,0.06)] md:inline-flex ${compact ? 'max-w-[190px]' : ''}`} style={{ borderColor: BRAND.line, color: BRAND.ink }} title="Choose collection or delivery"><MapPin className="h-4 w-4" style={{ color: BRAND.primary }} /><span className="truncate">{pillLabel}</span></button>
    <AnimatePresence>{open ? <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(15,16,18,0.58)] px-4 py-6 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} className="w-full max-w-[600px] rounded-[24px] border bg-white p-5 shadow-[0_34px_100px_rgba(0,0,0,0.28)] sm:p-6" style={{ borderColor: BRAND.line }}>
      <div className="flex items-start justify-between gap-5"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Order fulfilment</div><h2 className="mt-2 text-[28px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>{step === 'method' ? 'How would you like to receive your prints?' : step === 'collection' ? 'Select a collection point' : 'Check delivery postcode'}</h2><p className="mt-2 text-[13px] leading-6" style={{ color: BRAND.muted }}>{step === 'method' ? 'Prices, cut-offs and capacity come from the live delivery settings.' : step === 'collection' ? 'Only collection points with available capacity are shown.' : 'Availability and price are checked against the configured postcode zone.'}</p></div><button type="button" onClick={close} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" style={{ color: BRAND.muted }} /></button></div>
      {error ? <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] font-bold text-amber-900">{error}</div> : null}
      {step === 'method' ? <div className="mt-6 grid gap-3">{loading ? <div className="rounded-xl border border-dashed p-5 text-center text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Checking live delivery options…</div> : options.length ? options.map((option) => <OptionCard key={option.id} option={option} active={selectedMethodId === option.id} onClick={() => void chooseMethod(option)} />) : <div className="rounded-xl border border-dashed p-5 text-center text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No checkout delivery methods are configured. An administrator can add or seed them in Delivery Settings.</div>}</div> : null}
      {step === 'collection' ? <><div className="mt-6 grid gap-3 sm:grid-cols-2">{points.map((point) => <button key={point.slug} type="button" disabled={!point.eligible} onClick={() => setSelectedPoint(point.slug)} className="rounded-[16px] border bg-white p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: selectedPoint === point.slug ? BRAND.primary : BRAND.line }}><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BRAND.primary }} /><div><div className="text-[13px] font-black" style={{ color: BRAND.ink }}>{point.name}</div>{point.address ? <div className="mt-1 text-[11px] leading-5" style={{ color: BRAND.muted }}>{point.address}</div> : null}<div className="mt-1 text-[11px]" style={{ color: point.eligible ? BRAND.primary : '#b45309' }}>{point.eligible ? `Earliest ${dateLabel(point.earliestDate)}${point.remainingCapacity !== null ? ` · ${point.remainingCapacity} slots left` : ''}` : point.reason}</div></div></div></button>)}</div><div className="mt-6 flex justify-between gap-3"><button type="button" onClick={() => setStep('method')} className="rounded-xl border bg-white px-4 py-2 text-[12px] font-bold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Back</button><button type="button" onClick={() => void confirmCollection()} className="rounded-xl px-5 py-2 text-[12px] font-black text-white" style={{ backgroundColor: BRAND.primary }}>Use this point</button></div></> : null}
      {step === 'postcode' ? <><div className="mt-6 rounded-[18px] border p-4" style={{ borderColor: BRAND.line }}><label className="text-[12px] font-black" style={{ color: BRAND.ink }}>Delivery postcode</label><input value={postcode} onChange={(event) => setPostcode(event.target.value.toUpperCase())} placeholder="e.g. DA14 6NF" className="mt-3 h-12 w-full rounded-[14px] border bg-white px-4 text-[14px] font-semibold outline-none" style={{ borderColor: BRAND.line, color: BRAND.ink }} /></div><div className="mt-6 flex justify-between gap-3"><button type="button" onClick={() => setStep('method')} className="rounded-xl border bg-white px-4 py-2 text-[12px] font-bold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Back</button><button type="button" disabled={loading} onClick={() => void confirmPostcode()} className="rounded-xl px-5 py-2 text-[12px] font-black text-white disabled:opacity-50" style={{ backgroundColor: BRAND.primary }}>{loading ? 'Checking…' : 'Check and use'}</button></div></> : null}
    </motion.div></motion.div> : null}</AnimatePresence>
  </>;
}
