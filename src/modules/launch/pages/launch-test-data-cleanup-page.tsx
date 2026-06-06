'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CleanupPreview = { summary?: Record<string, number>; orders?: any[]; collectionPasses?: any[]; emailOutbox?: any[]; confirmationRequired?: string };

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Cleanup request failed.');
  return payload.data || payload;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}

export function LaunchTestDataCleanupPage() {
  const [preview, setPreview] = useState<CleanupPreview>({});
  const [result, setResult] = useState<any>(null);
  const [confirm, setConfirm] = useState('');
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includePasses, setIncludePasses] = useState(true);
  const [includeEmails, setIncludeEmails] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setMessage('');
    try {
      const data = await api('/api/internal/launch/test-data-cleanup');
      setPreview(data);
      setMessage('Preview loaded. No cleanup has run.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Preview failed.'); }
    finally { setBusy(false); }
  }

  async function runCleanup() {
    setBusy(true); setMessage(''); setResult(null);
    try {
      const data = await api('/api/internal/launch/test-data-cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm, includeOrders, includePasses, includeEmails }) });
      setResult(data);
      setPreview({ summary: data.after, orders: [], collectionPasses: [], emailOutbox: [], confirmationRequired: 'DELETE_TEST_DATA' });
      setMessage('Cleanup completed. Only Build 67 test data was targeted.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Cleanup failed.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);

  const summary = preview.summary || {};
  const canRun = confirm === 'DELETE_TEST_DATA';

  return <div>
    <PageHeader title="Launch Test Data Cleanup" subtitle="Preview and remove only TEST-HOLO / BUILD 67 launch test data. Real customer orders are not targeted." actions={<><Button onClick={() => void load()} disabled={busy}><RefreshCw size={14} /> Refresh preview</Button><PrimaryButton onClick={() => void runCleanup()} disabled={busy || !canRun}><Trash2 size={14} /> Run cleanup</PrimaryButton></>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> This tool only targets records marked by Build 67. Type <b>DELETE_TEST_DATA</b> to enable cleanup.</div>
    <div className="mb-4 grid gap-4 md:grid-cols-4"><Metric label="Orders" value={summary.orders || 0} /><Metric label="Order items" value={summary.orderItems || 0} /><Metric label="Passes" value={summary.collectionPasses || 0} /><Metric label="Outbox emails" value={summary.emailOutbox || 0} /></div>
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card><h3 className="mb-3 text-sm font-semibold text-white">Cleanup controls</h3><div className="grid gap-3"><label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={includeOrders} onChange={(e) => setIncludeOrders(e.target.checked)} /> Include test orders</label><label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={includePasses} onChange={(e) => setIncludePasses(e.target.checked)} /> Include collection passes</label><label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={includeEmails} onChange={(e) => setIncludeEmails(e.target.checked)} /> Include related outbox emails</label><Input placeholder="Type DELETE_TEST_DATA" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><div className="flex flex-wrap gap-2"><Button onClick={() => void load()} disabled={busy}>Preview only</Button><PrimaryButton onClick={() => void runCleanup()} disabled={busy || !canRun}>Run cleanup</PrimaryButton></div></div></Card>
      <Card><h3 className="mb-3 text-sm font-semibold text-white">Safety rules</h3><div className="space-y-2 text-sm leading-6 text-textMuted"><p><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-300" /> Orders must start with <b className="text-white">TEST-HOLO-</b> or include the Build 67 marker.</p><p>Collection pass cleanup only targets passes linked to those test order IDs/numbers.</p><p>Email cleanup only targets outbox records linked to those test orders or Build 67 metadata.</p><p>Use <Link href="/launch-test-order" className="text-sky-200">Launch Test Order</Link> to create fresh test data again.</p></div>{result ? <pre className="mt-4 max-h-[260px] overflow-auto rounded-xl bg-black/30 p-3 text-xs text-textMuted">{JSON.stringify(result, null, 2)}</pre> : null}</Card>
    </div>
    <Card className="mt-4"><h3 className="mb-3 text-sm font-semibold text-white">Preview records</h3><div className="grid gap-3">{(preview.orders || []).map((order: any) => <div key={order.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><b className="text-white">{order.orderNumber}</b> · {order.status} · {order.customerEmail || 'test customer'} · {new Date(order.createdAt).toLocaleString()}</div>)}{!(preview.orders || []).length ? <p className="text-sm text-textMuted">No Build 67 test orders found.</p> : null}</div></Card>
  </div>;
}
