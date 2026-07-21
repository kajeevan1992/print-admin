'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, RefreshCw, Send, Upload, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Proof = {
  id: string;
  storeSlug: string;
  ticketId: string;
  orderNumber: string;
  productName: string;
  revisionNumber: number;
  status: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  message: string;
  createdAt: string;
  sentAt: string;
  viewedAt: string;
  decidedAt: string;
  decisionNote: string;
  events?: Array<{ id: string; action: string; actorType?: string; actorLabel: string; note: string; createdAt: string }>;
};

type AdminData = {
  stores: Array<{ slug: string; name: string }>;
  selectedStore: { slug: string; name: string } | null;
  ticket: Record<string, any> | null;
  items: Proof[];
};

function clean(value: unknown) { return String(value || '').trim(); }
function statusTone(status: string) {
  if (status === 'approved') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (['changes-requested', 'withdrawn'].includes(status)) return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (status === 'superseded') return 'border-white/10 bg-white/[0.04] text-textMuted';
  return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
}
function formatBytes(value: number) { const bytes = Number(value || 0); return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function formatDate(value: string) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB'); }

export function ArtworkProofAdminPanel({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [storeSlug, setStoreSlug] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load(requestedStore = storeSlug) {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ ticketId });
      if (requestedStore) query.set('storeSlug', requestedStore);
      const response = await fetch(`/api/internal/artwork-proofs?${query.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Artwork proofs could not load.');
      const next = payload.data as AdminData;
      setData(next);
      const selected = next.selectedStore?.slug || requestedStore || next.stores[0]?.slug || '';
      setStoreSlug(selected);
      setCustomerEmail((current) => current || clean(next.ticket?.customerEmail));
      setCustomerName((current) => current || clean(next.ticket?.customerName));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Artwork proofs could not load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(''); }, [ticketId]);
  const awaiting = useMemo(() => data?.items.find((item) => ['sent', 'viewed'].includes(item.status)) || null, [data]);

  async function uploadRevision() {
    if (!file || !storeSlug) { setError('Choose a storefront and proof file.'); return; }
    setWorking(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('action', 'create-revision'); form.set('ticketId', ticketId); form.set('storeSlug', storeSlug); form.set('file', file);
      form.set('message', message); form.set('customerEmail', customerEmail); form.set('customerName', customerName); form.set('sendEmail', String(sendEmail));
      const response = await fetch('/api/internal/artwork-proofs', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Proof revision could not be created.');
      const queued = Boolean(payload.data?.notificationQueued);
      setNotice(!sendEmail ? 'Proof revision uploaded without an email.' : queued ? 'Proof revision uploaded and the customer notification was queued.' : 'Proof revision uploaded, but the email could not be queued. Use Resend after checking email settings.');
      setFile(null); setMessage('');
      const input = document.getElementById(`proof-file-${ticketId}`) as HTMLInputElement | null; if (input) input.value = '';
      await load(storeSlug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Proof revision could not be created.');
    } finally { setWorking(false); }
  }

  async function action(proof: Proof, name: 'resend' | 'withdraw') {
    if (name === 'withdraw' && !window.confirm(`Withdraw proof revision ${proof.revisionNumber}? The production gate will remain held.`)) return;
    setWorking(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/internal/artwork-proofs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, proofId: proof.id, storeSlug, note: name === 'withdraw' ? 'Withdrawn by artwork team.' : '' }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || `Proof could not be ${name === 'resend' ? 'resent' : 'withdrawn'}.`);
      const queued = Boolean(payload.data?.notificationQueued);
      setNotice(name === 'withdraw' ? 'Proof withdrawn and production gate held.' : queued ? 'A new secure proof link was queued for the customer.' : 'The secure link was rotated, but the email could not be queued. Check email settings and resend again.');
      await load(storeSlug);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Artwork proof action failed.'); }
    finally { setWorking(false); }
  }

  return <Card className="border-cyan-500/20 bg-cyan-500/[0.03]">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-cyan-300" /><h3 className="font-semibold text-white">Customer artwork proofs</h3></div><p className="mt-1 max-w-3xl text-sm text-textMuted">Upload print-ready proof revisions against this existing production ticket. Customer approval releases only the proof gate; payment must also be released before production starts.</p></div>
      <Button disabled={loading || working} onClick={() => void load(storeSlug)}><RefreshCw size={14} /> Refresh</Button>
    </div>
    {error ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
    {notice ? <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
    {loading ? <p className="mt-4 text-sm text-textMuted">Loading proof history…</p> : null}
    {!loading && data ? <>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div><label className="mb-2 block text-xs text-textMuted">Storefront</label><Select value={storeSlug} options={data.stores.map((store) => ({ value: store.slug, label: store.name }))} onChange={(event) => { setStoreSlug(event.target.value); void load(event.target.value); }} /></div>
        <div><label className="mb-2 block text-xs text-textMuted">Customer name</label><Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div>
        <div><label className="mb-2 block text-xs text-textMuted">Customer email</label><Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></div>
        <div><label className="mb-2 block text-xs text-textMuted">Proof file</label><input id={`proof-file-${ticketId}`} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block min-h-11 w-full rounded-xl border border-white/8 bg-panelMuted px-3 py-2 text-xs text-text file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" /></div>
      </div>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message shown to the customer, changes made, or points to check…" className="mt-3 min-h-[90px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-textMuted"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="h-4 w-4 accent-cyan-400" /> Email a secure 14-day approval link</label><PrimaryButton disabled={working || !file || !storeSlug || !customerEmail} onClick={() => void uploadRevision()}><Upload size={14} /> Upload revision {Number(data.items[0]?.revisionNumber || 0) + 1}</PrimaryButton></div>
      {awaiting ? <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">Revision {awaiting.revisionNumber} is awaiting the customer. Uploading another revision will supersede it and invalidate its approval action.</div> : null}
      <div className="mt-5 space-y-3">
        {data.items.map((proof) => <div key={proof.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">Revision {proof.revisionNumber} · {proof.fileName}</p><span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(proof.status)}`}>{proof.status.replace(/-/g, ' ')}</span></div><p className="mt-1 text-xs text-textMuted">{formatBytes(proof.sizeBytes)} · sent {formatDate(proof.sentAt || proof.createdAt)} · viewed {formatDate(proof.viewedAt)} · decided {formatDate(proof.decidedAt)}</p>{proof.message ? <p className="mt-2 text-sm text-textMuted">{proof.message}</p> : null}{proof.decisionNote ? <p className="mt-2 rounded-lg border border-white/8 bg-black/20 p-2 text-sm text-white">Customer note: {proof.decisionNote}</p> : null}</div><div className="flex flex-wrap gap-2"><a href={`/api/internal/artwork-proofs/${encodeURIComponent(proof.id)}/file?storeSlug=${encodeURIComponent(storeSlug)}`} target="_blank" rel="noreferrer"><Button><ExternalLink size={14} /> Open</Button></a>{['sent', 'viewed'].includes(proof.status) ? <Button disabled={working} onClick={() => void action(proof, 'resend')}><Send size={14} /> Resend</Button> : null}{['sent', 'viewed'].includes(proof.status) ? <Button disabled={working} onClick={() => void action(proof, 'withdraw')}><XCircle size={14} /> Withdraw</Button> : null}</div></div>
          {proof.events?.length ? <details className="mt-3"><summary className="cursor-pointer text-xs text-cyan-200">Audit history ({proof.events.length})</summary><div className="mt-2 space-y-2">{proof.events.map((item) => <div key={item.id} className="rounded-lg border border-white/8 bg-black/10 p-2 text-xs text-textMuted"><span className="font-semibold text-white">{item.action.replace(/-/g, ' ')}</span> · {formatDate(item.createdAt)} · {item.actorLabel || item.actorType}{item.note ? <p className="mt-1">{item.note}</p> : null}</div>)}</div></details> : null}
        </div>)}
        {!data.items.length ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-textMuted">No customer proof revisions have been sent for this production ticket.</div> : null}
      </div>
    </> : null}
  </Card>;
}
