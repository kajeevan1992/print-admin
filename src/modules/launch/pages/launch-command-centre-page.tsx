'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, RefreshCw, Rocket, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

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
type UatTask = {
  id: string;
  stage: 'content' | 'commerce' | 'operations' | 'launch';
  label: string;
  detail: string;
  href: string;
  evidenceHint: string;
  requiredForPublic: boolean;
  status: 'pending' | 'pass' | 'fail' | 'na';
  note: string;
  evidenceUrl: string;
  reviewedBy: string;
  reviewedAt: string;
};
type UatPayload = {
  tenantSlug: string;
  storeSlug: string;
  stores: Array<{ slug: string; name: string }>;
  defaults: { productSlug: string; locationSlug: string; storefrontPaths: string[] };
  items: UatTask[];
  summary: Record<string, number>;
  readyForPublicSignoff: boolean;
  latestSignoff: null | { decision: string; note: string; actorLabel: string; signedAt: string; readiness: Record<string, any> };
  events: Array<{ id: string; taskId: string; action: string; fromStatus: string; toStatus: string; note: string; actorLabel: string; occurredAt: string }>;
};

const stages: Array<{ key: UatTask['stage']; title: string; subtitle: string }> = [
  { key: 'content', title: 'HOLO content and storefront', subtitle: 'Builder, products, navigation, media, domain and SEO.' },
  { key: 'commerce', title: 'Pricing and customer journeys', subtitle: 'Pricing, VAT, fulfilment, payments, accounts, quotes and email.' },
  { key: 'operations', title: 'Production and launch safety', subtitle: 'Artwork, proof, production, dispatch, tracking, security and continuity.' },
  { key: 'launch', title: 'Go-live and aftercare', subtitle: 'Cleanup, final blocker run, first order, monitoring and fallback.' },
];

const operatorLinks: Array<[string, string]> = [
  ['/themes', 'Storefront Builder'],
  ['/final-launch-blockers', 'Final Blockers'],
  ['/live-environment-readiness', 'Live Environment'],
  ['/launch-security-access-audit', 'Security Audit'],
  ['/customer-public-flow-audit', 'Customer Flow Audit'],
  ['/production-smoke-test', 'Smoke Test'],
  ['/storefront-content-readiness', 'Content Readiness'],
  ['/payment-checkout-qa', 'Payment QA'],
  ['/production-planner', 'Production Planner'],
  ['/dispatch-center', 'Dispatch Center'],
  ['/first-live-order-monitor', 'First Live Order'],
  ['/post-launch-health', 'Post-launch Health'],
];

