'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Mail, PackageCheck, Search, Send, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Pass = { id: string; token: string; pin: string; status: string; orderNumber: string; orderId?: string; customerName: string; customerEmail: string; locationLabel: string; locationAddress: string; pickupInstructions: string; qrUrl: string; collectedAt?: string; verificationCount?: number };
type Summary = { total: number; ready: number; notReady: number; collected: number; cancelled: number };
type NotificationItem = { id: string; status: string; to: string; subject: string; orderId: string; createdAt: string; sentAt?: string; attempts?: number; metadata?: any };

function tone(status = '') {
  if (status === 'sent' || status === 'collected') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'queued' || status === 'ready') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  if (status === 'failed' || status === 'cancelled') return 'border-red-500/30 bg-red-500/10 text-red-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Collection request failed.');
  return payload.data || payload;
}

export function CollectionHandoverPage() {
  const [items, setItems] = useState<Pass[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifySummary, setNotifySummary] = useState({ total: 0, queued: 0, sent: 0, failed: 0 });
  const [summary, setSummary] = useState<Summary>({ total: 0, ready: 0, notReady: 0, collected: 0, cancelled: 0 });
  const [query, setQuery] = useState('');
  const [pin, setPin] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState<Pass | null>(null);
  const [preview, setPreview] = useState<any>(null);

  async function load() {
    const params = new URLSearchParams({ search: query });
    const [passData, notifyData] = await Promise.all([
      api(`/api/internal/collection/passes?${params.toString()}`),
      api(`/api/internal/collection/notifications?${params.toString()}`),
    ]);
    setItems(passData.items || []);
    setSummary(passData.summary || summary);
    setNotifications(notifyData.items || []);
    setNotifySummary(notifyData.summary || notifySummary);
  }

  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);

  async function verify(markCollected = false) {
    setMessage('');
    try {
      const data = await api('/api/internal/collection/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, token: pin, orderId, markCollected, collectedBy: 'admin-counter' }) });
      setVerified(data.pass || null);
      setMessage(markCollected ? 'Collection marked as handed over.' : 'Collection pass verified.');
      await load();
    } catch (error) { setVerified(null); setMessage(error instanceof Error ? error.message : 'Could not verify collection pass.'); }
  }

  async function previewNotification(pass?: Pass | null) {
    const target = pass?.orderId || pass?.orderNumber || orderId;
    if (!target) { setMessage('Enter an order number or select a pass first.'); return; }
    try {
      const params = new URLSearchParams({ orderId: target, email: pass?.customerEmail || '' });
      const data = await api(`/api/internal/collection/notifications?${params.toString()}`);
      setPreview(data.notification || data);
      setMessage('Ready-for-collection notification preview loaded.');
    } catch (error) { setPreview(null); setMessage(error instanceof Error ? error.message : 'Could not preview notification.'); }
  }

  async function queueNotification(pass?: Pass | null) {
    const target = pass?.orderId || pass?.orderNumber || orderId;
    if (!target) { setMessage('Enter an order number or select a pass first.'); return; }
    try {
      const data = await api('/api/internal/collection/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: target, email: pass?.customerEmail || '', force: true }) });
      setPreview(data.notification || data);
      setMessage(data.duplicate ? 'Collection notification was already queued or sent.' : 'Ready-for-collection email queued in the outbox.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not queue notification.'); }
  }

  return <div>
    <PageHeader title="Collection Handover" subtitle="Verify customer collection PIN/QR tokens, mark orders as collected and queue ready-for-collection notifications." actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void previewNotification(verified)}><Mail size={14} /> Preview email</Button><PrimaryButton onClick={() => void verify(false)}><ShieldCheck size={14} /> Verify</PrimaryButton></>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 md:grid-cols-5"><Metric label="Passes" value={summary.total} /><Metric label="Ready" value={summary.ready} tone="blue" /><Metric label="Collected" value={summary.collected} tone="green" /><Metric label="Queued emails" value={notifySummary.queued} tone="blue" /><Metric label="Sent emails" value={notifySummary.sent} tone="green" /></div>
    <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="space-y-4">
        <Card>
          <div className="mb-4 flex items-center gap-2"><PackageCheck size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Verify customer pass</h3></div>
          <div className="grid gap-3">
            <Input placeholder="Scan token or enter 6-digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            <Input placeholder="Order number optional for PIN lookup / notification" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            <div className="flex flex-wrap gap-2"><Button onClick={() => void verify(false)}>Verify only</Button><PrimaryButton onClick={() => void verify(true)}><CheckCircle2 size={14} /> Mark collected</PrimaryButton><Button onClick={() => void queueNotification(verified)}><Send size={14} /> Queue ready email</Button></div>
          </div>
          {verified ? <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted"><p className="font-semibold text-white">Order #{verified.orderNumber}</p><p>{verified.customerName} · {verified.customerEmail}</p><p>{verified.locationLabel}</p><p>PIN: <b className="text-white">{verified.pin}</b></p><p>Status: {verified.status}</p></div> : null}
        </Card>
        <Card>
          <div className="mb-3 flex items-center gap-2"><Mail size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Notification preview</h3></div>
          {preview ? <div className="grid gap-3 text-sm text-textMuted"><p><b className="text-white">To:</b> {preview.to}</p><p><b className="text-white">Subject:</b> {preview.subject}</p><div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 whitespace-pre-wrap text-xs">{preview.text || preview.smsText || 'Preview loaded.'}</div>{preview.smsText ? <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs"><b className="text-white">SMS-ready:</b> {preview.smsText}</div> : null}</div> : <p className="text-sm text-textMuted">Preview an order/pass to see the customer email and SMS-ready message before queuing.</p>}
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]"><Input placeholder="Search passes and notifications" value={query} onChange={(e) => setQuery(e.target.value)} /><Button onClick={() => void load()}><Search size={14} /> Search</Button></div>
          <div className="grid gap-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">Order #{item.orderNumber}</p><p className="mt-1 text-xs text-textMuted">{item.customerName} · {item.locationLabel}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs ${tone(item.status)}`}>{item.status}</span></div><div className="mt-3 grid gap-1 text-xs text-textMuted"><p>PIN: <span className="font-semibold text-white">{item.pin}</span></p><p>{item.pickupInstructions}</p><p>Verified {item.verificationCount || 0} time(s)</p></div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void previewNotification(item)}>Preview</Button><PrimaryButton onClick={() => void queueNotification(item)}><Send size={14} /> Queue email</PrimaryButton></div></div>)}{!items.length ? <div className="p-6 text-center text-sm text-textMuted">No collection passes yet. Passes appear when collection orders are opened by customers.</div> : null}</div>
        </Card>
        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Recent collection notification emails</div>
          <div className="grid gap-3">{notifications.slice(0, 8).map((item) => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex justify-between gap-3"><div><p className="text-sm text-white">{item.subject}</p><p className="text-xs text-textMuted">To {item.to}</p></div><span className={`h-fit rounded-full border px-2.5 py-1 text-xs ${tone(item.status)}`}>{item.status}</span></div></div>)}{!notifications.length ? <p className="text-sm text-textMuted">No queued collection emails yet.</p> : null}</div>
        </Card>
      </div>
    </div>
  </div>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'green' | 'amber' | 'red' | 'blue' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
