'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type EventRow = { id: string; action: string; actor: string; severity: string; ip: string; userAgent: string; createdAt: string; metadata: Record<string, unknown> };
type Report = { items: EventRow[]; summary: { total: number; critical: number; warning: number; loginFailures: number } };
function tone(value: string) { if (value === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-100'; if (value === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-100'; return 'border-white/10 bg-white/[0.04] text-textMuted'; }
function label(value: string) { return value.replace(/auth\.admin\./, '').replace(/_/g, ' '); }

export function SecurityEventsPage() {
  const [report, setReport] = useState<Report>({ items: [], summary: { total: 0, critical: 0, warning: 0, loginFailures: 0 } });
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  async function load() {
    try {
      const response = await fetch(`/api/internal/platform/event-log?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Events could not load.');
      setReport(payload.data);
      setMessage('Security events refreshed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Events could not load.'); }
  }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Security Events" subtitle="Audit log, failed logins and suspicious login alerts." actions={<Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<div className="grid gap-4 md:grid-cols-4"><Metric label="Events" value={report.summary.total} /><Metric label="Critical" value={report.summary.critical} /><Metric label="Warnings" value={report.summary.warning} /><Metric label="Failed logins" value={report.summary.loginFailures} /></div><Card><Input placeholder="Search actor, action, IP..." value={search} onChange={(event) => setSearch(event.target.value)} /><div className="mt-3"><Button onClick={() => void load()}>Search</Button></div></Card><Card><div className="space-y-3">{report.items.map((item) => <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold text-white">{label(item.action)}</p><p className="text-xs text-textMuted">{item.actor || 'system'} · {item.ip || 'unknown IP'}</p></div><span className={`h-fit rounded-full border px-2.5 py-1 text-xs ${tone(item.severity)}`}>{item.severity}</span></div><p className="mt-2 text-xs text-textMuted">{new Date(item.createdAt).toLocaleString()} · {item.userAgent || 'No user agent'}</p>{item.severity === 'critical' ? <p className="mt-2 flex items-center gap-2 text-xs text-red-100"><AlertTriangle size={14} /> Review this login activity.</p> : null}</div>)}{!report.items.length ? <p className="text-sm text-textMuted">No events yet.</p> : null}</div></Card></div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
