'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CheckCircle2, Clock3, CreditCard, ExternalLink, MapPinned, PackageCheck, RefreshCcw, Search, ShieldCheck, Truck, UploadCloud } from 'lucide-react';

type Step = { key: string; label: string; state: 'done' | 'active' | 'pending' };
type StatusPayload = Record<string, any> & { progress?: Step[] };

function tone(state: string) { if (state === 'done') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'; if (state === 'active') return 'border-sky-400/30 bg-sky-400/10 text-sky-100'; return 'border-white/10 bg-white/[0.04] text-slate-400'; }
function money(value: unknown, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0)); }
function dateLabel(value?: string) { if (!value) return 'Not recorded yet'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date); }
function paymentReady(status?: StatusPayload | null) { return Boolean(status?.order?.paymentReleased || status?.artwork?.paymentReleased || ['paid', 'captured', 'authorized'].includes(String(status?.order?.paymentStatus || '').toLowerCase())); }
function eventTone(action: string) { if (action.includes('approved') || action.includes('delivered') || action.includes('collected') || action.includes('verified')) return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'; if (action.includes('revision') || action.includes('exception')) return 'border-amber-400/25 bg-amber-400/10 text-amber-100'; if (action.includes('sent') || action.includes('dispatch') || action.includes('transit') || action.includes('box')) return 'border-sky-400/25 bg-sky-400/10 text-sky-100'; return 'border-white/10 bg-white/[0.04] text-slate-300'; }
function weightLabel(value: unknown) { const grams = Number(value || 0); if (!grams) return 'Weight pending'; return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`; }

function NextActionCard({ action }: { action: any }) {
  if (!action) return null;
  const isPayment = action.type === 'payment-required';
  const isUpload = action.type === 'upload-artwork';
  const Icon = isPayment ? CreditCard : isUpload ? UploadCloud : ShieldCheck;
  return <section className={`rounded-3xl border p-5 ${action.priority === 'high' ? 'border-amber-400/30 bg-amber-400/10' : 'border-sky-400/20 bg-sky-400/10'}`}>
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/50"><Icon size={20} /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">Next action</p><h2 className="mt-1 text-xl font-black text-white">{action.title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{action.message || 'This action is required before the order can continue.'}</p></div></div>
      {action.href ? <a href={action.href} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"><ExternalLink size={15} /> {action.label}</a> : <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-amber-100">{action.label}</div>}
    </div>
  </section>;
}

function TimelineCard({ title, subtitle, events }: { title: string; subtitle: string; events?: any[] }) {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) return null;
  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center gap-2 text-sky-100"><Clock3 size={18} /><h3 className="font-black">{title}</h3></div>
    <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
    <div className="mt-4 space-y-3">{list.map((event, index) => {
      const action = String(event.action || event.status || event.label || 'update').toLowerCase();
      return <div key={event.id || `${action}-${event.at || event.occurredAt || index}`} className={`rounded-2xl border p-4 ${eventTone(action)}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-black text-white">{event.label || (event.proofVersion ? `Proof update · v${event.proofVersion}` : 'Order update')}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{event.actor === 'customer' ? 'Customer action' : event.source === 'notification' ? 'Customer notification' : event.source === 'packing' ? 'Packing update' : 'Store update'}</p></div><p className="text-xs font-bold text-slate-300">{dateLabel(event.at || event.occurredAt)}</p></div>
        {event.note ? <p className="mt-3 text-sm leading-6 text-slate-300">{event.note}</p> : null}
        {event.productionReleaseState || event.emailStatus ? <div className="mt-3 flex flex-wrap gap-2">{event.productionReleaseState ? <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-bold text-slate-300">Production: {event.productionReleaseState}</span> : null}{event.emailStatus ? <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-bold text-slate-300">Email: {event.emailStatus}</span> : null}</div> : null}
      </div>;
    })}</div>
  </section>;
}

