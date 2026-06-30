'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, MapPin, Package, Store, Truck, X } from 'lucide-react';

const STORAGE_KEY = 'holoFulfilmentPreference';
const BRAND = { line: '#E3E8F0', ink: '#161A22', muted: '#667487', primary: '#18A7D0', accent: '#7B3FE4' };

const METHODS = [
  { id: 'collection', label: 'Collection', pill: 'Select store', description: 'Collect your order from Holo Print or an available collection point.', icon: Store },
  { id: 'same-day-delivery', label: 'Same Day London Delivery', pill: 'London delivery', description: 'Fast courier delivery for eligible London postcodes and approved artwork.', icon: Truck },
  { id: 'shipping', label: 'UK Delivery / Shipping', pill: 'Print & ship', description: 'Standard delivery across the UK for approved print orders.', icon: Package },
] as const;

const COLLECTION_POINTS = [
  { id: 'sidcup', label: 'Holo Print Sidcup', hint: 'Main production and collection store', address: 'Sidcup High Street' },
  { id: 'bromley', label: 'Bromley Collection Point', hint: 'Partner collection point', address: 'Coming soon' },
  { id: 'lewisham', label: 'Lewisham Collection Point', hint: 'Partner collection point', address: 'Coming soon' },
  { id: 'wimbledon', label: 'Wimbledon Collection Point', hint: 'Partner collection point', address: 'Coming soon' },
  { id: 'kingston', label: 'Kingston Collection Point', hint: 'Partner collection point', address: 'Coming soon' },
  { id: 'central-london', label: 'Central London Collection', hint: 'Partner collection point', address: 'Coming soon' },
] as const;

type Preference = { method?: string; methodLabel?: string; collectionPointId?: string | null; collectionPointLabel?: string | null; postcode?: string | null; updatedAt?: string } | null;

function safeReadPreference(): Preference {
  if (typeof window === 'undefined') return null;
  try { const raw = window.localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function savePreference(preference: Preference) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  window.dispatchEvent(new CustomEvent('holo:fulfilment-changed', { detail: preference }));
}

function OptionCard({ active, icon: Icon, title, body, onClick, children }: any) {
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-4 rounded-[18px] border bg-white px-4 py-4 text-left transition hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(0,0,0,0.06)]" style={{ borderColor: active ? BRAND.primary : BRAND.line, background: active ? '#F0FBFE' : 'white' }}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: active ? 'rgba(24,167,208,0.14)' : '#F4F7FA', color: BRAND.primary }}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-black tracking-[-0.02em]" style={{ color: BRAND.ink }}>{title}</span><span className="mt-1 block text-[12px] leading-5" style={{ color: BRAND.muted }}>{body}</span>{children}</span>{active ? <Check className="h-5 w-5 shrink-0" style={{ color: BRAND.primary }} /> : <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />}</button>;
}

