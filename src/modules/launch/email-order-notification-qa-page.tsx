'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Mail, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Severity = 'pass' | 'warning' | 'error' | 'info';
type Check = { id: string; category: string; severity: Severity; label: string; detail: string; action?: string };
type Report = {
  mode: string;
  ready: boolean;
  score: number;
  generatedAt: string;
  summary: { checks: number; pass: number; warning: number; error: number; info: number };
  emailSettings: Record<string, any>;
  smtp: Record<string, any>;
  outbox: Record<string, any>;
  queuedNotifications?: any[];
  checks: Check[];
  nextActions: Array<{ label: string; detail: string; action?: string; severity: Severity; category: string }>;
};

const categories = ['all', 'email-settings', 'smtp', 'outbox', 'order-notifications', 'artwork-templates', 'vercel'];
const severities = ['all', 'error', 'warning', 'info', 'pass'];
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' '); }
function toneFor(severity: string) { if (severity === 'pass') return 'green'; if (severity === 'error') return 'red'; if (severity === 'warning') return 'amber'; if (severity === 'info') return 'blue'; return 'default'; }

export function EmailOrderNotificationQaPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function run(action: 'dry-run' | 'queue-test-notifications' = 'dry-run') {
    setBusy(true);
    const response = await fetch('/api/internal/launch/email-qa', {
      method: action === 'dry-run' ? 'GET' : 'POST',
      headers: action === 'dry-run' ? undefined : { 'Content-Type': 'application/json' },
      body: action === 'dry-run' ? undefined : JSON.stringify({ action }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setLoading(false);
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Email QA failed.');
    setReport(payload.data);
    setMessage(action === 'queue-test-notifications' ? 'Queued safe test order notification records.' : 'Dry-run completed. No email records were created.');
  }

  useEffect(() => { void run('dry-run').catch((error) => { setMessage(error.message); setLoading(false); setBusy(false); }); }, []);
  const checks = useMemo(() => (report?.checks || []).filter((item) => (category === 'all' || item.category === category) && (severity === 'all' || item.severity === severity)), [report, category, severity]);

  return (
    <div>
      <PageHeader
        title="Email + Order Notification QA"
        subtitle="Build 55 checks SMTP settings, email outbox storage, order confirmation queues, admin alerts and artwork templates."
        actions={<><Button disabled={busy} onClick={() => void run('dry-run')}><RefreshCw size={14} /> Dry run</Button><PrimaryButton disabled={busy} onClick={() => void run('queue-test-notifications')}><Mail size={14} /> Queue test notifications</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><Mail size={22} className="text-sky-300" /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Email QA score</p><p className="text-4xl font-black text-white">{loading ? '...' : report?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div>
          {report?.ready ? <Notice tone="green"><CheckCircle2 className="mr-2 inline h-4 w-4" />Email notification checks have no blocking errors.</Notice> : <Notice tone="amber"><AlertTriangle className="mr-2 inline h-4 w-4" />Review errors and warnings before relying on live notifications.</Notice>}
          <p className="mt-3 text-xs text-textMuted">Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : '-'}</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Checks" value={report?.summary?.checks || 0} />
          <Metric label="Pass" value={report?.summary?.pass || 0} tone="green" />
          <Metric label="Warnings" value={report?.summary?.warning || 0} tone={report?.summary?.warning ? 'amber' : 'green'} />
          <Metric label="Errors" value={report?.summary?.error || 0} tone={report?.summary?.error ? 'red' : 'green'} />
          <Metric label="Info" value={report?.summary?.info || 0} tone="blue" />
          <Metric label="SMTP" value={report?.smtp?.configured ? 'ready' : 'not ready'} tone={report?.smtp?.configured ? 'green' : 'amber'} />
          <Metric label="Outbox" value={report?.outbox?.mode || 'unknown'} tone={report?.outbox?.mode === 'db-primary' ? 'green' : 'amber'} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Email settings</h3><div className="grid gap-2 text-sm text-textMuted"><Read label="Brand" value={String(report?.emailSettings?.brandName || '-')} /><Read label="From" value={String(report?.emailSettings?.fromEmail || '-')} /><Read label="Storage" value={String(report?.emailSettings?.storageMode || '-')} /></div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">SMTP + outbox</h3><div className="grid gap-2 text-sm text-textMuted"><Read label="SMTP host" value={String(report?.smtp?.host || '-')} /><Read label="From" value={String(report?.smtp?.from || '-')} /><Read label="Outbox count" value={String(report?.outbox?.count || 0)} /></div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Quick links</h3><div className="grid gap-2 text-sm"><Quick href="/email-settings">Email Settings</Quick><Quick href="/email-outbox">Email Outbox</Quick><Quick href="/orders">Orders</Quick><Quick href="/storefront-order-test">Storefront Order Test</Quick></div></Card>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[190px_190px_1fr]">
          <Select value={category} onChange={(event) => setCategory(event.target.value)} options={categories.map((value) => ({ value, label: label(value) }))} />
          <Select value={severity} onChange={(event) => setSeverity(event.target.value)} options={severities.map((value) => ({ value, label: label(value) }))} />
          <div className="flex items-center text-sm text-textMuted">Showing {checks.length} of {report?.checks?.length || 0} checks</div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Email + order notification checks</div>{loading ? <div className="p-6 text-sm text-textMuted">Running email QA...</div> : null}<div className="divide-y divide-white/6">{checks.map((item) => <CheckRow key={item.id} item={item} />)}{!loading && !checks.length ? <div className="p-8 text-center text-sm text-textMuted">No checks match this filter.</div> : null}</div></Card>
        <div className="space-y-4">
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3><div className="space-y-2">{(report?.nextActions || []).map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-white">{item.label}</strong><Badge tone={toneFor(item.severity)}>{item.severity}</Badge></div><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>)}{!report?.nextActions?.length ? <Notice tone="green">No blocking next actions.</Notice> : null}</div></Card>
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Queued test notifications</h3>{report?.queuedNotifications?.length ? <div className="grid gap-2 text-sm text-textMuted">{report.queuedNotifications.map((row, index) => <Read key={index} label={row?.email?.type || `Email ${index + 1}`} value={row?.email?.status || (row?.ok === false ? 'failed' : 'queued')} />)}</div> : <Notice tone="blue">No test notification records created in dry-run mode.</Notice>}</Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold capitalize text-white">{value}</p></Card>; }
function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/10 bg-white/[0.04] text-textMuted'; return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/8 bg-white/[0.03] text-textMuted'; return <div className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${cls}`}>{children}</div>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Quick({ href, children }: { href: string; children: ReactNode }) { return <a href={href} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.05]">{children}<ExternalLink size={13} /></a>; }
function CheckRow({ item }: { item: Check }) { return <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={toneFor(item.severity)}>{item.severity}</Badge><Badge>{label(item.category)}</Badge></div><h3 className="mt-2 text-sm font-semibold text-white">{item.label}</h3></div></div><p className="mt-2 text-sm leading-6 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>; }