function formatDate(value?: string) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB'); }
function toneFor(status?: CheckStatus | string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review' || status === 'pending') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (status === 'na') return 'border-white/10 bg-white/[0.04] text-textMuted';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}
function metricTone(value: 'good' | 'warn' | 'bad') { return value === 'good' ? 'text-emerald-200' : value === 'bad' ? 'text-red-200' : 'text-amber-200'; }
function Metric({ label, value, tone = 'warn' }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${metricTone(tone)}`}>{value}</p></Card>; }

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'Launch request failed.');
  return payload;
}

function UatTaskCard({ task, saving, patch, save }: { task: UatTask; saving: boolean; patch: (patch: Partial<UatTask>) => void; save: () => void }) {
  return <div className={`rounded-2xl border p-4 ${toneFor(task.status)}`}>
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{task.label}</p>{task.requiredForPublic ? <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">Required</span> : null}</div><p className="mt-1 text-xs leading-5 opacity-90">{task.detail}</p><Link href={task.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open tool <ExternalLink size={12} /></Link></div>
      <Select className="md:w-40" value={task.status} options={[{ value: 'pending', label: 'Pending' }, { value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }, { value: 'na', label: 'Not applicable' }]} onChange={(event) => patch({ status: event.target.value as UatTask['status'] })} />
    </div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)_auto]">
      <textarea className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-sky-400/30 placeholder:text-white/40 focus:ring-2" value={task.note} onChange={(event) => patch({ note: event.target.value })} placeholder={task.evidenceHint} />
      <Input value={task.evidenceUrl} onChange={(event) => patch({ evidenceUrl: event.target.value })} placeholder="Internal path or HTTPS evidence URL" />
      <PrimaryButton disabled={saving} onClick={save}><Save size={14} /> Save result</PrimaryButton>
    </div>
    {task.reviewedAt ? <p className="mt-2 text-[11px] opacity-75">Last reviewed {formatDate(task.reviewedAt)} by {task.reviewedBy || 'staff'}</p> : null}
  </div>;
}

export function LaunchCommandCentrePage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [paths, setPaths] = useState('/business-cards/sidcup\n/flyers/sidcup\n/banners/sidcup');
  const [storeSlug, setStoreSlug] = useState('default-store');
  const [readiness, setReadiness] = useState<BlockerPayload | null>(null);
  const [uat, setUat] = useState<UatPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [savingTask, setSavingTask] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [decision, setDecision] = useState('soft-launch');
  const [signoffNote, setSignoffNote] = useState('');
  const [confirmation, setConfirmation] = useState('');

  async function load(requestedStore = storeSlug) {
    setBusy(true); setError(''); setMessage('');
    try {
      const params = new URLSearchParams({ productSlug, locationSlug });
      if (paths.trim()) params.set('paths', paths.trim());
      const [blockerPayload, uatPayload] = await Promise.all([
        fetchJson(`/api/internal/launch/final-blockers?${params.toString()}`).catch((cause) => ({ ok: false, error: cause instanceof Error ? cause.message : 'Final blockers failed.' })),
        fetchJson(`/api/internal/launch/uat?storeSlug=${encodeURIComponent(requestedStore || 'default-store')}`),
      ]);
      if (blockerPayload.ok === false) setError(blockerPayload.error || 'Final blockers failed to load.');
      else setReadiness(blockerPayload as BlockerPayload);
      const next = uatPayload.data as UatPayload;
      setUat(next); setStoreSlug(next.storeSlug);
      if (next.defaults) {
        setProductSlug((current) => current || next.defaults.productSlug);
        setLocationSlug((current) => current || next.defaults.locationSlug);
        setPaths((current) => current || next.defaults.storefrontPaths.join('\n'));
      }
      setMessage('HOLO launch readiness and persistent UAT evidence refreshed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Launch command centre failed to load.'); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load('default-store'); }, []);

  function patchTask(taskId: string, patch: Partial<UatTask>) {
    setUat((current) => current ? { ...current, items: current.items.map((item) => item.id === taskId ? { ...item, ...patch } : item) } : current);
  }

  async function saveTask(task: UatTask) {
    setSavingTask(task.id); setError(''); setMessage('');
    try {
      const payload = await fetchJson('/api/internal/launch/uat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-task', storeSlug, taskId: task.id, status: task.status, note: task.note, evidenceUrl: task.evidenceUrl }) });
      setUat(payload.data); setMessage(`${task.label} saved with audit evidence.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'UAT task could not be saved.'); }
    finally { setSavingTask(''); }
  }

  async function signOff() {
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = await fetchJson('/api/internal/launch/uat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'signoff', storeSlug, decision, note: signoffNote, confirmation, readiness: { launchStatus: readiness?.launchStatus || 'unknown', confidence: readiness?.confidence || 0, hardBlockers: readiness?.hardBlockers?.length || 0, reviewItems: readiness?.reviewItems?.length || 0, finishedAt: readiness?.finishedAt || '' } }) });
      setUat(payload.data); setSignoffNote(''); setConfirmation(''); setMessage('Launch decision recorded in the immutable sign-off history.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Launch sign-off could not be recorded.'); }
    finally { setBusy(false); }
  }

  const hard = readiness?.hardBlockers?.length || 0;
  const review = readiness?.reviewItems?.length || 0;
  const gaps = readiness?.testGaps?.length || 0;
  const requiredTotal = Number(uat?.summary?.requiredTotal || 0);
  const requiredPass = Number(uat?.summary?.requiredPass || 0);
  const failed = Number(uat?.summary?.fail || 0);
  const pending = Number(uat?.summary?.pending || 0);
  const softLaunch = hard === 0;
  const publicLaunch = hard === 0 && review === 0 && Boolean(uat?.readyForPublicSignoff);
  const confirmationPhrase = decision === 'public-launch' ? 'PUBLIC LAUNCH HOLO PRINT' : decision === 'soft-launch' ? 'SOFT LAUNCH HOLO PRINT' : 'BLOCK HOLO PRINT';
  const upstream = readiness?.upstream as any;
  const signalCards = useMemo(() => [
    { label: 'Final blockers', value: hard ? `${hard} blocked` : review ? `${review} review` : 'Clear', href: '/final-launch-blockers', status: hard ? 'blocked' : review ? 'review' : 'pass' },
    { label: 'Live environment', value: upstream?.liveEnvironmentReadiness?.launchStatus || 'Pending', href: '/live-environment-readiness', status: upstream?.liveEnvironmentReadiness?.launchStatus || 'review' },
    { label: 'Security', value: upstream?.securityAccessAudit?.launchStatus || 'Pending', href: '/launch-security-access-audit', status: upstream?.securityAccessAudit?.launchStatus || 'review' },
    { label: 'Customer flows', value: upstream?.customerPublicFlowAudit?.launchStatus || 'Pending', href: '/customer-public-flow-audit', status: upstream?.customerPublicFlowAudit?.launchStatus || 'review' },
    { label: 'Content', value: upstream?.storefrontContentReadiness?.launchStatus || 'Pending', href: '/storefront-content-readiness', status: upstream?.storefrontContentReadiness?.launchStatus || 'review' },
    { label: 'Theme connection', value: upstream?.themeSaasConnectionAudit?.launchStatus || 'Pending', href: '/theme-saas-connection-audit', status: upstream?.themeSaasConnectionAudit?.launchStatus || 'review' },
  ], [hard, review, upstream]);

  return <div className="space-y-5">
    <PageHeader title="HOLO Launch Command Centre" subtitle="Phase 33 single source of truth for launch hardening, Storefront Builder content setup, evidence-backed end-to-end UAT, sign-off and first-order monitoring." actions={<><Link href="/themes"><Button>Storefront Builder</Button></Link><Button onClick={() => void load(storeSlug)} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void load(storeSlug)} disabled={busy}><Rocket size={14} /> Run readiness</PrimaryButton></>} />
    {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
    {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}

    <div className={`rounded-2xl border p-4 text-sm leading-6 ${publicLaunch ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : softLaunch ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-red-500/30 bg-red-500/10 text-red-100'}`}>
      {publicLaunch ? <ShieldCheck className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
      {publicLaunch ? 'Automated readiness is clear and every required HOLO UAT task has passed. Public-launch sign-off can now be recorded.' : softLaunch ? 'No automated hard blocker is reported, but review items or evidence-backed UAT tasks remain. Keep traffic controlled.' : 'Launch is blocked. Resolve automated hard blockers before taking real customer orders.'}
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
      <Metric label="Confidence" value={readiness ? `${readiness.confidence || 0}%` : '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Automated status" value={readiness?.launchStatus || '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} tone={hard ? 'bad' : 'good'} />
      <Metric label="Review items" value={review} tone={review ? 'warn' : 'good'} />
      <Metric label="Test gaps" value={gaps} tone={gaps ? 'warn' : 'good'} />
      <Metric label="Required UAT" value={`${requiredPass}/${requiredTotal}`} tone={requiredPass === requiredTotal && requiredTotal > 0 ? 'good' : 'warn'} />
      <Metric label="Failed UAT" value={failed} tone={failed ? 'bad' : 'good'} />
      <Metric label="Pending UAT" value={pending} tone={pending ? 'warn' : 'good'} />
    </div>

    <div className="grid gap-4 xl:grid-cols-[330px_1fr]">
      <Card><h3 className="mb-3 text-sm font-semibold text-white">HOLO readiness inputs</h3><div className="grid gap-3"><Select value={storeSlug} options={(uat?.stores || []).map((store) => ({ value: store.slug, label: store.name }))} onChange={(event) => { setStoreSlug(event.target.value); void load(event.target.value); }} /><Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} /><Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} /><textarea value={paths} onChange={(event) => setPaths(event.target.value)} className="min-h-[110px] rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" placeholder="Representative storefront paths" /><PrimaryButton onClick={() => void load(storeSlug)} disabled={busy}>Run HOLO checks</PrimaryButton></div></Card>
      <Card><h3 className="mb-3 text-sm font-semibold text-white">Automated readiness signals</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{signalCards.map((signal) => <div key={signal.label} className={`rounded-xl border p-4 ${toneFor(signal.status)}`}><p className="text-xs uppercase tracking-wide opacity-80">{signal.label}</p><p className="mt-1 text-xl font-semibold capitalize">{signal.value}</p><Link href={signal.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:text-white">Open <ExternalLink size={12} /></Link></div>)}</div><div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-textMuted">Latest automated run: {formatDate(readiness?.finishedAt)}. These checks remain read-only. Staff UAT results below are stored in PostgreSQL with actor, evidence and timestamps.</div></Card>
    </div>

    {stages.map((stage) => <Card key={stage.key}><div className="mb-4"><h3 className="text-base font-semibold text-white">{stage.title}</h3><p className="mt-1 text-xs text-textMuted">{stage.subtitle}</p></div><div className="grid gap-4">{(uat?.items || []).filter((task) => task.stage === stage.key).map((task) => <UatTaskCard key={task.id} task={task} saving={savingTask === task.id} patch={(patch) => patchTask(task.id, patch)} save={() => void saveTask(task)} />)}</div></Card>)}

    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <Card><h3 className="text-base font-semibold text-white">Launch decision and sign-off</h3><p className="mt-1 text-xs leading-5 text-textMuted">Sign-off is append-only. Public launch is rejected by the server until every required task passes and the supplied readiness snapshot has no hard blockers.</p><div className="mt-4 grid gap-3"><Select value={decision} options={[{ value: 'blocked', label: 'Blocked — do not launch' }, { value: 'soft-launch', label: 'Controlled soft launch' }, { value: 'public-launch', label: 'Public launch' }]} onChange={(event) => { setDecision(event.target.value); setConfirmation(''); }} /><textarea className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-sky-400/30 placeholder:text-textMuted focus:ring-2" value={signoffNote} onChange={(event) => setSignoffNote(event.target.value)} placeholder="Decision, accepted risks, owner and monitoring plan" /><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={`Type ${confirmationPhrase}`} /><PrimaryButton disabled={busy || confirmation.trim().toUpperCase() !== confirmationPhrase} onClick={() => void signOff()}><Rocket size={14} /> Record immutable decision</PrimaryButton></div></Card>
      <Card><h3 className="text-base font-semibold text-white">Latest sign-off</h3>{uat?.latestSignoff ? <div className={`mt-3 rounded-xl border p-4 ${toneFor(uat.latestSignoff.decision === 'public-launch' ? 'pass' : uat.latestSignoff.decision === 'blocked' ? 'fail' : 'warn')}`}><p className="text-xl font-semibold capitalize">{uat.latestSignoff.decision.replace(/-/g, ' ')}</p><p className="mt-2 text-sm leading-6">{uat.latestSignoff.note}</p><p className="mt-3 text-xs opacity-80">{uat.latestSignoff.actorLabel} · {formatDate(uat.latestSignoff.signedAt)}</p></div> : <div className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-sm text-textMuted">No launch decision has been recorded yet.</div>}<h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-textMuted">Recent audit activity</h4><div className="mt-2 max-h-64 space-y-2 overflow-auto">{(uat?.events || []).slice(0, 12).map((event) => <div key={event.id} className="rounded-lg border border-white/8 bg-black/20 p-2 text-xs text-textMuted"><p className="font-semibold text-white">{event.action === 'signoff-recorded' ? `Sign-off: ${event.toStatus}` : `${event.taskId}: ${event.fromStatus} → ${event.toStatus}`}</p><p>{event.actorLabel || 'Staff'} · {formatDate(event.occurredAt)}</p>{event.note ? <p className="mt-1 line-clamp-2">{event.note}</p> : null}</div>)}</div></Card>
    </div>

    <Card><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Activity size={16} /> Operator tools</h3><div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">{operatorLinks.map(([href, label]) => <Link key={href} href={href} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-white/[0.06] hover:text-white"><ClipboardCheck className="mr-1 inline h-3 w-3" />{label}</Link>)}</div><p className="mt-4 text-xs leading-5 text-textMuted">This replaces the former browser-only checklist. It extends the existing Launch Command Centre and Storefront Builder; it does not create another CMS, renderer, order, payment, production or dispatch system.</p></Card>
  </div>;
}
