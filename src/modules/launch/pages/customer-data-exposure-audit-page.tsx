'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type AuditCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type Payload = { ok: boolean; launchStatus: string; score: number; summary: Record<string, number>; blockers: AuditCheck[]; warnings: AuditCheck[]; checks: AuditCheck[]; generatedAt?: string };

async function loadAudit() {
  const response = await fetch('/api/internal/launch/customer-data-exposure-audit', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Customer data exposure audit failed.');
  return payload as Payload;
}
function statusClass(status: CheckStatus) {
  if (status === 'fail') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (status === 'skip') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}
function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const text = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${text}`}>{value}</p></Card>;
}
function CheckCard({ check }: { check: AuditCheck }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
        {check.action ? <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">{check.action}</p> : null}
        {check.href ? <Link className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white" href={check.href}>Open related page <ExternalLink size={12} /></Link> : null}
      </div>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(check.status)}`}>{check.status}</span>
    </div>
  </div>;
}

export function CustomerDataExposureAuditPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'blockers' | 'warnings' | 'all'>('blockers');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadAudit();
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'Customer data exposure blockers found.' : payload.launchStatus === 'review' ? 'No blockers, but privacy review warnings remain.' : 'Customer data exposure audit looks ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Customer data exposure audit failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => {
    if (!data) return [];
    if (tab === 'blockers') return data.blockers || [];
    if (tab === 'warnings') return data.warnings || [];
    return data.checks || [];
  }, [data, tab]);
  const blockers = data?.summary?.fail || 0;
  const warnings = data?.summary?.warn || 0;

  return <div>
    <PageHeader
      title="Customer Data Exposure Audit"
      subtitle="Read-only launch audit for public customer pages, order tracking, proof links, design briefs and payment return URLs."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run audit</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${blockers ? 'border-red-500/30 bg-red-500/10 text-red-100' : warnings ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
      {blockers ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : <CheckCircle2 className="mr-2 inline h-4 w-4" />}
      {blockers ? 'Do not go public until customer-data blockers are fixed.' : warnings ? 'Soft launch is possible, but review the privacy warnings.' : 'Customer-facing data checks are clear.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Score" value={data ? `${data.score}%` : '—'} tone={blockers ? 'bad' : warnings ? 'warn' : 'good'} />
      <Metric label="Status" value={data?.launchStatus || '—'} tone={blockers ? 'bad' : warnings ? 'warn' : 'good'} />
      <Metric label="Blockers" value={blockers} tone={blockers ? 'bad' : 'good'} />
      <Metric label="Warnings" value={warnings} tone={warnings ? 'warn' : 'good'} />
      <Metric label="Checks" value={data?.summary?.total || 0} />
    </div>

    <Card className="mb-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Customer-facing pages reviewed</h3>
      <div className="grid gap-2 text-xs text-textMuted md:grid-cols-4">
        {['/track-order', '/proof-action', '/design-brief', '/payment-success', '/payment-cancel', '/storefront/upload-artwork', '/cart', '/checkout'].map((href) => <Link key={href} href={href} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.06] hover:text-white">{href}</Link>)}
      </div>
    </Card>

    <div className="mb-4 flex flex-wrap gap-2">
      {[
        ['blockers', `Blockers (${blockers})`],
        ['warnings', `Warnings (${warnings})`],
        ['all', `All checks (${data?.summary?.total || 0})`],
      ].map(([value, label]) => <button key={value} onClick={() => setTab(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
    </div>

    <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">{tab === 'blockers' ? 'Customer-data blockers' : tab === 'warnings' ? 'Privacy review warnings' : 'All customer-data checks'}</h3>
      <div className="grid gap-3">{visible.map((check) => <CheckCard key={check.id} check={check} />)}{!visible.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
    </Card>
  </div>;
}
