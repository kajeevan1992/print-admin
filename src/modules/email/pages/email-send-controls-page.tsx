'use client';

import { useEffect, useState } from 'react';
import { Mail, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type EmailRow = { id: string; type: string; status: string; to: string; subject: string; body?: string; orderId?: string; attempts?: number; lastError?: string; sentAt?: string; createdAt?: string };
type Summary = { total: number; queued: number; sending: number; sent: number; failed: number };

const typeOptions = ['collection-ready', 'settings-test', 'all'];
const statusOptions = ['all', 'queued', 'sent', 'failed'];

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Email request failed.');
  return payload.data || payload;
}

function chip(status: string) {
  if (status === 'sent') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'failed') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'queued') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

export function EmailSendControlsPage() {
  const [items, setItems] = useState<EmailRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, queued: 0, sending: 0, sent: 0, failed: 0 });
  const [smtp, setSmtp] = useState<any>({});
  const [type, setType] = useState('collection-ready');
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState('20');
  const [testTo, setTestTo] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api(`/api/internal/email/outbox?${new URLSearchParams({ type, status, limit: '100' }).toString()}`);
    setItems(data.items || []);
    setSummary(data.summary || summary);
    setSmtp(data.emailSettings || {});
  }

  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);

  async function run(action: string, extra: Record<string, any> = {}) {
    setBusy(true); setMessage(''); setResult(null);
    try {
      const data = await api('/api/internal/email/outbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, type, limit: Number(limit || 20), dryRun, ...extra }) });
      setResult(data);
      setMessage(action === 'verify-smtp' ? 'Mail settings checked.' : dryRun ? 'Dry run completed. Untick dry run to send.' : 'Send process completed.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed.'); }
    finally { setBusy(false); }
  }

  return <div>
    <PageHeader title="Email Send Controls" subtitle="Send queued outbox emails, including ready-for-collection messages, using the tenant mail settings." actions={<><Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button><Button onClick={() => void run('verify-smtp')} disabled={busy}><ShieldCheck size={14} /> Check settings</Button><PrimaryButton onClick={() => void run('send-queued')} disabled={busy}><Send size={14} /> Process queue</PrimaryButton></>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 md:grid-cols-5"><Metric label="Total" value={summary.total} /><Metric label="Queued" value={summary.queued} /><Metric label="Sending" value={summary.sending} /><Metric label="Sent" value={summary.sent} /><Metric label="Failed" value={summary.failed} /></div>
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card><h3 className="mb-3 text-sm font-semibold text-white">Controls</h3><div className="grid gap-3"><Select value={type} onChange={(e) => setType(e.target.value)} options={typeOptions.map((value) => ({ value, label: value }))} /><Select value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions.map((value) => ({ value, label: value }))} /><Input placeholder="Limit" value={limit} onChange={(e) => setLimit(e.target.value)} /><label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry run only</label><div className="flex flex-wrap gap-2"><Button onClick={() => void load()}>Apply</Button><PrimaryButton onClick={() => void run('send-queued')} disabled={busy}>Process queue</PrimaryButton></div><div className="mt-3 grid gap-2"><Input placeholder="Test recipient" value={testTo} onChange={(e) => setTestTo(e.target.value)} /><Button onClick={() => void run('send-test', { to: testTo })} disabled={busy}>Queue and process test</Button></div></div></Card>
      <Card><h3 className="mb-3 text-sm font-semibold text-white">Mail settings summary</h3><div className="grid gap-2 text-sm text-textMuted"><p>Configured: <b className="text-white">{smtp.configured ? 'Yes' : 'No'}</b></p><p>From: <b className="text-white">{smtp.fromEmail || 'Not set'}</b></p><p>Reply-to: <b className="text-white">{smtp.replyTo || 'Not set'}</b></p><p>Server: <b className="text-white">{smtp.smtpHost || 'Not set'}:{smtp.smtpPort || ''}</b></p></div>{result ? <pre className="mt-4 max-h-[220px] overflow-auto rounded-xl bg-black/30 p-3 text-xs text-textMuted">{JSON.stringify(result, null, 2)}</pre> : null}</Card>
    </div>
    <Card className="mt-4"><h3 className="mb-3 text-sm font-semibold text-white">Outbox</h3><div className="grid gap-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{item.subject}</p><p className="mt-1 text-xs text-textMuted">To {item.to} · {item.type} · attempts {item.attempts || 0}</p>{item.orderId ? <p className="mt-1 text-xs text-textMuted">Order {item.orderId}</p> : null}</div><span className={`rounded-full border px-2.5 py-1 text-xs ${chip(item.status)}`}>{item.status}</span></div>{item.lastError ? <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{item.lastError}</p> : null}</div>)}{!items.length ? <p className="p-6 text-center text-sm text-textMuted">No emails found for this filter.</p> : null}</div></Card>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
