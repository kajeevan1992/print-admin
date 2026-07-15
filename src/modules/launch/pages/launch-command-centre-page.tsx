'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, RefreshCw, Rocket, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type BlockerPayload = {
  launchStatus?: string;
  softLaunchAllowed?: boolean;
  confidence?: number;
  summary?: Record<string, number>;
  hardBlockers?: Array<Record<string, any>>;
  reviewItems?: Array<Record<string, any>>;
  testGaps?: Array<Record<string, any>>;
  upstream?: Record<string, any>;
  finishedAt?: string;
};

type Task = { id: string; label: string; detail: string; href?: string; stage: 'preflight' | 'live' | 'aftercare'; requiredForPublic?: boolean };

const STORAGE_KEY = 'holo-launch-command-centre-v1';

const tasks: Task[] = [
  { id: 'blockers', stage: 'preflight', label: 'Final blockers checked', detail: 'Run Final Launch Blockers and confirm no hard blockers remain.', href: '/final-launch-blockers', requiredForPublic: true },
  { id: 'security', stage: 'preflight', label: 'Security/access audit checked', detail: 'Confirm admin-only pages, launch tools and internal APIs are protected before public traffic.', href: '/launch-security-access-audit', requiredForPublic: true },
  { id: 'public-flow', stage: 'preflight', label: 'Customer public flow audit checked', detail: 'Confirm track-order, proof approval, replacement artwork, checkout and payment-return routes validate order/email/token/session.', href: '/customer-public-flow-audit', requiredForPublic: true },
  { id: 'live-env', stage: 'preflight', label: 'Live environment checked', detail: 'Confirm Stripe live mode, webhook, SMTP, domain, CORS and secret categories are ready.', href: '/live-environment-readiness', requiredForPublic: true },
  { id: 'signoff', stage: 'preflight', label: 'Sign-off completed', detail: 'Complete soft-launch or public-launch sign-off with the person responsible.', href: '/launch-signoff', requiredForPublic: true },
  { id: 'smoke', stage: 'preflight', label: 'Production smoke test complete', detail: 'Walk through payment, artwork, proof, production, dispatch, email and SEO checks.', href: '/production-smoke-test', requiredForPublic: true },
  { id: 'test-order', stage: 'preflight', label: 'Launch test order created/reviewed', detail: 'Create or inspect a safe TEST-HOLO order and verify it is isolated from production.', href: '/launch-test-order' },
  { id: 'content', stage: 'preflight', label: 'Public content checked', detail: 'Confirm homepage, product/location pages, sitemap, robots, canonical and schema are ready.', href: '/storefront-content-readiness', requiredForPublic: true },
  { id: 'first-live-monitor', stage: 'live', label: 'First live order monitor opened', detail: 'Watch the first real order from payment to artwork/proof, production, email and dispatch.', href: '/first-live-order-monitor', requiredForPublic: true },
  { id: 'stripe', stage: 'live', label: 'Stripe path watched', detail: 'During first live order, watch checkout return, webhook sync and payment status release.', href: '/payment-checkout-qa', requiredForPublic: true },
  { id: 'orders', stage: 'live', label: 'Orders screen watched', detail: 'Confirm first real order appears with customer, fulfilment, VAT, artwork and payment data.', href: '/orders', requiredForPublic: true },
  { id: 'proofing', stage: 'live', label: 'Artwork/proof queue watched', detail: 'Confirm upload-now, upload-later or design-help orders land in the right artwork/proofing queue.', href: '/artwork-preflight' },
  { id: 'production', stage: 'live', label: 'Production release gate watched', detail: 'Confirm unpaid/unapproved work cannot be scheduled, printed or dispatched.', href: '/production-planner', requiredForPublic: true },
  { id: 'email', stage: 'live', label: 'Email outbox watched', detail: 'Confirm customer and staff notifications queue/send as expected without duplicates.', href: '/email-outbox' },
  { id: 'post-health', stage: 'aftercare', label: 'Post-launch health checked', detail: 'Run Post-launch Health after opening to live traffic and confirm no blocked/watch issues remain.', href: '/post-launch-health', requiredForPublic: true },
  { id: 'cleanup', stage: 'aftercare', label: 'Test data cleaned or isolated', detail: 'Confirm TEST-HOLO records remain clearly marked, archived or removed from live reporting.', href: '/launch-test-data-cleanup', requiredForPublic: true },
  { id: 'fallback', stage: 'aftercare', label: 'Manual fallback ready', detail: 'Have a manual plan for quote/payment/artwork follow-up if any automated step misbehaves.', href: '/production-smoke-test', requiredForPublic: true },
];

