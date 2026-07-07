'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';

type Step = { key: string; label: string; state: 'done' | 'active' | 'pending' };
type StatusPayload = Record<string, any> & { progress?: Step[] };

function tone(state: string) { if (state === 'done') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'; if (state === 'active') return 'border-sky-400/30 bg-sky-400/10 text-sky-100'; return 'border-white/10 bg-white/[0.04] text-slate-400'; }
function money(value: unknown, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0)); }
function dateLabel(value?: string) { if (!value) return 'Not scheduled yet'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date); }

export default function NativeCheckoutSuccessPage() {
  const [orderId, setOrderId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId') || params.get('orderNumber') || '';
    const session = params.get('session_id') || '';
    setOrderId(id);
    setSessionId(session);
    if (!id) { setError('Order reference is missing from the checkout confirmation link.'); setLoading(false); return; }
    void loadStatus(id);
  }, []);

  async function loadStatus(id = orderId) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ orderId: id });
      const res = await fetch(`/api/native-storefront/order-status?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Could not load order status.');
      setStatus(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order status.');
    } finally {
      setLoading(false);
    }
  }

  const active = useMemo(() => status?.progress?.find((step) => step.state === 'active'), [status]);
  const trackHref = orderId ? `/track-order?orderId=${encodeURIComponent(orderId)}` : '/track-order';

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl space-y-6"><section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-200">Checkout complete</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Thank you — your order is received</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">We have created your order and connected it to the artwork, proofing, production, planner, and dispatch workflow.</p></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{status?.order?.orderNumber || orderId || 'Order received'}</div></div></section>
    {loading ? <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-slate-400"><RefreshCcw className="mr-2 h-5 w-5 animate-spin" />Loading live order status…</div> : null}
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"><AlertTriangle size={18}/>{error}<Link className="ml-auto rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950" href="/track-order">Track manually</Link></div> : null}
    {status ? <><section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{status.order?.orderNumber}</p><h2 className="mt-2 text-2xl font-black">{status.message}</h2><p className="mt-2 text-sm text-slate-400">Current stage: {active?.label || status.currentStage}</p>{sessionId ? <p className="mt-2 text-xs text-slate-500">Stripe session recorded.</p> : null}</div><div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right"><p className="text-xs text-slate-500">Order total</p><p className="mt-1 text-lg font-black">{money(status.order?.total, status.order?.currency)}</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{(status.progress || []).map((step: Step) => <div key={step.key} className={`rounded-2xl border p-3 ${tone(step.state)}`}><div className="flex items-center gap-2"><CheckCircle2 size={15}/><p className="text-xs font-black uppercase tracking-[0.12em]">{step.state}</p></div><p className="mt-2 text-sm font-bold">{step.label}</p></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-lg font-black">Next steps</h3><div className="mt-3 space-y-3 text-sm text-slate-400"><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><span className="font-bold text-white">Save your tracking link</span><p className="mt-1">Use the button below to check artwork, proofing, production and dispatch progress any time.</p></div><Link href={trackHref} className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Open full tracking page</Link></div></div></section><section className="grid gap-4 md:grid-cols-3"><InfoCard icon={ShieldCheck} title="Artwork / Proof" value={status.artwork?.customerProofStatus || status.artwork?.artworkStatus || 'Not started'} text={status.artwork?.preflightStatus ? `Preflight: ${status.artwork.preflightStatus}` : 'Artwork will update here once uploaded.'} /><InfoCard icon={Clock3} title="Production" value={status.production?.stage || 'Not scheduled'} text={status.production?.blockReason || `Scheduled: ${dateLabel(status.production?.scheduledStartAt)}`} /><InfoCard icon={Truck} title="Dispatch" value={status.dispatch?.stage || 'Not ready'} text={status.dispatch?.trackingNumber ? `Tracking: ${status.dispatch.trackingNumber}` : 'Dispatch details will appear once packed.'} /></section></> : !loading && !error ? <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-slate-400"><PackageCheck className="mx-auto mb-3" size={34}/><p>Your order was created. Use the tracking page to search manually.</p><Link className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950" href="/track-order">Track order</Link></section> : null}
  </div></main>;
}
function InfoCard({ icon: Icon, title, value, text }: any) { return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2 text-emerald-100"><Icon size={18}/><h3 className="font-black">{title}</h3></div><p className="mt-4 text-xl font-black">{value}</p><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>; }
