'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Flag, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Severity = 'pass' | 'warning' | 'error' | 'info';
type Item = { id: string; area: string; severity: Severity; label: string; detail: string; route?: string; action?: string };
type Report = { launchReady: boolean; goNoGo: string; score: number; generatedAt: string; summary: Record<string, number>; items: Item[]; nextActions: Array<Record<string, any>> };
const areas = ['all', 'platform', 'storefront', 'payment', 'email', 'seo', 'data', 'security', 'manual'];
const severities = ['all', 'error', 'warning', 'info', 'pass'];
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' '); }
function tone(value: string) { return value === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-100' : value === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : value === 'pass' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-sky-500/30 bg-sky-500/10 text-sky-100'; }

export function FinalLaunchChecklistPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [area, setArea] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/internal/launch/final-checklist', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Final launch checklist failed.');
      setReport(payload.data);
      setMessage('Final launch checklist refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Final launch checklist failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const items = useMemo(() => (report?.items || []).filter((item) => (area === 'all' || item.area === area) && (severity === 'all' || item.severity === severity)), [report, area, severity]);

  return <div>
    <PageHeader title="Final Launch Checklist" subtitle="Build 58 combines all launch QA modules into one go/no-go checklist." actions={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>} />
    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><Flag size={22} /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Go / No-Go</p><p className="text-3xl font-black text-white">{loading ? '...' : report?.goNoGo || '-'}</p></div></div><p className="mt-3 text-sm text-textMuted">Score: <span className="font-semibold text-white">{report?.score ?? 0}/100</span></p>{report?.launchReady ? <Notice toneValue="pass"><CheckCircle2 className="mr-2 inline h-4 w-4" />No blocking errors found.</Notice> : <Notice toneValue="warning"><AlertTriangle className="mr-2 inline h-4 w-4" />Fix blocking items before launch.</Notice>}</Card>
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6"><Metric label="Items" value={report?.summary?.items || 0} /><Metric label="Pass" value={report?.summary?.pass || 0} /><Metric label="Warnings" value={report?.summary?.warning || 0} /><Metric label="Errors" value={report?.summary?.error || 0} /><Metric label="Info" value={report?.summary?.info || 0} /><Metric label="Generated" value={report?.generatedAt ? new Date(report.generatedAt).toLocaleTimeString() : '-'} /></div>
    </div>
    <div className="mb-4 grid gap-4 lg:grid-cols-3"><Card><h3 className="mb-3 text-sm font-semibold text-white">Core QA modules</h3><Quick href="/storefront-order-test">Storefront Order Test</Quick><Quick href="/payment-checkout-qa">Payment Checkout QA</Quick><Quick href="/email-order-notification-qa">Mail QA</Quick></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Launch controls</h3><Quick href="/admin-launch-security">Launch Guard</Quick><Quick href="/data-continuity">Data Check</Quick><Quick href="/launch-readiness">Launch Readiness</Quick></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">SEO</h3><Quick href="/seo-live-readiness">SEO Live Readiness</Quick><Quick href="/seo-search-console">Search Console</Quick><Quick href="/robots-txt">Robots.txt</Quick></Card></div>
    <Card className="mb-4"><div className="grid gap-3 md:grid-cols-[190px_190px_1fr]"><Select value={area} onChange={(event) => setArea(event.target.value)} options={areas.map((value) => ({ value, label: label(value) }))} /><Select value={severity} onChange={(event) => setSeverity(event.target.value)} options={severities.map((value) => ({ value, label: label(value) }))} /><div className="flex items-center text-sm text-textMuted">Showing {items.length} of {report?.items?.length || 0} items</div></div></Card>
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]"><Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Checklist items</div><div className="divide-y divide-white/6">{items.map((item) => <ChecklistRow key={item.id} item={item} />)}{!loading && !items.length ? <div className="p-8 text-center text-sm text-textMuted">No checklist items match this filter.</div> : null}</div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3>{(report?.nextActions || []).map((item, index) => <div key={index} className={`mb-2 rounded-xl border p-3 ${tone(String(item.severity))}`}><strong className="text-sm text-white">{item.label}</strong><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}{item.route ? <a href={String(item.route)} className="mt-2 inline-flex text-xs text-sky-200">Open module <ExternalLink className="ml-1 h-3 w-3" /></a> : null}</div>)}</Card></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold capitalize text-white">{value}</p></Card>; }
function Notice({ children, toneValue }: { children: ReactNode; toneValue: string }) { return <div className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${tone(toneValue)}`}>{children}</div>; }
function Quick({ href, children }: { href: string; children: ReactNode }) { return <a href={href} className="mb-2 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-sky-200 hover:bg-white/[0.05]">{children}<ExternalLink size={13} /></a>; }
function ChecklistRow({ item }: { item: Item }) { return <div className="p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${tone(item.severity)}`}>{item.severity}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-textMuted">{label(item.area)}</span></div><h3 className="mt-2 text-sm font-semibold text-white">{item.label}</h3><p className="mt-2 text-sm leading-6 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}{item.route ? <a href={item.route} className="mt-2 inline-flex text-xs text-sky-200">Open module <ExternalLink className="ml-1 h-3 w-3" /></a> : null}</div>; }
