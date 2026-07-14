'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDashed, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type LaunchCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; source?: string; data?: Record<string, any> };
type Payload = {
  ok: boolean;
  launchStatus: string;
  softLaunchAllowed: boolean;
  confidence: number;
  productSlug: string;
  locationSlug: string;
  summary: Record<string, number>;
  groups: Record<string, Record<string, number>>;
  hardBlockers: LaunchCheck[];
  reviewItems: LaunchCheck[];
  testGaps: LaunchCheck[];
  nextActions: Array<Record<string, any>>;
  checks: LaunchCheck[];
  upstream?: Record<string, any>;
  finishedAt?: string;
};

async function load(path: string) {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Final launch blockers failed to load.');
  return payload as Payload;
}

function statusClass(status: CheckStatus) {
  if (status === 'fail') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (status === 'skip') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}

function statusIcon(status: CheckStatus) {
  if (status === 'fail') return <AlertTriangle size={16} />;
  if (status === 'warn') return <AlertTriangle size={16} />;
  if (status === 'skip') return <CircleDashed size={16} />;
  return <CheckCircle2 size={16} />;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p></Card>;
}

function CheckCard({ check }: { check: LaunchCheck }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.source || 'readiness'} · {check.group}</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
        {check.action ? <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-amber-100">{check.action}</p> : null}
        {check.href ? <Link className="mt-3 inline-flex text-xs font-semibold text-sky-200 hover:text-white" href={check.href}>Open related page</Link> : null}
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusClass(check.status)}`}>{statusIcon(check.status)} {check.status}</span>
    </div>
  </div>;
}

function GroupTable({ groups }: { groups?: Payload['groups'] }) {
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

export function FinalLaunchBlockersPage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'blockers' | 'review' | 'gaps' | 'groups' | 'all'>('blockers');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ productSlug, locationSlug });
      const payload = await load(`/api/internal/launch/final-blockers?${params.toString()}`);
      setData(payload);
      setMessage(payload.launchStatus === 'ready' ? 'No hard blockers or review warnings found.' : payload.launchStatus === 'blocked' ? 'Hard launch blockers found.' : 'No hard blockers, but review warnings remain.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Final launch blockers failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visibleChecks = useMemo(() => {
    if (!data) return [];
    if (tab === 'blockers') return data.hardBlockers || [];
    if (tab === 'review') return data.reviewItems || [];
    if (tab === 'gaps') return data.testGaps || [];
    if (tab === 'all') return data.checks || [];
    return [];
  }, [data, tab]);

  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  const gaps = data?.testGaps?.length || 0;

  return <div>
    <PageHeader
      title="Final Launch Blockers"
      subtitle="One read-only screen for the true Holo Print launch blockers across launch readiness, payments, email, VAT, storefront, collection and design-proof approval."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run final check</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${hard ? 'border-red-500/30 bg-red-500/10 text-red-100' : review ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
      {hard ? <ShieldAlert className="mr-2 inline h-4 w-4" /> : <ShieldCheck className="mr-2 inline h-4 w-4" />}
      {hard ? 'Launch is blocked. Fix hard blockers before going public.' : review ? 'Soft launch is possible, but review warnings before a public push.' : 'Launch checks look clear.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-6">
      <Metric label="Confidence" value={data ? `${data.confidence}%` : '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Status" value={data?.launchStatus || '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} tone={hard ? 'bad' : 'good'} />
      <Metric label="Review" value={review} tone={review ? 'warn' : 'good'} />
      <Metric label="Test gaps" value={gaps} tone={gaps ? 'warn' : 'good'} />
      <Metric label="Total checks" value={data?.summary?.total || 0} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Final check controls</h3>
        <div className="grid gap-3">
          <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
          <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
          <PrimaryButton onClick={() => void refresh()} disabled={busy}>Run final blockers</PrimaryButton>
          <div className="grid gap-2 text-xs text-textMuted">
            <Link href="/launch-readiness" className="text-sky-200 hover:text-white">Open full launch readiness</Link>
            <Link href="/launch-design-proof-readiness" className="text-sky-200 hover:text-white">Open design proof readiness</Link>
            <Link href="/launch-test-order" className="text-sky-200 hover:text-white">Run launch test order</Link>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">What counts as a blocker?</h3>
        <div className="space-y-2 text-sm leading-6 text-textMuted">
          <p><b className="text-red-200">Hard blockers</b> are failed checks. These should stop public launch.</p>
          <p><b className="text-amber-200">Review items</b> are warnings. They may be acceptable for a monitored soft launch, but should be reviewed.</p>
          <p><b className="text-sky-200">Test gaps</b> usually mean no test data exists yet. They do not always block launch, but they show what has not been proven end-to-end.</p>
          <p>Mode: <b className="text-white">read-only</b>. This page does not create orders, send emails or modify data.</p>
        </div>
      </Card>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {[
        ['blockers', `Hard blockers (${hard})`],
        ['review', `Review (${review})`],
        ['gaps', `Test gaps (${gaps})`],
        ['groups', 'Groups'],
        ['all', `All checks (${data?.summary?.total || 0})`],
      ].map(([value, label]) => <button key={value} onClick={() => setTab(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
    </div>

    {tab === 'groups' ? <Card><h3 className="mb-3 text-sm font-semibold text-white">Readiness by group</h3><GroupTable groups={data?.groups} /></Card> : <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">{tab === 'blockers' ? 'Hard blockers' : tab === 'review' ? 'Review warnings' : tab === 'gaps' ? 'Test gaps' : 'All checks'}</h3>
      <div className="grid gap-3">{visibleChecks.map((check) => <CheckCard key={`${check.source}-${check.id}`} check={check} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
    </Card>}
  </div>;
}
