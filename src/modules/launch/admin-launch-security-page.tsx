'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Severity = 'pass' | 'warning' | 'error' | 'info';
type Check = { id: string; category: string; severity: Severity; label: string; detail: string; action?: string };
type Report = {
  ready: boolean;
  score: number;
  generatedAt: string;
  summary: { checks: number; pass: number; warning: number; error: number; info: number };
  environment: Record<string, any>;
  checks: Check[];
  nextActions: Array<{ label: string; detail: string; action?: string; severity: Severity; category: string }>;
};

const categories = ['all', 'access', 'api', 'database', 'tenant', 'environment', 'headers', 'runtime'];
const severities = ['all', 'error', 'warning', 'info', 'pass'];
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' '); }
function toneFor(value: string) { if (value === 'pass') return 'green'; if (value === 'error') return 'red'; if (value === 'warning') return 'amber'; if (value === 'info') return 'blue'; return 'default'; }

export function AdminLaunchSecurityPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/internal/launch/launch-guard', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Launch guard failed.');
      setReport(payload.data);
      setMessage('Launch security pass refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Launch security pass failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const checks = useMemo(() => (report?.checks || []).filter((item) => (category === 'all' || item.category === category) && (severity === 'all' || item.severity === severity)), [report, category, severity]);

  return (
    <div>
      <PageHeader title="Admin Launch Security Pass" subtitle="Build 56 checks launch access posture, tenant mode, API origins, environment readiness and Vercel runtime risks." actions={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>} />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><ShieldCheck size={22} className="text-sky-300" /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Security score</p><p className="text-4xl font-black text-white">{loading ? '...' : report?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div>
          {report?.ready ? <Notice tone="green"><CheckCircle2 className="mr-2 inline h-4 w-4" />No blocking launch security errors detected.</Notice> : <Notice tone="amber"><AlertTriangle className="mr-2 inline h-4 w-4" />Fix blocking launch security items before public launch.</Notice>}
          <p className="mt-3 text-xs text-textMuted">Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : '-'}</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Checks" value={report?.summary?.checks || 0} />
          <Metric label="Pass" value={report?.summary?.pass || 0} tone="green" />
          <Metric label="Warnings" value={report?.summary?.warning || 0} tone={report?.summary?.warning ? 'amber' : 'green'} />
          <Metric label="Errors" value={report?.summary?.error || 0} tone={report?.summary?.error ? 'red' : 'green'} />
          <Metric label="Info" value={report?.summary?.info || 0} tone="blue" />
          <Metric label="Runtime" value={report?.environment?.vercel ? 'Vercel' : 'Local'} />
          <Metric label="Tenant DB" value={report?.environment?.tenantDbMode || '-'} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Environment</h3><div className="grid gap-2 text-sm text-textMuted"><Read label="Node" value={String(report?.environment?.nodeEnv || '-')} /><Read label="Default tenant" value={String(report?.environment?.defaultTenantId || '-')} /><Read label="Tenant DB mode" value={String(report?.environment?.tenantDbMode || '-')} /></div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">What this pass covers</h3><p className="text-sm leading-6 text-textMuted">Admin access posture, API origin readiness, tenant selection mode, Vercel persistence rules, required launch envs and final header work.</p></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Quick links</h3><div className="grid gap-2 text-sm"><Quick href="/super-admin">Super Admin</Quick><Quick href="/tenant-control">Tenant Control</Quick><Quick href="/database-manager">Database Manager</Quick><Quick href="/launch-readiness">Launch Readiness</Quick></div></Card>
      </div>

      <Card className="mb-4"><div className="grid gap-3 md:grid-cols-[190px_190px_1fr]"><Select value={category} onChange={(event) => setCategory(event.target.value)} options={categories.map((value) => ({ value, label: label(value) }))} /><Select value={severity} onChange={(event) => setSeverity(event.target.value)} options={severities.map((value) => ({ value, label: label(value) }))} /><div className="flex items-center text-sm text-textMuted">Showing {checks.length} of {report?.checks?.length || 0} checks</div></div></Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Admin launch security checks</div>{loading ? <div className="p-6 text-sm text-textMuted">Running launch security pass...</div> : null}<div className="divide-y divide-white/6">{checks.map((item) => <CheckRow key={item.id} item={item} />)}{!loading && !checks.length ? <div className="p-8 text-center text-sm text-textMuted">No checks match this filter.</div> : null}</div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3><div className="space-y-2">{(report?.nextActions || []).map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-white">{item.label}</strong><Badge tone={toneFor(item.severity)}>{item.severity}</Badge></div><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>)}{!report?.nextActions?.length ? <Notice tone="green">No blocking next actions.</Notice> : null}</div></Card>
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
