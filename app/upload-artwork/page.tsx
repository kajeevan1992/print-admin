'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, RefreshCcw, UploadCloud } from 'lucide-react';

export default function UploadArtworkPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('orderId') || params.get('orderNumber') || '');
    setEmail(params.get('email') || '');
  }, []);

  async function submit() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!orderId.trim()) throw new Error('Order number is required.');
      if (!file) throw new Error('Please choose an artwork file.');
      const form = new FormData();
      form.set('orderId', orderId);
      form.set('email', email);
      form.set('note', note);
      form.set('file', file, file.name);
      const res = await fetch('/api/native-storefront/artwork-revision', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Artwork upload failed.');
      setMessage(json.data?.message || 'Artwork uploaded and sent back to proof review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artwork upload failed.');
    } finally {
      setBusy(false);
    }
  }

  const trackHref = orderId ? `/track-order?orderId=${encodeURIComponent(orderId)}${email ? `&email=${encodeURIComponent(email)}` : ''}` : '/track-order';

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl space-y-6"><section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200">Artwork upload</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Upload replacement artwork</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Send updated artwork for your order. It will be checked before production continues.</p></section>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}<Link href={trackHref} className="ml-auto rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950">Track order</Link></div> : null}
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="grid gap-4"><input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Order number" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2" /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address optional" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2" /><input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-black file:text-slate-950" /><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the artwork team" className="min-h-[120px] rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2" /><button onClick={() => void submit()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? <RefreshCcw size={16} className="animate-spin" /> : <UploadCloud size={16} />} Upload artwork</button></div></section>
  </div></main>;
}