const operatorLinks: Array<[string, string]> = [
  ['/launch-security-access-audit', 'Security Access Audit'],
  ['/customer-public-flow-audit', 'Customer Public Flow Audit'],
  ['/live-environment-readiness', 'Live Environment Readiness'],
  ['/first-live-order-monitor', 'First Live Order Monitor'],
  ['/post-launch-health', 'Post-launch Health'],
  ['/launch-signoff', 'Launch Sign-off'],
  ['/final-launch-blockers', 'Final Blockers'],
  ['/production-smoke-test', 'Smoke Test'],
  ['/storefront-content-readiness', 'Content Readiness'],
  ['/launch-test-order', 'Test Order'],
  ['/orders', 'Orders'],
  ['/production-planner', 'Production Planner'],
  ['/dispatch-center', 'Dispatch Center'],
  ['/email-outbox', 'Email Outbox'],
];

async function loadFinalBlockers(productSlug: string, locationSlug: string, paths: string) {
  const params = new URLSearchParams({ productSlug, locationSlug });
  if (paths.trim()) params.set('paths', paths.trim());
  const response = await fetch(`/api/internal/launch/final-blockers?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Final blockers failed to load.');
  return payload as BlockerPayload;
}

function loadTicks() {
  if (typeof window === 'undefined') return {} as Record<string, boolean>;
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, boolean>; } catch { return {}; }
}

function saveTicks(next: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function toneFor(status?: CheckStatus | string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const text = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${text}`}>{value}</p></Card>;
}

