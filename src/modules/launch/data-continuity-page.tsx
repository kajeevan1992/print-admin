'use client';

import { useEffect, useMemo, useState } from 'react';
import { DatabaseBackup, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Check = { id: string; category: string; severity: 'pass' | 'warning' | 'error' | 'info'; label: string; detail: string; action?: string };
type Report = { ready: boolean; score: number; generatedAt: string; summary: Record<string, number>; environment: Record<string, any>; tableCounts: Record<string, number>; databaseConnections: Array<Record<string, any>>; checks: Check[]; nextActions: Array<Record<string, any>> };
const categories = ['all', 'database', 'backup-hook', 'vercel', 'restore-plan', 'tenant-mode', 'operations'];
const severities = ['all', 'error', 'warning', 'info', 'pass'];
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' '); }
function tone(value: string) { return value === 'error' ? 'border-red-500/30 bg-red-500/10' : value === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : value === 'pass' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-sky-500/30 bg-sky-500/10'; }

export function DataContinuityPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/launch/storage-check', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Data continuity check failed.');
      setReport(payload.data);
      setMessage('Data continuity readiness refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Data continuity check failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const checks = useMemo(() => (report?.checks || []).filter((item) => (category === 'all' || item.category === category) && (severity === 'all' || item.severity === severity)), [report, category, severity]);

  return <div>
    <PageHeader title="Data Continuity" subtitle="Build 57 checks main database readiness, Vercel runtime storage risk, existing database hook and restore runbook gaps." actions={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><DatabaseBackup size={22} /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Readiness score</p><p className="text-4xl font-black text-white">{loading ? '...' : report?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div><p className="mt-3 text-sm text-textMuted">{report?.ready ? 'No blocking data continuity errors detected.' : 'Review blocking items before launch.'}</p></Card>
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7"><Metric label="Checks" value={report?.summary?.checks || 0} /><Metric label="Pass" value={report?.summary?.pass || 0} /><Metric label="Warnings" value={report?.summary?.warning || 0} /><Metric label="Errors" value={report?.summary?.error || 0} /><Metric label="Info" value={report?.summary?.info || 0} /><Metric label="Runtime" value={report?.environment?.vercel ? 'Vercel' : 'Local'} /><Metric label="Tenant DB" value={report?.environment?.tenantDbMode || '-'} /></div>
    </div>
    <div className="mb-4 grid gap-4 lg:grid-cols-3"><Card><h3 className="mb-3 text-sm font-semibold text-white">Environment</h3><Read label="Directory" value={String(report?.environment?.backupDir || '-')} /><Read label="Provider" value={String(report?.environment?.backupProvider || 'not documented')} /><Read label="Tenant DB" value={String(report?.environment?.tenantDbMode || '-')} /></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Table counts</h3>{Object.entries(report?.tableCounts || {}).map(([key, value]) => <Read key={key} label={key} value={`${value} rows`} />)}</Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Quick links</h3><Quick href="/database-manager">Database Manager</Quick><Quick href="/launch-readiness">Launch Readiness</Quick><Quick href="/admin-launch-security">Launch Guard</Quick><Quick href="/error-log">Error Log</Quick></Card></div>
    <Card className="mb-4"><div className="grid gap-3 md:grid-cols-[190px_190px_1fr]"><Select value={category} onChange={(event) => setCategory(event.target.value)} options={categories.map((value) => ({ value, label: label(value) }))} /><Select value={severity} onChange={(event) => setSeverity(event.target.value)} options={severities.map((value) => ({ value, label: label(value) }))} /><div className="flex items-center text-sm text-textMuted">Showing {checks.length} of {report?.checks?.length || 0} checks</div></div></Card>
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]"><Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Data continuity checks</div><div className="divide-y divide-white/6">{checks.map((item) => <CheckRow key={item.id} item={item} />)}{!loading && !checks.length ? <div className="p-8 text-center text-sm text-textMuted">No checks match this filter.</div> : null}</div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3>{(report?.nextActions || []).map((item, index) => <div key={index} className={`mb-2 rounded-xl border p-3 ${tone(String(item.severity))}`}><strong className="text-sm text-white">{item.label}</strong><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>)}</Card></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold capitalize text-white">{value}</p></Card>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="mb-2 rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Quick({ href, children }: { href: string; children: React.ReactNode }) { return <a href={href} className="mb-2 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.05]">{children}</a>; }
function CheckRow({ item }: { item: Check }) { return <div className="p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${tone(item.severity)}`}>{item.severity}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-textMuted">{label(item.category)}</span></div><h3 className="mt-2 text-sm font-semibold text-white">{item.label}</h3><p className="mt-2 text-sm leading-6 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>; }
