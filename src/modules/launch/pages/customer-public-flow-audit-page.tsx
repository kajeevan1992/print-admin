'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type AuditCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; surface?: string };
type Payload = {
  launchStatus: string;
  summary: Record<string, number>;
  groups: Record<string, Record<string, number>>;
  checks: AuditCheck[];
  hardBlockers: AuditCheck[];
  reviewItems: AuditCheck[];
  generatedAt?: string;
};

async function loadAudit() {
  const response = await fetch('/api/internal/launch/customer-public-flow-audit', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Customer public flow audit failed to load.');
  return payload as Payload;
}

function statusClass(status: CheckStatus) {
  if (status === 'fail') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (status === 'skip') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}

function statusIcon(status: CheckStatus) {
  if (status === 'fail' || status === 'warn') return <AlertTriangle size={16} />;
  if (status === 'skip') return <CircleDashed size={16} />;
  return <CheckCircle2 size={16} />;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p></Card>;
}

function CheckCard({ check }: { check: AuditCheck }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}{check.surface ? ` · ${check.surface}` : ''}</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
        {check.action ? <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-amber-100">{check.action}</p> : null}
        {check.href ? <Link href={check.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open related page <ExternalLink size={12} /></Link> : null}
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusClass(check.status)}`}>{statusIcon(check.status)} {check.status}</span>
    </div>
  </div>;
}

function GroupRows({ groups }: { groups?: Payload['groups'] }) {
  const rows = Object.entries(groups || {}).sort((a, b) => (b[1].fail || 0) - (a[1].fail || 0) || (b[1].warn || 0) - (a[1].warn || 0));
  return <div className="grid gap-2">{rows.map(([group, counts]) => <div key={group} className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted sm:grid-cols-[1fr_repeat(5,72px)]">
    <b className="text-white">{group}</b>
    <span>Total {counts.total || 0}</span>
    <span className="text-emerald-200">Pass {counts.pass || 0}</span>
    <span className="text-amber-200">Warn {counts.warn || 0}</span>
    <span className="text-red-200">Fail {counts.fail || 0}</span>
    <span className="text-sky-200">Skip {counts.skip || 0}</span>
  </div>)}</div>;
}

export function CustomerPublicFlowAuditPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'issues' | 'groups' | 'all'>('issues');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadAudit();
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'Customer public flow blockers found.' : payload.launchStatus === 'review' ? 'Customer public flows pass, but review items remain.' : 'Customer public flow access checks look ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Customer public flow audit failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  const visible = useMemo(() => {
    if (!data) return [];
    if (tab === 'issues') return [...(data.hardBlockers || []), ...(data.reviewItems || [])];
    if (tab === 'all') return data.checks || [];
    return [];
  }, [data, tab]);

  return <div>
    <PageHeader
      title="Customer Public Flow Access Audit"
      subtitle="Read-only launch audit for public customer routes: track order, proof approval, replacement artwork, checkout and payment return validation."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run audit</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${hard ? 'border-red-500/30 bg-red-500/10 text-red-100' : review ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
      {hard ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : <ShieldCheck className="mr-2 inline h-4 w-4" />}
      {hard ? 'Customer public access has blockers. Fix these before public launch.' : review ? 'Customer public access is workable, but review warnings remain.' : 'Customer public access checks look clear.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Status" value={data?.launchStatus || '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} tone={hard ? 'bad' : 'good'} />
      <Metric label="Review" value={review} tone={review ? 'warn' : 'good'} />
      <Metric label="Pass" value={data?.summary?.pass || 0} tone="good" />
      <Metric label="Total checks" value={data?.summary?.total || 0} />
    </div>

    <Card className="mb-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Public but protected by validation</h3>
      <div className="grid gap-2 text-sm text-textMuted md:grid-cols-3">
        {['/track-order', '/proof-action', '/storefront/upload-artwork', '/payment-success', '/payment-cancel', '/checkout'].map((href) => <Link key={href} href={href} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.05] hover:text-white">{href}</Link>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-textMuted">These routes stay public because customers need them. The audit checks that the backend requires order/email/token/session validation before exposing or changing order state.</p>
    </Card>

    <div className="mb-4 flex flex-wrap gap-2">
      {[
        ['issues', `Issues (${hard + review})`],
        ['groups', 'Groups'],
        ['all', `All checks (${data?.summary?.total || 0})`],
      ].map(([value, label]) => <button key={value} onClick={() => setTab(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
    </div>

    {tab === 'groups' ? <Card><h3 className="mb-3 text-sm font-semibold text-white">Checks by group</h3><GroupRows groups={data?.groups} /></Card> : <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">{tab === 'issues' ? 'Blockers and review items' : 'All customer public flow checks'}</h3>
      <div className="grid gap-3">{visible.map((check) => <CheckCard key={check.id} check={check} />)}{!visible.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
    </Card>}
  </div>;
}
