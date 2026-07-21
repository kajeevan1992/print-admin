'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, FileWarning, Loader2, MessageSquareText } from 'lucide-react';

type Proof = {
  id: string;
  orderNumber: string;
  productName: string;
  revisionNumber: number;
  status: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  message: string;
  sentAt: string;
  viewedAt: string;
  decidedAt: string;
  decisionNote: string;
};

function formatBytes(value: number) { const bytes = Number(value || 0); return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function formatDate(value: string) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB'); }
function active(status?: string) { return status === 'sent' || status === 'viewed'; }
function statusTone(status?: string) { if (status === 'approved') return 'border-emerald-300 bg-emerald-50 text-emerald-800'; if (status === 'changes-requested') return 'border-rose-300 bg-rose-50 text-rose-800'; if (status === 'superseded' || status === 'withdrawn') return 'border-slate-300 bg-slate-50 text-slate-600'; return 'border-amber-300 bg-amber-50 text-amber-800'; }

export default function CustomerArtworkProofClient({ tenantSlug, storeSlug, storeBase, token, proofId }: { tenantSlug: string; storeSlug: string; storeBase: string; token?: string; proofId?: string }) {
  const storageKey = `storefront-proof-token:${tenantSlug}:${storeSlug}:${proofId || 'secure-link'}`;
  const [accessToken, setAccessToken] = useState(token || '');
  const [proof, setProof] = useState<Proof | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const saved = token || window.sessionStorage.getItem(storageKey) || '';
    if (token) window.sessionStorage.setItem(storageKey, token);
    setAccessToken(saved);
  }, [storageKey, token]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ tenantSlug, storeSlug });
    if (accessToken) params.set('token', accessToken);
    if (proofId) params.set('proofId', proofId);
    return params.toString();
  }, [tenantSlug, storeSlug, accessToken, proofId]);

  async function load() {
    if (!accessToken && !proofId) { setLoading(false); setError('This proof link is missing or has already expired. Ask the store to resend it.'); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/native-storefront/artwork-proof?${query}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Artwork proof could not be loaded.');
      setProof(payload.data.proof);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Artwork proof could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (accessToken || proofId) void load(); }, [query]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function openFile(download = false) {
    if (!proof) return;
    setWorking(true); setError('');
    try {
      const params = new URLSearchParams({ tenantSlug, storeSlug, proofId: proof.id });
      if (accessToken) params.set('token', accessToken);
      if (download) params.set('download', '1');
      const response = await fetch(`/api/native-storefront/artwork-proof/file?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'Proof file could not be opened.'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      if (download) { const link = document.createElement('a'); link.href = url; link.download = proof.fileName; link.click(); }
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Proof file could not be opened.'); }
    finally { setWorking(false); }
  }

  async function decide(action: 'approve' | 'request-changes') {
    if (!proof || !active(proof.status)) return;
    if (action === 'approve' && !confirmed) { setError('Confirm that you checked the proof before approving it.'); return; }
    if (action === 'request-changes' && note.trim().length < 3) { setError('Tell the artwork team what needs changing.'); return; }
    const question = action === 'approve' ? `Approve proof revision ${proof.revisionNumber} for production?` : `Send this change request for revision ${proof.revisionNumber}?`;
    if (!window.confirm(question)) return;
    setWorking(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/native-storefront/artwork-proof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, proofId: proof.id, token: accessToken, action, note }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Artwork proof decision failed.');
      setProof(payload.data.proof);
      setNotice(action === 'approve' ? 'Proof approved. Production remains subject to payment and the store’s normal checks.' : 'Change request sent. The artwork team will prepare a new revision.');
      window.sessionStorage.removeItem(storageKey);
      setAccessToken('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Artwork proof decision failed.'); }
    finally { setWorking(false); }
  }

  if (loading) return <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-slate-600 shadow-sm"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> Loading artwork proof…</div>;
  if (error && !proof) return <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-8 text-rose-800"><FileWarning className="mb-3 h-8 w-8" /><h1 className="text-xl font-black">Artwork proof unavailable</h1><p className="mt-2 text-sm leading-6">{error}</p><a href={`${storeBase}/login?return=${encodeURIComponent(`${storeBase}/account/artwork`)}`} className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white no-underline">Sign in to your account</a></div>;
  if (!proof) return null;

  return <div className="space-y-5">
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Artwork proof</p><h1 className="mt-2 text-2xl font-black text-slate-950">{proof.orderNumber} · {proof.productName}</h1><p className="mt-2 text-sm text-slate-600">Revision {proof.revisionNumber} · {proof.fileName} · {formatBytes(proof.sizeBytes)}</p></div><span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${statusTone(proof.status)}`}>{proof.status.replace(/-/g, ' ')}</span></div>
      {proof.message ? <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950"><MessageSquareText className="mr-2 inline h-4 w-4" />{proof.message}</div> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Sent<br /><strong className="text-slate-950">{formatDate(proof.sentAt)}</strong></div><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Viewed<br /><strong className="text-slate-950">{formatDate(proof.viewedAt)}</strong></div><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Decision<br /><strong className="text-slate-950">{formatDate(proof.decidedAt)}</strong></div></div>
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={working} onClick={() => void openFile(false)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Eye className="h-4 w-4" /> Open proof</button><button disabled={working} onClick={() => void openFile(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"><Download className="h-4 w-4" /> Download</button></div>
    </div>
    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
    {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div> : null}
    {active(proof.status) ? <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-lg font-black text-slate-950">Your decision</h2><p className="mt-2 text-sm leading-6 text-slate-600">Check spelling, names, contact details, size, layout, images and all content. Approval authorises this revision for production, subject to payment and final production checks.</p><label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />I have opened and checked this exact proof revision.</label><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional approval note, or describe every change required…" className="mt-4 min-h-[120px] w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500" /><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button disabled={working || !confirmed} onClick={() => void decide('approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40"><CheckCircle2 className="h-5 w-5" /> Approve for production</button><button disabled={working || note.trim().length < 3} onClick={() => void decide('request-changes')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-black text-rose-800 disabled:opacity-40"><FileWarning className="h-5 w-5" /> Request changes</button></div></div> : <div className={`rounded-[24px] border p-6 ${statusTone(proof.status)}`}>{proof.status === 'approved' ? <CheckCircle2 className="mb-2 h-7 w-7" /> : <FileWarning className="mb-2 h-7 w-7" />}<h2 className="text-lg font-black">Decision recorded: {proof.status.replace(/-/g, ' ')}</h2>{proof.decisionNote ? <p className="mt-2 text-sm">{proof.decisionNote}</p> : null}</div>}
  </div>;
}
