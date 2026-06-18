'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MousePointerClick, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Finding = { id: string; file: string; severity: 'pass' | 'warning' | 'error' | 'info'; label: string; detail: string; action?: string };
type Report = { ready: boolean; score: number; generatedAt: string; summary: Record<string, number>; findings: Finding[]; nextActions: Array<Record<string, any>> };
const severities = ['all', 'error', 'warning', 'info', 'pass'];
function tone(value: string) { return value === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-100' : value === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : value === 'pass' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-sky-500/30 bg-sky-500/10 text-sky-100'; }

export function ButtonAuditPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [severity, setSeverity] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/internal/launch/button-audit', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Button audit failed.');
      setReport(payload.data);
      setMessage('Button audit refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Button audit failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const findings = useMemo(() => (report?.findings || []).filter((item) => severity === 'all' || item.severity === severity), [report, severity]);

  return <div>
    <PageHeader title="Button Audit" subtitle="Checks likely dead buttons, placeholder links, empty handlers and unfinished actions across admin modules." actions={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><MousePointerClick size={22} /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Button score</p><p className="text-4xl font-black text-white">{loading ? '...' : report?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div><p className="mt-3 text-sm text-textMuted">{report?.ready ? 'No blocking button findings detected.' : 'Review button findings before launch.'}</p></Card>
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6"><Metric label="Findings" value={report?.summary?.findings || 0} /><Metric label="Files" value={report?.summary?.filesScanned || 0} /><Metric label="Warnings" value={report?.summary?.warning || 0} /><Metric label="Errors" value={report?.summary?.error || 0} /><Metric label="Info" value={report?.summary?.info || 0} /><Metric label="Generated" value={report?.generatedAt ? new Date(report.generatedAt).toLocaleTimeString() : '-'} /></div>
    </div>
    <Card className="mb-4"><div className="grid gap-3 md:grid-cols-[190px_1fr]"><Select value={severity} onChange={(event) => setSeverity(event.target.value)} options={severities.map((value) => ({ value, label: value === 'all' ? 'All' : value }))} /><div className="flex items-center text-sm text-textMuted">Showing {findings.length} of {report?.findings?.length || 0} findings</div></div></Card>
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]"><Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Findings</div><div className="divide-y divide-white/6">{findings.map((item) => <FindingRow key={item.id} item={item} />)}{!loading && !findings.length ? <div className="p-8 text-center text-sm text-textMuted">No findings match this filter.</div> : null}</div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3>{(report?.nextActions || []).map((item, index) => <div key={index} className={`mb-2 rounded-xl border p-3 ${tone(String(item.severity))}`}><strong className="text-sm text-white">{item.label}</strong><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>)}</Card></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold capitalize text-white">{value}</p></Card>; }
function FindingRow({ item }: { item: Finding }) { return <div className="p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${tone(item.severity)}`}>{item.severity}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-textMuted">{item.file}</span></div><h3 className="mt-2 text-sm font-semibold text-white">{item.label}</h3><p className="mt-2 text-sm leading-6 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>; }