function StageColumn({ title, stage, ticks, toggle }: { title: string; stage: Task['stage']; ticks: Record<string, boolean>; toggle: (id: string) => void }) {
  return <Card>
    <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
    <div className="grid gap-3">
      {tasks.filter((task) => task.stage === stage).map((task) => <label key={task.id} className="flex cursor-pointer gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted transition hover:bg-white/[0.05]">
        <input type="checkbox" checked={Boolean(ticks[task.id])} onChange={() => toggle(task.id)} className="mt-1" />
        <span className="flex-1">
          <span className="block font-semibold text-white">{task.label}{task.requiredForPublic ? <span className="ml-2 rounded-full border border-amber-500/30 px-2 py-0.5 text-[10px] uppercase text-amber-200">public</span> : null}</span>
          <span className="mt-1 block text-xs leading-5">{task.detail}</span>
          {task.href ? <Link href={task.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open <ExternalLink size={12} /></Link> : null}
        </span>
      </label>)}
    </div>
  </Card>;
}

function UpstreamCard({ label, value, detail, href, status }: { label: string; value: string | number; detail: string; href: string; status?: string }) {
  return <div className={`rounded-xl border p-4 text-sm ${toneFor(status)}`}>
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs uppercase tracking-wide opacity-80">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="mt-1 text-xs leading-5 opacity-90">{detail}</p></div>
      {status === 'blocked' || status === 'fail' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
    </div>
    <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:text-white">Open <ExternalLink size={12} /></Link>
  </div>;
}

function countFrom(summary: any, names: string[]) {
  for (const name of names) {
    const value = Number(summary?.[name] || 0);
    if (value) return value;
  }
  return 0;
}

export function LaunchCommandCentrePage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [paths, setPaths] = useState('/business-cards/sidcup\n/flyers/sidcup\n/banners/sidcup');
  const [data, setData] = useState<BlockerPayload | null>(null);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadFinalBlockers(productSlug, locationSlug, paths);
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'Hard blockers found. Do not go public yet.' : payload.launchStatus === 'review' ? 'No hard blockers, but review items remain.' : 'Launch command centre is clear from blocker checks.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Command centre failed to load.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { setTicks(loadTicks()); void refresh(); }, []);

  function toggle(id: string) {
    const next = { ...ticks, [id]: !ticks[id] };
    setTicks(next); saveTicks(next);
  }

  const complete = useMemo(() => tasks.filter((task) => ticks[task.id]).length, [ticks]);
  const requiredPublic = tasks.filter((task) => task.requiredForPublic);
  const requiredDone = requiredPublic.filter((task) => ticks[task.id]).length;
  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  const gaps = data?.testGaps?.length || 0;
  const softLaunch = !hard;
  const publicLaunch = !hard && !review && requiredDone === requiredPublic.length;
  const upstream = data?.upstream as any;
  const securitySummary = upstream?.securityAccessAudit?.summary;
  const publicFlowSummary = upstream?.customerPublicFlowAudit?.summary;
  const securityBlocked = countFrom(securitySummary, ['blocked', 'fail']);
  const securityWarn = countFrom(securitySummary, ['warn', 'warnings', 'review']);
  const publicFlowBlocked = countFrom(publicFlowSummary, ['blocked', 'fail']);
  const publicFlowWarn = countFrom(publicFlowSummary, ['warn', 'warnings', 'review']);

  return <div>
    <PageHeader
      title="Launch Command Centre"
      subtitle="One operator page for final blockers, security/access, customer public flow validation, live environment, sign-off, smoke testing, public content readiness, first-live-order monitoring and post-launch health."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><Rocket size={14} /> Run command check</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${publicLaunch ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : softLaunch ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-red-500/30 bg-red-500/10 text-red-100'}`}>
      {publicLaunch ? <ShieldCheck className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
      {publicLaunch ? 'Public launch looks signed off from this page.' : softLaunch ? 'Soft launch is possible if you accept the review items and keep monitoring live orders.' : 'Launch is blocked. Fix hard blockers before opening to real traffic.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-6">
      <Metric label="Confidence" value={data ? `${data.confidence || 0}%` : '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Status" value={data?.launchStatus || '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} tone={hard ? 'bad' : 'good'} />
      <Metric label="Customer public" value={publicFlowBlocked ? `${publicFlowBlocked} blocked` : publicFlowWarn ? `${publicFlowWarn} review` : 'Clear'} tone={publicFlowBlocked ? 'bad' : publicFlowWarn ? 'warn' : 'good'} />
      <Metric label="Checklist" value={`${complete}/${tasks.length}`} tone={complete === tasks.length ? 'good' : 'warn'} />
      <Metric label="Public required" value={`${requiredDone}/${requiredPublic.length}`} tone={requiredDone === requiredPublic.length ? 'good' : 'warn'} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Command inputs</h3>
        <div className="grid gap-3">
          <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
          <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
          <textarea value={paths} onChange={(event) => setPaths(event.target.value)} className="min-h-[110px] rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" placeholder="Extra storefront paths" />
          <PrimaryButton onClick={() => void refresh()} disabled={busy}>Refresh command centre</PrimaryButton>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Live readiness signals</h3>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <UpstreamCard label="Final blockers" value={hard ? `${hard} blocked` : 'Clear'} detail={`${review} review items · ${gaps} test gaps`} href="/final-launch-blockers" status={data?.launchStatus} />
          <UpstreamCard label="Security access" value={securityBlocked ? `${securityBlocked} blocked` : securityWarn ? `${securityWarn} review` : 'Clear'} detail="Admin pages, launch tools and internal API exposure." href="/launch-security-access-audit" status={securityBlocked ? 'blocked' : securityWarn ? 'review' : 'pass'} />
          <UpstreamCard label="Customer public" value={publicFlowBlocked ? `${publicFlowBlocked} blocked` : publicFlowWarn ? `${publicFlowWarn} review` : 'Clear'} detail="Track order, proof, upload, checkout and payment validation." href="/customer-public-flow-audit" status={publicFlowBlocked ? 'blocked' : publicFlowWarn ? 'review' : 'pass'} />
          <UpstreamCard label="Live environment" value={ticks['live-env'] ? 'Checked' : 'Pending'} detail="Stripe, webhook, SMTP, domain and CORS readiness." href="/live-environment-readiness" status={ticks['live-env'] ? 'pass' : 'review'} />
          <UpstreamCard label="First live order" value={ticks['first-live-monitor'] ? 'Watched' : 'Pending'} detail="Open monitor during the first real customer order." href="/first-live-order-monitor" status={ticks['first-live-monitor'] ? 'pass' : 'review'} />
          <UpstreamCard label="Post-launch health" value={ticks['post-health'] ? 'Checked' : 'Pending'} detail="Run after opening to live traffic." href="/post-launch-health" status={ticks['post-health'] ? 'pass' : 'review'} />
          <UpstreamCard label="Smoke test" value={ticks.smoke ? 'Checked' : 'Pending'} detail="Use the full smoke-test page before live traffic." href="/production-smoke-test" status={ticks.smoke ? 'pass' : 'review'} />
          <UpstreamCard label="Sign-off" value={ticks.signoff ? 'Signed' : 'Pending'} detail="Use Launch Sign-off for final approval." href="/launch-signoff" status={ticks.signoff ? 'pass' : 'review'} />
        </div>
      </Card>
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-3">
      <StageColumn title="Before launch" stage="preflight" ticks={ticks} toggle={toggle} />
      <StageColumn title="First live order" stage="live" ticks={ticks} toggle={toggle} />
      <StageColumn title="Aftercare" stage="aftercare" ticks={ticks} toggle={toggle} />
    </div>

    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Activity size={16} /> Operator links</h3>
      <div className="grid gap-2 md:grid-cols-4">
        {operatorLinks.map(([href, label]) => <Link key={href} href={href} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-white/[0.06] hover:text-white"><ClipboardCheck className="mr-1 inline h-3 w-3" />{label}</Link>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-textMuted">This page is read-only. Checklist ticks are stored in this browser only; live system status comes from Final Launch Blockers, Security Access Audit, Customer Public Flow Audit, Live Environment Readiness, the First Live Order Monitor and Post-launch Health.</p>
    </Card>
  </div>;
}