export default function FulfillmentSelector({ compact = false, forceOpen = false, onClose }: { compact?: boolean; forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'method' | 'collection' | 'same-day-delivery'>('method');
  const [selectedMethod, setSelectedMethod] = useState('collection');
  const [selectedPoint, setSelectedPoint] = useState('sidcup');
  const [postcode, setPostcode] = useState('');
  const [preference, setPreference] = useState<Preference>(null);

  useEffect(() => { const saved = safeReadPreference(); if (saved) { setPreference(saved); if (saved.method) setSelectedMethod(saved.method); if (saved.collectionPointId) setSelectedPoint(saved.collectionPointId); if (saved.postcode) setPostcode(saved.postcode); } const onChange = (event: any) => setPreference(event.detail || safeReadPreference()); window.addEventListener('holo:fulfilment-changed', onChange); return () => window.removeEventListener('holo:fulfilment-changed', onChange); }, []);
  useEffect(() => { if (forceOpen) { setOpen(true); setStep('method'); } }, [forceOpen]);

  const method = useMemo(() => METHODS.find((item) => item.id === (preference?.method || selectedMethod)) || METHODS[0], [preference, selectedMethod]);
  const point = useMemo(() => COLLECTION_POINTS.find((item) => item.id === (preference?.collectionPointId || selectedPoint)) || COLLECTION_POINTS[0], [preference, selectedPoint]);
  const pillLabel = preference?.method === 'collection' ? point.label.replace('Holo Print ', '') : preference?.method === 'same-day-delivery' ? 'London delivery' : preference?.method === 'shipping' ? 'Print & ship' : 'Select store';
  const close = () => { setOpen(false); setStep('method'); onClose?.(); };

  const commitPreference = (override: any = {}) => {
    const finalMethod = override.method || selectedMethod;
    const collectionPoint = COLLECTION_POINTS.find((item) => item.id === (override.collectionPointId || selectedPoint)) || COLLECTION_POINTS[0];
    const methodMeta = METHODS.find((item) => item.id === finalMethod) || METHODS[0];
    const next = { method: finalMethod, methodLabel: methodMeta.label, collectionPointId: finalMethod === 'collection' ? collectionPoint.id : null, collectionPointLabel: finalMethod === 'collection' ? collectionPoint.label : null, postcode: finalMethod === 'same-day-delivery' ? (override.postcode ?? postcode).trim() : null, updatedAt: new Date().toISOString() };
    setPreference(next); savePreference(next); close();
  };

  const chooseMethod = (id: string) => { setSelectedMethod(id); if (id === 'collection') setStep('collection'); else if (id === 'same-day-delivery') setStep('same-day-delivery'); else commitPreference({ method: 'shipping' }); };

  return <><button type="button" onClick={() => { setOpen(true); setStep('method'); }} className={`hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-[12px] font-black tracking-[-0.01em] transition hover:-translate-y-[1px] hover:shadow-[0_10px_22px_rgba(0,0,0,0.06)] md:inline-flex ${compact ? 'max-w-[150px]' : ''}`} style={{ borderColor: BRAND.line, color: BRAND.ink }} title="Choose collection or delivery"><MapPin className="h-4 w-4" style={{ color: BRAND.primary }} /><span className="truncate">{pillLabel}</span></button><AnimatePresence>{open ? <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(15,16,18,0.58)] px-4 py-6 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.18 }} className="w-full max-w-[560px] rounded-[24px] border bg-white p-5 shadow-[0_34px_100px_rgba(0,0,0,0.28)] sm:p-6" style={{ borderColor: BRAND.line }}><div className="flex items-start justify-between gap-5"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Order fulfilment</div><h2 className="mt-2 text-[28px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>{step === 'method' ? 'How would you like to receive your prints?' : step === 'collection' ? 'Select a collection store' : 'Same day London delivery'}</h2><p className="mt-2 text-[13px] leading-6" style={{ color: BRAND.muted }}>{step === 'method' ? 'Choose collection, London courier delivery or UK shipping. We will reuse this in checkout later.' : step === 'collection' ? 'Choose which store or collection point you would like to collect from.' : 'Enter your postcode so the order can be checked for same-day courier availability.'}</p></div><button type="button" onClick={close} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" style={{ color: BRAND.muted }} /></button></div>{step === 'method' ? <div className="mt-6 grid gap-3">{METHODS.map((item) => <OptionCard key={item.id} active={method.id === item.id} icon={item.icon} title={item.label} body={item.description} onClick={() => chooseMethod(item.id)} />)}</div> : null}{step === 'collection' ? <><div className="mt-6 grid gap-3 sm:grid-cols-2">{COLLECTION_POINTS.map((item) => <button key={item.id} type="button" onClick={() => setSelectedPoint(item.id)} className="rounded-[16px] border bg-white p-4 text-left transition hover:-translate-y-[1px] hover:shadow-[0_12px_26px_rgba(0,0,0,0.05)]" style={{ borderColor: selectedPoint === item.id ? BRAND.primary : BRAND.line, background: selectedPoint === item.id ? '#F0FBFE' : 'white' }}><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BRAND.primary }} /><div><div className="text-[13px] font-black" style={{ color: BRAND.ink }}>{item.label}</div><div className="mt-1 text-[11px] leading-5" style={{ color: BRAND.muted }}>{item.hint}</div><div className="mt-1 text-[11px] leading-5" style={{ color: BRAND.muted }}>{item.address}</div></div></div></button>)}</div><div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => setStep('method')} className="rounded-xl border bg-white px-4 py-2 text-[12px] font-bold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Back</button><button type="button" onClick={() => commitPreference({ method: 'collection' })} className="rounded-xl px-5 py-2 text-[12px] font-black text-white" style={{ backgroundColor: BRAND.primary }}>Done</button></div></> : null}{step === 'same-day-delivery' ? <><div className="mt-6 rounded-[18px] border bg-[#F7FCFE] p-4" style={{ borderColor: BRAND.line }}><label className="text-[12px] font-black" style={{ color: BRAND.ink }}>Delivery postcode</label><input value={postcode} onChange={(event) => setPostcode(event.target.value.toUpperCase())} placeholder="e.g. DA14, BR1, SE9" className="mt-3 h-12 w-full rounded-[14px] border bg-white px-4 text-[14px] font-semibold outline-none" style={{ borderColor: BRAND.line, color: BRAND.ink }} /><p className="mt-3 text-[12px] leading-6" style={{ color: BRAND.muted }}>Same-day delivery still depends on artwork approval, order time, production capacity and courier availability.</p></div><div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => setStep('method')} className="rounded-xl border bg-white px-4 py-2 text-[12px] font-bold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Back</button><button type="button" onClick={() => commitPreference({ method: 'same-day-delivery', postcode })} className="rounded-xl px-5 py-2 text-[12px] font-black text-white" style={{ backgroundColor: BRAND.primary }}>Done</button></div></> : null}</motion.div></motion.div> : null}</AnimatePresence></>;
}
