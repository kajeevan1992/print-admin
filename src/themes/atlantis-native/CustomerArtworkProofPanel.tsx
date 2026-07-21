'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, FileWarning, RefreshCw } from 'lucide-react';

type Proof = { id: string; orderNumber: string; productName: string; revisionNumber: number; status: string; fileName: string; sentAt: string; decidedAt: string; decisionNote: string };
function date(value: string) { if (!value) return '—'; const item = new Date(value); return Number.isNaN(item.getTime()) ? '—' : item.toLocaleDateString('en-GB'); }
function tone(status: string) { if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800'; if (status === 'changes-requested') return 'border-rose-200 bg-rose-50 text-rose-800'; if (['withdrawn', 'superseded'].includes(status)) return 'border-slate-200 bg-slate-50 text-slate-600'; return 'border-amber-200 bg-amber-50 text-amber-800'; }

export default function CustomerArtworkProofPanel({ tenantSlug, storeSlug, storeBase }: { tenantSlug: string; storeSlug: string; storeBase: string }) {
  const [items, setItems] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ tenantSlug, storeSlug });
      const response = await fetch(`/api/native-storefront/artwork-proof?${query.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Artwork proof history could not load.');
      setItems(payload.data.items || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Artwork proof history could not load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [tenantSlug, storeSlug]);
  return <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-cyan-600" /><h2 className="font-black text-slate-950">Customer proof approvals</h2></div><p className="mt-1 text-sm text-slate-600">Review every proof revision sent by the artwork team and see the decision history.</p></div><button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-300 p-2 text-slate-700 disabled:opacity-50" aria-label="Refresh proof history"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
    <div className="mt-5 space-y-3">{items.map((proof) => <a key={proof.id} href={`${storeBase}/artwork-proof?proof=${encodeURIComponent(proof.id)}`} className="block rounded-2xl border border-slate-200 p-4 text-slate-900 no-underline transition hover:border-cyan-400 hover:shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">{proof.orderNumber} · {proof.productName}</p><p className="mt-1 text-sm text-slate-600">Revision {proof.revisionNumber} · {proof.fileName}</p><p className="mt-1 text-xs text-slate-500">Sent {date(proof.sentAt)} · Decision {date(proof.decidedAt)}</p>{proof.decisionNote ? <p className="mt-2 text-sm text-slate-700">{proof.decisionNote}</p> : null}</div><span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${tone(proof.status)}`}>{proof.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : proof.status === 'changes-requested' ? <FileWarning className="h-3 w-3" /> : null}{proof.status.replace(/-/g, ' ')}</span></div></a>)}{!loading && !items.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No artwork proof revisions have been sent to this account yet.</div> : null}{loading ? <div className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-600">Loading proof history…</div> : null}</div>
  </section>;
}
