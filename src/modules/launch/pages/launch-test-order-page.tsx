'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ClipboardCheck, Eye, PackageCheck, Play, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Result = Record<string, any>;

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Launch test request failed.');
  return payload.data || payload;
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return <div className={`rounded-xl border px-3 py-2 text-xs ${ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>{ok ? '✓' : '!'} {label}</div>;
}

export function LaunchTestOrderPage() {
  const [status, setStatus] = useState('QUALITY_CHECK');
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [customerEmail, setCustomerEmail] = useState('launch-test@holoprint.co.uk');
  const [customerName, setCustomerName] = useState('Launch Test Customer');
  const [confirm, setConfirm] = useState('');
  const [generatePass, setGeneratePass] = useState(true);
  const [runAutomation, setRunAutomation] = useState(true);
  const [queueNotification, setQueueNotification] = useState(true);
  const [preview, setPreview] = useState<Result | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const body = { status, productSlug, locationSlug, customerEmail, customerName, generatePass, runAutomation, queueNotification };

  async function loadPreview() {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams(body as any);
      const data = await api(`/api/internal/launch/test-order?${params.toString()}`);
      setPreview(data);
      setMessage('Preview loaded. No order has been created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Preview failed.'); }
    finally { setBusy(false); }
  }

  async function loadHistory() {
    try {
      const data = await api('/api/internal/launch/test-order?list=true');
      setHistory(data);
    } catch {}
  }

  async function createTestOrder() {
    setBusy(true); setMessage(''); setResult(null);
    try {
      const data = await api('/api/internal/launch/test-order/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, confirm }) });
      setResult(data);
      setMessage('Launch test order created. It is marked as BUILD 67 TEST DATA.');
      await loadHistory();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Create failed.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void loadPreview(); void loadHistory(); }, []);

  const validation = result?.validation?.checks || {};

  return <div>
    <PageHeader
      title="Launch Test Order Generator"
      subtitle="Create one controlled Holo Print test order to verify VAT, collection fulfilment, collection pass and ready-notification queueing."
      actions={<><Button onClick={() => void loadPreview()} disabled={busy}><Eye size={14} /> Preview</Button><PrimaryButton onClick={() => void createTestOrder()} disabled={busy || confirm !== 'CREATE_TEST_ORDER'}><Play size={14} /> Create test order</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
      <AlertTriangle className="mr-2 inline h-4 w-4" /> This creates test data only after exact confirmation. Test orders use order number prefix <b>TEST-HOLO-</b> and notes saying <b>BUILD 67 TEST DATA</b>.
    </div>

    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Generator controls</h3>
        <div className="grid gap-3">
          <Input placeholder="Order status" value={status} onChange={(event) => setStatus(event.target.value)} />
          <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
          <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
          <Input placeholder="Customer email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
          <Input placeholder="Customer name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={generatePass} onChange={(event) => setGeneratePass(event.target.checked)} /> Generate collection pass</label>
          <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={runAutomation} onChange={(event) => setRunAutomation(event.target.checked)} /> Run ready-collection automation</label>
          <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={queueNotification} onChange={(event) => setQueueNotification(event.target.checked)} /> Queue notification if automation is not run</label>
          <Input placeholder="Type CREATE_TEST_ORDER to enable creation" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          <div className="flex flex-wrap gap-2"><Button onClick={() => void loadPreview()} disabled={busy}><RefreshCw size={14} /> Preview only</Button><PrimaryButton onClick={() => void createTestOrder()} disabled={busy || confirm !== 'CREATE_TEST_ORDER'}>Create test order</PrimaryButton></div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-white">Expected test flow</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <Check label="Order saved through existing saveOrder()" ok={Boolean(validation.saved)} />
            <Check label="Order marked as BUILD 67 test data" ok={Boolean(validation.testMarked)} />
            <Check label="Collection fulfilment saved" ok={Boolean(validation.collectionSaved)} />
            <Check label="Mixed VAT summary saved" ok={Boolean(validation.mixedVat)} />
            <Check label="Zero VAT line present" ok={Boolean(validation.zeroVatPresent)} />
            <Check label="Standard VAT line present" ok={Boolean(validation.standardVatPresent)} />
          </div>
          {result?.order ? <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted"><p><b className="text-white">Order:</b> {result.order.orderNumber}</p><p><b className="text-white">Status:</b> {result.order.status}</p><p><b className="text-white">Customer:</b> {result.customerEmail}</p>{result.collectionPass?.pass?.pin ? <p><b className="text-white">Collection PIN:</b> {result.collectionPass.pass.pin}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><Link href={`/orders`} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Open Orders</Link><Link href="/collection-handover" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Open Collection Handover</Link><Link href="/email-send-controls" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Open Email Send Controls</Link></div></div> : null}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-white">Preview / result JSON</h3>
          <pre className="max-h-[420px] overflow-auto rounded-xl bg-black/30 p-3 text-xs leading-6 text-textMuted">{JSON.stringify(result || preview || {}, null, 2)}</pre>
        </Card>
      </div>
    </div>

    <Card className="mt-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><ClipboardCheck size={16} /> Recent launch test orders</h3>
      <div className="grid gap-3">{(history?.items || []).slice(0, 8).map((order: any) => <div key={order.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><b className="text-white">{order.orderNumber}</b> · {order.status} · {order.customerEmail} · £{Number(order.total || 0).toFixed(2)}</div>)}{!history?.items?.length ? <p className="text-sm text-textMuted"><PackageCheck className="mr-1 inline h-4 w-4" />No launch test orders yet.</p> : null}</div>
    </Card>
  </div>;
}
