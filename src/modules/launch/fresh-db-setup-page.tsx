'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, PlayCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

type Step = { id: string; label: string; status: 'ready' | 'created' | 'missing' | 'warning' | 'error'; detail: string };
type Report = { ok: boolean; mode: string; generatedAt: string; database: Record<string, any>; counts: Record<string, number | null>; summary: Record<string, number>; steps: Step[] };

function tone(status: string) {
  if (status === 'created' || status === 'ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (status === 'missing' || status === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (status === 'error') return 'border-red-500/30 bg-red-500/10 text-red-100';
  return 'border-white/10 bg-white/[0.04] text-textMuted';
}

export function FreshDbSetupPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/launch/fresh-db-setup', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Fresh database setup check failed.');
      setReport(payload.data);
      setMessage('Fresh database setup check refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fresh database setup check failed.');
    } finally {
      setLoading(false);
    }
  }

  async function runSetup() {
    setRunning(true);
    try {
      const response = await fetch('/api/internal/launch/fresh-db-setup', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Fresh database setup failed.');
      setReport(payload.data);
      setMessage('Fresh database schema setup completed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fresh database setup failed.');
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const steps = useMemo(() => report?.steps || [], [report]);

  return <div>
    <PageHeader title="Fresh DB Setup" subtitle="Build 59 prepares a fresh Aiven/Postgres database with production platform tables only. No dummy catalogue data is inserted." actions={<div className="flex gap-2"><Button onClick={() => void load()} disabled={loading || running}><RefreshCw size={14} /> Refresh</Button><Button onClick={() => void runSetup()} disabled={running}><PlayCircle size={14} /> Run setup</Button></div>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><Database size={22} /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Schema status</p><p className="text-3xl font-black text-white">{loading ? '...' : report?.ok ? 'Ready' : 'Needs setup'}</p></div></div><p className="mt-3 text-sm text-textMuted">Run setup once after switching to a new blank database.</p></Card>
      <div className="grid gap-4 md:grid-cols-4"><Metric label="Ready" value={report?.summary?.ready || 0} /><Metric label="Created" value={report?.summary?.created || 0} /><Metric label="Missing" value={report?.summary?.missing || 0} /><Metric label="Warnings" value={report?.summary?.warning || 0} /></div>
    </div>
    <div className="mb-4 grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-3 text-sm font-semibold text-white">Database</h3><Read label="Source" value={String(report?.database?.source || '-')} /><Read label="Host" value={String(report?.database?.host || '-')} /><Read label="Port" value={String(report?.database?.port || '-')} /><Read label="Database" value={String(report?.database?.database || '-')} /><Read label="SSL" value={String(report?.database?.sslmode || '-')} /></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Table counts</h3>{Object.entries(report?.counts || {}).map(([key, value]) => <Read key={key} label={key} value={value === null ? 'missing' : `${value} rows`} />)}</Card></div>
    <Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Setup steps</div><div className="divide-y divide-white/6">{steps.map((step) => <div key={step.id} className="p-4"><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${tone(step.status)}`}>{step.status}</span><h3 className="mt-2 text-sm font-semibold text-white">{step.label}</h3><p className="mt-2 text-sm leading-6 text-textMuted">{step.detail}</p></div>)}{!loading && !steps.length ? <div className="p-8 text-center text-sm text-textMuted">No setup checks returned.</div> : null}</div></Card>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold capitalize text-white">{value}</p></Card>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="mb-2 rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
