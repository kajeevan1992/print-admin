'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';

type Step = { key: string; label: string; state: 'done' | 'active' | 'pending' };
type StatusPayload = Record<string, any> & { progress?: Step[] };

function stepClass(state: string) {
  if (state === 'done') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (state === 'active') return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  return 'border-white/10 bg-white/[0.04] text-slate-400';
}
function isReadyForDecision(status: StatusPayload | null) {
  const proof = status?.artwork || {};
  return proof.customerProofStatus === 'pending-customer-approval' || proof.preflightStatus === 'pass' || proof.preflightStatus === 'warning' || proof.artworkStatus === 'preflight-pass' || proof.customerProofStatus === 'approved';
}

export default function ProofActionPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId') || params.get('orderNumber') || '';
    const mail = params.get('email') || '';
    setOrderId(id);
    setEmail(mail);
    if (id) void loadStatus(id, mail);
    else { setError('Order reference is missing.'); setLoading(false); }
  }, []);

  async function loadStatus(id = orderId, mail = email) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ orderId: id });
      if (mail) params.set('email', mail);
      const res = await fetch(`/api/native-storefront/order-status?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Could not load proof status.');
      setStatus(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load proof status.');
    } finally {
      setLoading(false);
    }
  }

  async function submit(decision: 'approve' | 'revision') {
    setBusy(decision);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/native-storefront/proof-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email, action: decision, note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Proof response failed.');
      setMessage(json.result?.message || (decision === 'approve' ? 'Proof approved for print.' : 'Revision request received.'));
      if (json.data?.status) setStatus(json.data.status);
      else await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proof response failed.');
    } finally {
      setBusy('');
    }
  }

  const trackHref = orderId ? `/track-order?orderId=${encodeURIComponent(orderId)}${email ? `&email=${encodeURIComponent(email)}` : ''}` : '/track-order';

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200">Customer proof decision</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Review your print proof</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Approve the proof to release your job to production, or request changes before printing.</p></section>
    {loading ? <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-slate-400"><RefreshCcw className="mr-2 h-5 w-5 animate-spin" />Loading proof status…</div> : null}
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    {status ? <><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{status.order?.orderNumber}</p><h2 className="mt-2 text-2xl font-black">{status.message}</h2><p className="mt-2 text-sm text-slate-400">Artwork: {status.artwork?.artworkStatus || 'not set'} · Proof: {status.artwork?.customerProofStatus || 'pending'}</p></div><Link href={trackHref} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Track order</Link></div><div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{(status.progress || []).map((step: Step) => <div key={step.key} className={`rounded-2xl border p-3 ${stepClass(step.state)}`}><p className="text-xs font-black uppercase tracking-[0.12em]">{step.state}</p><p className="mt-2 text-sm font-bold">{step.label}</p></div>)}</div></section><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-lg font-black">Your decision</h3><p className="mt-2 text-sm text-slate-400">Preflight: {status.artwork?.preflightStatus || 'not set'} · Production: {status.production?.stage || 'not scheduled'}</p>{!isReadyForDecision(status) ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">This proof is not currently ready for approval. It may be missing, blocked, or failed preflight.</div> : null}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note. For changes, explain exactly what needs changing." className="mt-4 min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => void submit('revision')} disabled={Boolean(busy)} className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 disabled:opacity-50">Request changes</button><button onClick={() => void submit('approve')} disabled={Boolean(busy) || !isReadyForDecision(status)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">Approve for print</button></div></section></> : null}
  </div></main>;
}
