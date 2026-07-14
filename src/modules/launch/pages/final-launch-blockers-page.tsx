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

function upstreamTone(value: any): 'good' | 'warn' | 'bad' {
  if (!value) return 'warn';
  if (value.ok === false || value.launchStatus === 'blocked') return 'bad';
  if (value.launchStatus === 'review' || value.summary?.warn || value.summary?.warnings) return 'warn';
  return 'good';
}

function UpstreamCard({ title, href, value, detail }: { title: string; href: string; value: any; detail: string }) {
  const tone = upstreamTone(value);
  const border = tone === 'bad' ? 'border-red-500/30 bg-red-500/10' : tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10';
  const status = value?.launchStatus || (value?.ok === true ? 'ready' : value?.ok === false ? 'blocked' : 'not loaded');
  return <Link href={href} className={`rounded-xl border p-4 transition hover:bg-white/[0.05] ${border}`}>
    <p className="text-xs uppercase tracking-wide text-textMuted">{title}</p>
    <p className="mt-2 text-lg font-semibold text-white">{status}</p>
    <p className="mt-2 text-xs leading-5 text-textMuted">{detail}</p>
    {value?.score !== undefined ? <p className="mt-2 text-xs text-textMuted">Score {value.score}%</p> : null}
    {value?.summary ? <p className="mt-1 text-xs text-textMuted">Pass {value.summary.pass || 0} · Warn {value.summary.warn || value.summary.warnings || 0} · Fail {value.summary.fail || value.summary.errors || 0}</p> : null}
  </Link>;
}

export function FinalLaunchBlockersPage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [extraPaths, setExtraPaths] = useState('/business-cards/sidcup, /flyers/sidcup, /leaflets/sidcup, /banners/sidcup, /posters/sidcup');
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'blockers' | 'review' | 'gaps' | 'groups' | 'upstream' | 'all'>('blockers');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ productSlug, locationSlug });
      if (extraPaths.trim()) params.set('paths', extraPaths);
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
  const contentSummary = data?.upstream?.storefrontContentReadiness?.summary;

  return <div>
    <PageHeader
      title="Final Launch Blockers"
      subtitle="One read-only screen for true Holo Print launch blockers across launch readiness, payments, email, VAT, storefront, collection, design-proof approval and public SEO/content readiness."
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
      <Metric label="Content issues" value={(contentSummary?.errors || 0) + (contentSummary?.warnings || 0)} tone={contentSummary?.errors ? 'bad' : contentSummary?.warnings ? 'warn' : 'good'} />
      <Metric label="Total checks" value={data?.summary?.total || 0} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[340px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Final check controls</h3>
        <div className="grid gap-3">
          <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
          <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
          <textarea value={extraPaths} onChange={(event) => setExtraPaths(event.target.value)} placeholder="Extra storefront paths to check, comma separated" className="min-h-[96px] rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
          <p className="text-xs leading-5 text-textMuted">Extra paths are passed into Storefront Content Readiness so launch blockers include the exact public pages you want to push.</p>
          <PrimaryButton onClick={() => void refresh()} disabled={busy}>Run final blockers</PrimaryButton>
          <div className="grid gap-2 text-xs text-textMuted">
            <Link href="/launch-readiness" className="text-sky-200 hover:text-white">Open full launch readiness</Link>
            <Link href="/launch-design-proof-readiness" className="text-sky-200 hover:text-white">Open design proof readiness</Link>
            <Link href="/storefront-content-readiness" className="text-sky-200 hover:text-white">Open storefront content readiness</Link>
            <Link href="/production-smoke-test" className="text-sky-200 hover:text-white">Open production smoke test</Link>
            <Link href="/launch-test-order" className="text-sky-200 hover:text-white">Run launch test order</Link>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Upstream readiness summary</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <UpstreamCard title="Launch readiness" href="/launch-readiness" value={data?.upstream?.launchReadiness} detail="Foundation, locations, payments, email, VAT and collection checks." />
          <UpstreamCard title="Design proof" href="/launch-design-proof-readiness" value={data?.upstream?.designProofReadiness} detail="Design briefs, proof tokens, proof history, quote/payment holds and proof emails." />
          <UpstreamCard title="Storefront content" href="/storefront-content-readiness" value={data?.upstream?.storefrontContentReadiness} detail="Public SEO pages, sitemap, robots, schema, canonical URLs and fallback content." />
        </div>
        <div className="mt-4 space-y-2 text-sm leading-6 text-textMuted">
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
        ['upstream', 'Upstream summary'],
        ['all', `All checks (${data?.summary?.total || 0})`],
      ].map(([value, label]) => <button key={value} onClick={() => setTab(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
    </div>

    {tab === 'groups' ? <Card><h3 className="mb-3 text-sm font-semibold text-white">Readiness by group</h3><GroupTable groups={data?.groups} /></Card> : tab === 'upstream' ? <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">Upstream payload summary</h3>
      <pre className="max-h-[520px] overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-6 text-textMuted">{JSON.stringify(data?.upstream || {}, null, 2)}</pre>
    </Card> : <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">{tab === 'blockers' ? 'Hard blockers' : tab === 'review' ? 'Review warnings' : tab === 'gaps' ? 'Test gaps' : 'All checks'}</h3>
      <div className="grid gap-3">{visibleChecks.map((check) => <CheckCard key={`${check.source}-${check.id}`} check={check} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
    </Card>}
  </div>;
}