function ShipmentCard({ shipment }: { shipment: any }) {
  if (!shipment) return <InfoCard icon={Truck} title="Dispatch" value="Not ready" text="Dispatch details will appear once packed." />;
  const collection = shipment.fulfilmentMode === 'collection' || shipment.service === 'collection';
  const summary = shipment.packageSummary;
  return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center gap-2 text-sky-100"><Truck size={18} /><h3 className="font-black">{collection ? 'Collection' : 'Shipment'}</h3></div>
    <p className="mt-4 text-xl font-black capitalize">{String(shipment.status || 'ready').replace(/-/g, ' ')}</p>
    <div className="mt-3 space-y-2 text-sm text-slate-400">
      <p>{shipment.carrier || (collection ? 'Store collection' : 'Carrier not set')} · {shipment.service || 'Service not set'}</p>
      {shipment.trackingNumber ? <p>Tracking: <span className="font-bold text-white">{shipment.trackingNumber}</span></p> : null}
      {summary?.totalPackages ? <p>{summary.totalPackages} box(es) · {summary.verifiedPackages} packed and verified</p> : shipment.packageCount ? <p>{shipment.packageCount} package(s)</p> : null}
      {shipment.destination?.town || shipment.destination?.postcode ? <p className="flex items-center gap-2"><MapPinned size={14} /> {[shipment.destination.town, shipment.destination.postcode, shipment.destination.country].filter(Boolean).join(', ')}</p> : null}
      {shipment.dispatchedAt ? <p>Handover: {dateLabel(shipment.dispatchedAt)}</p> : null}
      {shipment.deliveredAt ? <p>Completed: {dateLabel(shipment.deliveredAt)}</p> : null}
    </div>
    {shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"><ExternalLink size={15} /> Open carrier tracking</a> : null}
  </div>;
}

function PackageCards({ shipment }: { shipment: any }) {
  const boxes = Array.isArray(shipment?.packages) ? shipment.packages : [];
  if (!boxes.length) return null;
  const summary = shipment.packageSummary || {};
  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sky-100"><Boxes size={18} /><h3 className="font-black">Your boxes</h3></div><span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">{summary.verifiedPackages || 0} of {summary.totalPackages || boxes.length} verified</span></div>
    <p className="mt-2 text-sm leading-6 text-slate-400">The print team records each packed box separately. Carrier tracking may still use one shipment number unless a box has its own number.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{boxes.map((box: any) => {
      const dimensions = box.dimensionsMm || {};
      const dimensionText = dimensions.length && dimensions.width && dimensions.height ? `${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm` : 'Dimensions pending';
      return <div key={box.id || box.packageNumber} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{box.label || `Box ${box.packageNumber}`}</p><p className="mt-1 text-xs text-slate-400">{weightLabel(box.weightGrams)} · {dimensionText}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${box.scanStatus === 'verified' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>{box.scanStatus === 'verified' ? 'Packed' : 'Preparing'}</span></div>{box.trackingNumber ? <p className="mt-3 text-xs text-slate-300">Box tracking: <span className="font-bold text-white">{box.trackingNumber}</span></p> : null}</div>;
    })}</div>
  </section>;
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId') || params.get('orderNumber') || '';
    if (id) setOrderId(id);
  }, []);

  async function lookup(id = orderId, mail = email) {
    setLoading(true);
    setError('');
    setStatus(null);
    try {
      const params = new URLSearchParams({ orderId: id, email: mail });
      const response = await fetch(`/api/native-storefront/order-status?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Order status failed.');
      setStatus(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Order status failed.');
    } finally {
      setLoading(false);
    }
  }

  const active = useMemo(() => status?.progress?.find((step) => step.state === 'active'), [status]);
  const paid = paymentReady(status);

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl space-y-6">
    <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200">Customer order tracking</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Track your print order</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">See artwork checks, proof approval, production, box packing, dispatch, collection and delivery progress from the same workflow used by the print team.</p></div><div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-100">Live order + shipment status</div></div></section>
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order number or order ID" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2" /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address used on the order" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2" /><button onClick={() => void lookup()} disabled={loading || !orderId.trim() || !email.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{loading ? <RefreshCcw size={16} className="animate-spin" /> : <Search size={16} />} Check status</button></div></section>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18} />{error}</div> : null}
    {status ? <>
      <NextActionCard action={status.nextAction} />
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{status.order?.orderNumber}</p><h2 className="mt-2 text-2xl font-black">{status.message}</h2><p className="mt-2 text-sm text-slate-400">Current stage: {active?.label || status.currentStage}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${paid ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>Payment: {status.order?.paymentStatus || status.artwork?.paymentStatus || 'unpaid'}</span><span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.artwork?.paymentReleased ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>Proof/payment gate: {status.artwork?.paymentReleased ? 'released' : status.artwork?.paymentGate || 'checking'}</span>{status.artwork?.proofVersion ? <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">Proof v{status.artwork.proofVersion}</span> : null}</div></div><div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right"><p className="text-xs text-slate-500">Order total</p><p className="mt-1 text-lg font-black">{money(status.order?.total, status.order?.currency)}</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{(status.progress || []).map((step: Step) => <div key={step.key} className={`rounded-2xl border p-3 ${tone(step.state)}`}><div className="flex items-center gap-2"><CheckCircle2 size={15} /><p className="text-xs font-black uppercase tracking-[0.12em]">{step.state}</p></div><p className="mt-2 text-sm font-bold">{step.label}</p></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-lg font-black">Order items</h3><div className="mt-3 space-y-2">{(status.order?.items || []).map((item: any, index: number) => <div key={`${item.productName}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-bold">{item.productName}</span><span className="text-slate-400">× {item.quantity}</span></div></div>)}</div></div></section>
      <section className="grid gap-4 md:grid-cols-3"><InfoCard icon={ShieldCheck} title="Artwork / Proof" value={status.artwork?.customerProofStatus || status.artwork?.artworkStatus || 'Not started'} text={status.artwork?.blockReason || (status.artwork?.preflightStatus ? `Preflight: ${status.artwork.preflightStatus}` : 'Artwork will update here once uploaded.')} /><InfoCard icon={Clock3} title="Production" value={status.production?.stage || 'Not scheduled'} text={status.production?.blockReason || `Scheduled: ${dateLabel(status.production?.scheduledStartAt)}`} /><ShipmentCard shipment={status.dispatch} /></section>
      <PackageCards shipment={status.dispatch} />
      <TimelineCard title="Proof history" subtitle="Latest proof rounds and customer decisions for this order." events={status.proofEvents} />
      <TimelineCard title="Shipment timeline" subtitle="Packing, box verification, handover, collection and delivery events recorded by the print team." events={status.shipmentEvents || status.dispatch?.events} />
    </> : <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-slate-400"><PackageCheck className="mx-auto mb-3" size={34} /><p>Enter the order number and matching email address to see live artwork, production and dispatch progress.</p></section>}
  </div></main>;
}

function InfoCard({ icon: Icon, title, value, text }: any) { return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2 text-sky-100"><Icon size={18} /><h3 className="font-black">{title}</h3></div><p className="mt-4 text-xl font-black capitalize">{String(value).replace(/-/g, ' ')}</p><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>; }
