'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Palette, Search } from 'lucide-react';

type OrderState = { id?: string; orderNumber?: string; customerName?: string; customerEmail?: string; paymentStatus?: string };
function text(value: unknown) { return String(value || '').trim(); }

export default function DesignBriefPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderState | null>(null);
  const [existingBriefs, setExistingBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = text(params.get('orderId') || params.get('orderNumber'));
    const mail = text(params.get('email'));
    if (id) setOrderId(id);
    if (mail) setEmail(mail);
    if (id) void lookup(id, mail);
  }, []);

  async function lookup(id = orderId, mail = email) {
    setLoading(true); setError(''); setSuccess('');
    try {
      const params = new URLSearchParams({ orderId: id });
      if (mail) params.set('email', mail);
      const response = await fetch(`/api/native-storefront/design-brief?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not load order.');
      setOrder(payload.order || null);
      setExistingBriefs(Array.isArray(payload.briefs) ? payload.briefs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order.');
    } finally { setLoading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(''); setSuccess('');
    try {
      const form = new FormData(event.currentTarget);
      form.set('orderId', orderId);
      if (email) form.set('email', email);
      const response = await fetch('/api/native-storefront/design-brief', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not submit design brief.');
      setSuccess(payload.message || 'Design brief received.');
      setExistingBriefs((current) => [payload.brief, ...current.filter(Boolean)]);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit design brief.');
    } finally { setSubmitting(false); }
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl space-y-6"><section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.25em] text-sky-200">Design help</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Complete your design brief</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Tell our design team what you need. Your print order can stay paid/held while staff review the brief and confirm any extra design charge before design starts.</p></div><div className="grid h-14 w-14 place-items-center rounded-3xl border border-sky-400/25 bg-sky-400/10 text-sky-100"><Palette size={24}/></div></div></section>

    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order number or order ID" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email optional" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" /><button onClick={() => void lookup()} disabled={loading || !orderId.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>} Find order</button></div></section>

    {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {success ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{success}</div> : null}

    {order ? <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2 text-sky-100"><ClipboardList size={18}/><h2 className="font-black">Order</h2></div><div className="mt-4 space-y-3 text-sm"><p><span className="text-slate-500">Order:</span> <span className="font-black">{order.orderNumber || order.id}</span></p><p><span className="text-slate-500">Customer:</span> {order.customerName || 'Customer'}</p><p><span className="text-slate-500">Payment:</span> {order.paymentStatus || 'checking'}</p></div>{existingBriefs.length ? <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><p className="font-black">Design brief already submitted</p><p className="mt-1 text-emerald-100/80">You can submit another update if anything has changed.</p></div> : null}<a href={`/track-order?orderId=${encodeURIComponent(order.orderNumber || order.id || orderId)}${email ? `&email=${encodeURIComponent(email)}` : ''}`} className="mt-5 inline-flex w-full justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">Back to Track Order</a></aside>
      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-300">Design type<select name="designType" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option>Simple text/layout setup</option><option>Business card design</option><option>Flyer / leaflet design</option><option>Poster design</option><option>Menu design</option><option>Logo / brand support</option><option>Other</option></select></label><label className="text-sm font-bold text-slate-300">Logo/assets available?<select name="logoStatus" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option>I have logo/assets</option><option>I need you to create/find assets</option><option>I only have rough ideas</option><option>Not sure</option></select></label></div><label className="mt-4 block text-sm font-bold text-slate-300">What do you need designed?<textarea required name="designGoal" placeholder="Example: A clean A5 flyer for my takeaway offer, red/black theme, include halal logo, phone number and QR code." className="mt-2 min-h-[130px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /></label><label className="mt-4 block text-sm font-bold text-slate-300">Text/content to include<textarea name="suppliedText" placeholder="Paste exact wording, prices, contact details, address, offer details etc." className="mt-2 min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><input name="brandColours" placeholder="Brand colours / style" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /><input name="deadline" placeholder="Deadline / event date" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /><input name="budgetExpectation" placeholder="Budget expectation for design, if any" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /><input name="inspiration" placeholder="Reference link / design inspiration" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><textarea name="mustInclude" placeholder="Must include" className="min-h-[90px] rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /><textarea name="avoid" placeholder="Avoid / do not use" className="min-h-[90px] rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500" /></div><div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Submitting this brief does not automatically include design cost. Staff will review the work needed and confirm any extra design charge before starting.</div><button disabled={submitting} className="mt-5 w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{submitting ? 'Submitting brief…' : 'Submit design brief'}</button></form></section> : <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-slate-400">Enter your order number to submit a design brief.</section>}
  </div></main>;
}
