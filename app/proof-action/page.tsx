'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCcw } from 'lucide-react';

type Step = { key: string; label: string; state: 'done' | 'active' | 'pending' };
type StatusPayload = Record<string, any> & { progress?: Step[] };

function stepClass(state: string) {
  if (state === 'done') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (state === 'active') return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  return 'border-white/10 bg-white/[0.04] text-slate-400';
}
function text(value: unknown) { return String(value || '').trim(); }
function clean(value: unknown) { return text(value).toLowerCase().replace(/_/g, '-'); }
function dateLabel(value: unknown) {
  const raw = text(value);
  if (!raw) return 'Time not recorded';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}
function eventTitle(event: Record<string, any>) {
  const action = clean(event.action || event.type || event.status);
  const version = event.proofVersion ? ` v${event.proofVersion}` : '';
  if (action.includes('approved')) return `Proof${version} approved`;
  if (action.includes('revision') || action.includes('changes')) return `Changes requested${version}`;
  if (action.includes('sent')) return `Proof${version} sent for review`;
  if (action.includes('email')) return `Proof${version} email update`;
  return `Proof${version} update`;
}
function eventTone(event: Record<string, any>) {
  const action = clean(event.action || event.type || event.status);
  if (action.includes('approved')) return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
  if (action.includes('revision') || action.includes('changes')) return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  if (action.includes('sent')) return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  return 'border-white/10 bg-white/[0.04] text-slate-300';
}
function proofDecisionClosed(status: StatusPayload | null) {
  const proof = status?.artwork || {};
  const proofStatus = clean(proof.customerProofStatus);
  const artworkStatus = clean(proof.artworkStatus);
  const designStatus = clean(proof.designQuoteStatus || proof.designWorkState);
  return ['approved', 'revision-requested'].includes(proofStatus) || ['approved', 'changes-requested', 'design-revision-requested'].includes(artworkStatus) || ['revision-requested', 'proof-revision-requested'].includes(designStatus);
}
function tokenMismatch(status: StatusPayload | null, token: string, version: string) {
  const proof = status?.artwork || {};
  const currentToken = text(proof.proofToken);
  const currentVersion = text(proof.proofVersion);
  if (currentToken && token && currentToken !== token) return true;
  if (currentVersion && version && currentVersion !== version) return true;
  return Boolean(currentToken && !token);
}
function isReadyForDecision(status: StatusPayload | null, token: string, version: string) {
  const proof = status?.artwork || {};
  if (proofDecisionClosed(status) || tokenMismatch(status, token, version)) return false;
  const proofStatus = clean(proof.customerProofStatus);
  const artworkStatus = clean(proof.artworkStatus);
  const preflightStatus = clean(proof.preflightStatus);
  const hasOpenProof = proofStatus === 'pending-customer-approval';
  const proofLooksReady = ['design-proof-ready', 'preflight-pass', 'preflight-warning'].includes(artworkStatus) || ['pass', 'warning'].includes(preflightStatus);
  return hasOpenProof && proofLooksReady;
}
function ProofHistory({ events }: { events: Record<string, any>[] }) {
  if (!Array.isArray(events) || !events.length) return null;
  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Proof history</p><h3 className="mt-1 text-lg font-black text-white">Previous proof rounds</h3></div>
      <p className="text-xs font-semibold text-slate-500">Newest first</p>
    </div>
    <div className="mt-4 space-y-3">
      {events.slice(0, 8).map((event, index) => <div key={`${event.at || event.timestamp || index}-${event.action || event.type || index}`} className={`rounded-2xl border p-4 ${eventTone(event)}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-black text-white">{eventTitle(event)}</p><p className="mt-1 text-xs text-slate-300">{event.message || event.note || event.customerNote || event.status || 'Proof workflow updated.'}</p></div>
          <div className="text-left text-xs font-bold text-slate-400 sm:text-right"><p>{dateLabel(event.at || event.timestamp || event.createdAt)}</p>{event.actor ? <p className="mt-1">{event.actor}</p> : null}</div>
        </div>
        {event.productionReleaseState || event.paymentStatus ? <p className="mt-2 text-xs text-slate-400">{event.productionReleaseState ? `Production: ${event.productionReleaseState}` : ''}{event.productionReleaseState && event.paymentStatus ? ' · ' : ''}{event.paymentStatus ? `Payment: ${event.paymentStatus}` : ''}</p> : null}
      </div>)}
    </div>
  </section>;
}

export default function ProofActionPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [proofToken, setProofToken] = useState('');
  const [proofVersion, setProofVersion] = useState('');
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
    const token = params.get('proofToken') || '';
    const version = params.get('proofVersion') || '';
    setOrderId(id);
    setEmail(mail);
    setProofToken(token);
    setProofVersion(version);
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
    if (!isReadyForDecision(status, proofToken, proofVersion)) {
      setError('This proof link is no longer open for a customer decision. Please use the latest proof email/link or contact the store.');
      return;
    }
    setBusy(decision);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/native-storefront/proof-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email, action: decision, note, proofToken, proofVersion }),
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
  const uploadHref = status?.nextAction?.type === 'upload-artwork' ? status.nextAction.href : status?.artwork?.uploadArtworkUrl;
  const proofPreviewUrl = text(status?.artwork?.designProofUrl || status?.artwork?.proofUrl || status?.artwork?.artworkFileUrl || status?.artwork?.artworkDownloadUrl);
  const readyForDecision = isReadyForDecision(status, proofToken, proofVersion);
  const closedDecision = proofDecisionClosed(status);
  const staleLink = tokenMismatch(status, proofToken, proofVersion);
  const proofEvents = Array.isArray(status?.proofEvents) ? status.proofEvents : [];

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-200">Customer proof decision</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Review your print proof</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Approve the current proof to release your job to production, or request changes before printing.</p></section>
    {loading ? <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-slate-400"><RefreshCcw className="mr-2 h-5 w-5 animate-spin" />Loading proof status…</div> : null}
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    {uploadHref && status?.artwork?.needsReplacementArtwork ? <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">Replacement artwork needed</p><p className="mt-1 text-amber-100/85">Upload the corrected file through the existing artwork upload page so preflight and proofing restart correctly.</p></div><Link href={uploadHref} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950">Upload artwork</Link></div></div> : null}
    {proofPreviewUrl && readyForDecision ? <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">Proof preview ready {status?.artwork?.proofVersion ? `(v${status.artwork.proofVersion})` : ''}</p><p className="mt-1 text-sky-100/85">Open and check this proof carefully before approving for print.</p></div><a href={proofPreviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950">Open proof <ExternalLink size={15}/></a></div></div> : null}
    {status ? <><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{status.order?.orderNumber}</p><h2 className="mt-2 text-2xl font-black">{status.message}</h2><p className="mt-2 text-sm text-slate-400">Artwork: {status.artwork?.artworkStatus || 'not set'} · Proof: {status.artwork?.customerProofStatus || 'pending'}{status.artwork?.proofVersion ? ` · Version: ${status.artwork.proofVersion}` : ''}</p></div><Link href={trackHref} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Track order</Link></div><div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{(status.progress || []).map((step: Step) => <div key={step.key} className={`rounded-2xl border p-3 ${stepClass(step.state)}`}><p className="text-xs font-black uppercase tracking-[0.12em]">{step.state}</p><p className="mt-2 text-sm font-bold">{step.label}</p></div>)}</div></section><ProofHistory events={proofEvents} /><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-lg font-black">Your decision</h3><p className="mt-2 text-sm text-slate-400">Preflight: {status.artwork?.preflightStatus || 'not set'} · Production: {status.production?.stage || 'not scheduled'}</p>{staleLink ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-100">This proof link is not for the current proof version. Please use the latest proof email/link.</div> : null}{closedDecision ? <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">This proof has already received a decision. Please wait for the next proof version or track your order for updates.</div> : null}{!staleLink && !closedDecision && !readyForDecision ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">This proof is not currently ready for approval. It may be missing, blocked, or waiting for a new proof version.</div> : null}<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={!readyForDecision} placeholder="Optional note. For changes, explain exactly what needs changing." className="mt-4 min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-sky-400/30 placeholder:text-slate-500 focus:ring-2 disabled:opacity-50" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => void submit('revision')} disabled={Boolean(busy) || !readyForDecision} className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 disabled:opacity-50">Request changes</button><button onClick={() => void submit('approve')} disabled={Boolean(busy) || !readyForDecision} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">Approve for print</button></div></section></> : null}
  </div></main>;
}