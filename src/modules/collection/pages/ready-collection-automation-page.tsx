'use client';

import { useState } from 'react';
import { RefreshCw, Send, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type AutomationResult = Record<string, any>;

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Automation request failed.');
  return payload.data || payload;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}

function ResultCard({ result }: { result: any }) {
  const skipped = Boolean(result?.skipped);
  const queued = Boolean(result?.queued?.queued);
  const duplicate = Boolean(result?.queued?.duplicate);
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{result?.orderNumber || result?.orderId || 'Order'}</p><p className="mt-1 text-xs text-textMuted">Status {result?.status || '—'} · {result?.reason || (queued ? 'queued' : duplicate ? 'duplicate' : skipped ? 'skipped' : 'processed')}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs ${queued ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : duplicate ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : skipped ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-white/10 text-textMuted'}`}>{queued ? 'queued' : duplicate ? 'duplicate' : skipped ? 'skipped' : 'processed'}</span></div></div>;
}

export function ReadyCollectionAutomationPage() {
  const [orderId, setOrderId] = useState('');
  const [limit, setLimit] = useState('50');
  const [sendNow, setSendNow] = useState(false);
  const [force, setForce] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);

  async function runOne() {
    if (!orderId.trim()) { setMessage('Enter an order number or ID first.'); return; }
    setBusy(true); setMessage(''); setResult(null);
    try {
      const data = await api('/api/internal/collection/automation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, force, sendNow }) });
      setResult(data);
      setMessage('Single order automation completed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Automation failed.'); }
    finally { setBusy(false); }
  }

  async function runBatch() {
    setBusy(true); setMessage(''); setResult(null);
    try {
      const data = await api('/api/internal/collection/automation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: Number(limit || 50), force, sendNow }) });
      setResult(data);
      setMessage('Batch automation completed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Automation failed.'); }
    finally { setBusy(false); }
  }

  const results = Array.isArray(result?.results) ? result.results : result ? [result] : [];

  return <div>
    <PageHeader title="Ready Collection Automation" subtitle="Queue ready-for-collection emails when collection orders move to quality check, dispatched or delivered. Uses existing orders, collection passes and email outbox." actions={<><Button onClick={() => window.location.reload()}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void runBatch()} disabled={busy}><Zap size={14} /> Run batch</PrimaryButton></>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 md:grid-cols-4"><Stat label="Processed" value={result?.count ?? results.length ?? 0} /><Stat label="Queued" value={result?.queued ?? results.filter((r: any) => r.queued?.queued).length} /><Stat label="Duplicates" value={result?.duplicate ?? results.filter((r: any) => r.queued?.duplicate).length} /><Stat label="Skipped" value={result?.skipped ?? results.filter((r: any) => r.skipped).length} /></div>
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card><h3 className="mb-3 text-sm font-semibold text-white">Run controls</h3><div className="grid gap-3"><Input placeholder="Order number / ID for one order" value={orderId} onChange={(e) => setOrderId(e.target.value)} /><Input placeholder="Batch limit" value={limit} onChange={(e) => setLimit(e.target.value)} /><label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Force re-check already-ready orders</label><label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} /> Send immediately after queueing</label><div className="flex flex-wrap gap-2"><Button onClick={() => void runOne()} disabled={busy}><Send size={14} /> Run one</Button><PrimaryButton onClick={() => void runBatch()} disabled={busy}><Zap size={14} /> Run batch</PrimaryButton></div></div></Card>
      <Card><h3 className="mb-3 text-sm font-semibold text-white">How it works</h3><div className="space-y-2 text-sm text-textMuted"><p>Automatically targets orders with status <b className="text-white">QUALITY_CHECK</b>, <b className="text-white">DISPATCHED</b> or <b className="text-white">DELIVERED</b>.</p><p>Only collection orders are processed. Delivery orders are skipped.</p><p>Duplicate protection comes from Build 62: if a collection-ready email is already queued or sent, another one is not created.</p><p>Immediate sending uses Build 63 email outbox sender. Otherwise the email stays queued for `/email-send-controls`.</p></div></Card>
    </div>
    {result ? <Card className="mt-4"><h3 className="mb-3 text-sm font-semibold text-white">Automation result</h3><div className="grid gap-3">{results.slice(0, 50).map((item: any, index: number) => <ResultCard key={`${item.orderId || item.orderNumber || index}`} result={item} />)}</div><pre className="mt-4 max-h-[320px] overflow-auto rounded-xl bg-black/30 p-3 text-xs text-textMuted">{JSON.stringify(result, null, 2)}</pre></Card> : null}
  </div>;
}
