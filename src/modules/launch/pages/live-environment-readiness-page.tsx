'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ServerCog, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type CheckStatus = 'pass' | 'warn' | 'fail';
type ReadinessCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type Payload = {
  ok: boolean;
  launchStatus: string;
  readyForPublicLaunch: boolean;
  summary: Record<string, number>;
  groups: Record<string, Record<string, number>>;
  hardBlockers: ReadinessCheck[];
  reviewItems: ReadinessCheck[];
  checks: ReadinessCheck[];
  upstream?: Record<string, any>;
  generatedAt?: string;
};

async function loadReadiness() {
  const response = await fetch('/api/internal/launch/live-environment-readiness', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Live environment readiness failed.');
  return payload as Payload;
}

function statusClass(status: CheckStatus | string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function statusIcon(status: CheckStatus) {
  if (status === 'fail' || status === 'warn') return <AlertTriangle size={16} />;
  return <CheckCircle2 size={16} />;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const text = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${text}`}>{value}</p></Card>;
}

function CheckCard({ check }: { check: ReadinessCheck }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
        {check.action ? <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-amber-100">{check.action}</p> : null}
        {check.href ? <Link href={check.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open related page <ExternalLink size={12} /></Link> : null}
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusClass(check.status)}`}>{statusIcon(check.status)} {check.status}</span>
    </div>
  </div>;
}

function GroupSummary({ groups }: { groups?: Payload['groups'] }) {
  const rows = Object.entries(groups || {}).sort((a, b) => (b[1].fail || 0) - (a[1].fail || 0) || (b[1].warn || 0) - (a[1].warn || 0));
  return <div className="grid gap-2">{rows.map(([group, counts]) => <div key={group} className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted sm:grid-cols-[1fr_repeat(4,72px)]">
    <b className="text-white">{group}</b>
    <span>Total {counts.total || 0}</span>
    <span className="text-emerald-200">Pass {counts.pass || 0}</span>
    <span className="text-amber-200">Warn {counts.warn || 0}</span>
    <span className="text-red-200">Fail {counts.fail || 0}</span>
  </div>)}</div>;
}

export function LiveEnvironmentReadinessPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'fail' | 'warn'>('all');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadReadiness();
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'Live environment has hard blockers.' : payload.launchStatus === 'review' ? 'Live environment has review items before public launch.' : 'Live environment looks ready for public launch checks.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Live environment readiness failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  const visibleChecks = useMemo(() => {
    const checks = data?.checks || [];
    if (filter === 'fail') return checks.filter((check) => check.status === 'fail');
    if (filter === 'warn') return checks.filter((check) => check.status === 'warn');
    return checks;
  }, [data, filter]);

  return <div>
    <PageHeader
      title="Live Environment Readiness"
      subtitle="Checks the production environment for Stripe live mode, webhook evidence, SMTP/email readiness, public URL/domain, CORS origins, runtime mode and required secret categories."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ServerCog size={14} /> Run live env check</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${statusClass(data?.launchStatus || 'review')}`}>
      {data?.readyForPublicLaunch ? <ShieldCheck className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
      {data?.readyForPublicLaunch ? 'Live environment is clear from this readiness check.' : hard ? 'Do not public launch until hard environment blockers are fixed.' : 'Review environment warnings before public launch.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Status" value={data?.launchStatus || '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} tone={hard ? 'bad' : 'good'} />
      <Metric label="Review" value={review} tone={review ? 'warn' : 'good'} />
      <Metric label="Stripe mode" value={data?.upstream?.stripe?.mode || '—'} tone={data?.upstream?.stripe?.mode === 'live' ? 'good' : 'warn'} />
      <Metric label="Email ready" value={data?.upstream?.email?.readyForLaunchEmails ? 'yes' : 'no'} tone={data?.upstream?.email?.readyForLaunchEmails ? 'good' : 'bad'} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Quick actions</h3>
        <div className="grid gap-2 text-xs font-semibold">
          <Link href="/payment-checkout-qa" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:text-white">Open Stripe/payment QA</Link>
          <Link href="/email-outbox" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:text-white">Open Email Outbox</Link>
          <Link href="/credentials" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:text-white">Open Credentials</Link>
          <Link href="/store-domains" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:text-white">Open Store Domains</Link>
          <Link href="/final-launch-blockers" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:text-white">Open Final Launch Blockers</Link>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Readiness by group</h3>
        <GroupSummary groups={data?.groups} />
      </Card>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {[
        ['all', `All checks (${data?.summary?.total || 0})`],
        ['fail', `Hard blockers (${hard})`],
        ['warn', `Review (${review})`],
      ].map(([value, label]) => <button key={value} onClick={() => setFilter(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${filter === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
    </div>

    <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">Live environment checks</h3>
      <div className="grid gap-3">{visibleChecks.map((check) => <CheckCard key={check.id} check={check} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
      <p className="mt-4 text-xs leading-5 text-textMuted">This page is read-only. It checks presence and status only; it never returns secret values.</p>
    </Card>
  </div>;
}
