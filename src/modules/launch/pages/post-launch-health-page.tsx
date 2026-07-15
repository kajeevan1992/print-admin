'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, HeartPulse, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type HealthLevel = 'ok' | 'watch' | 'blocked';
type HealthCheck = { id: string; group: string; label: string; level: HealthLevel; detail: string; href?: string; action?: string };
type HealthPayload = {
  status: string;
  score: number;
  summary: Record<string, number>;
  checks: HealthCheck[];
  nextActions: Array<Record<string, any>>;
  upstream?: Record<string, any>;
  finishedAt?: string;
};

type AftercareTask = { id: string; label: string; detail: string; href?: string; critical?: boolean };

const STORAGE_KEY = 'holo-post-launch-health-v1';

const aftercareTasks: AftercareTask[] = [
  { id: 'monitor-open', label: 'Monitor kept open', detail: 'Keep Post-launch Health and First Live Order Monitor open during the first live orders.', href: '/first-live-order-monitor', critical: true },
  { id: 'first-order-called', label: 'First live order checked manually', detail: 'Open the first real order and confirm customer, payment, fulfilment, VAT, artwork and ticket state.', href: '/orders', critical: true },
  { id: 'payment-webhook', label: 'Payment webhook verified', detail: 'Confirm Stripe paid/failed/cancelled events are syncing to order and production gates.', href: '/payment-checkout-qa', critical: true },
  { id: 'email-checked', label: 'Email outbox checked', detail: 'Confirm customer/admin emails are sent or queued without duplicates/errors.', href: '/email-outbox', critical: true },
  { id: 'production-gate', label: 'Production gate respected', detail: 'Confirm unpaid/unapproved jobs cannot be printed or dispatched.', href: '/production-planner', critical: true },
  { id: 'customer-track', label: 'Customer tracking checked', detail: 'Open Track Order for the first live order and confirm the next action is clear.', href: '/track-order' },
  { id: 'manual-fallback', label: 'Manual fallback ready', detail: 'Have a fallback message/process ready if artwork, proof, payment or email automation misbehaves.', href: '/production-smoke-test', critical: true },
  { id: 'notes-recorded', label: 'Launch notes recorded', detail: 'Record any issue, workaround and customer follow-up needed after the first live orders.' },
];

function loadTicks() {
  if (typeof window === 'undefined') return {} as Record<string, boolean>;
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, boolean>; } catch { return {}; }
}

function saveTicks(next: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

async function loadHealth(productSlug: string, locationSlug: string, paths: string, limit: string, includeTests: boolean) {
  const params = new URLSearchParams({ productSlug, locationSlug, limit });
  if (paths.trim()) params.set('paths', paths.trim());
  if (includeTests) params.set('includeTests', 'true');
  const response = await fetch(`/api/internal/launch/post-launch-health?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Post-launch health failed to load.');
  return payload as HealthPayload;
}

function levelClass(level?: string) {
  if (level === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (level === 'watch') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const text = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${text}`}>{value}</p></Card>;
}

function CheckCard({ check }: { check: HealthCheck }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
        {check.action ? <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-amber-100">{check.action}</p> : null}
        {check.href ? <Link href={check.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open related page <ExternalLink size={12} /></Link> : null}
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${levelClass(check.level)}`}>{check.level === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {check.level}</span>
    </div>
  </div>;
}

function AftercareChecklist({ ticks, toggle }: { ticks: Record<string, boolean>; toggle: (id: string) => void }) {
  return <Card>
    <h3 className="mb-3 text-sm font-semibold text-white">Aftercare operator checklist</h3>
    <div className="grid gap-3">
      {aftercareTasks.map((task) => <label key={task.id} className="flex cursor-pointer gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted transition hover:bg-white/[0.05]">
        <input type="checkbox" checked={Boolean(ticks[task.id])} onChange={() => toggle(task.id)} className="mt-1" />
        <span className="flex-1">
          <span className="block font-semibold text-white">{task.label}{task.critical ? <span className="ml-2 rounded-full border border-amber-500/30 px-2 py-0.5 text-[10px] uppercase text-amber-200">critical</span> : null}</span>
          <span className="mt-1 block text-xs leading-5">{task.detail}</span>
          {task.href ? <Link href={task.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open <ExternalLink size={12} /></Link> : null}
        </span>
      </label>)}
    </div>
  </Card>;
}

export function PostLaunchHealthPage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [paths, setPaths] = useState('/business-cards/sidcup\n/flyers/sidcup\n/banners/sidcup');
  const [limit, setLimit] = useState('10');
  const [includeTests, setIncludeTests] = useState(false);
  const [data, setData] = useState<HealthPayload | null>(null);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'risks' | 'all' | 'actions'>('risks');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadHealth(productSlug, locationSlug, paths, limit, includeTests);
      setData(payload);
      setMessage(payload.status === 'blocked' ? 'Post-launch health is blocked. Resolve these issues before pushing more traffic.' : payload.status === 'watch' ? 'Post-launch health needs watching. Keep monitoring first orders.' : 'Post-launch health looks good.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Post-launch health failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { setTicks(loadTicks()); void refresh(); }, []);

  function toggle(id: string) {
    const next = { ...ticks, [id]: !ticks[id] };
    setTicks(next); saveTicks(next);
  }

  const blocked = data?.summary?.blocked || 0;
  const watch = data?.summary?.watch || 0;
  const critical = aftercareTasks.filter((task) => task.critical);
  const criticalDone = critical.filter((task) => ticks[task.id]).length;
  const checked = aftercareTasks.filter((task) => ticks[task.id]).length;
  const visibleChecks = useMemo(() => {
    const checks = data?.checks || [];
    if (tab === 'all') return checks;
    if (tab === 'actions') return checks.filter((item) => item.level !== 'ok');
    return checks.filter((item) => item.level === 'blocked' || item.level === 'watch');
  }, [data, tab]);

  return <div>
    <PageHeader
      title="Post-launch Health"
      subtitle="Read-only after-launch monitor for final blockers, live orders, email outbox and production gate health. Use this after opening the storefront to real customers."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><HeartPulse size={14} /> Run health check</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${levelClass(data?.status)}`}>
      {data?.status === 'healthy' ? <ShieldCheck className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
      {data?.status === 'blocked' ? 'Post-launch health is blocked. Resolve before pushing more traffic.' : data?.status === 'watch' ? 'Post-launch health needs watching. Keep orders under manual supervision.' : 'Post-launch health looks clear.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-6">
      <Metric label="Health score" value={data ? `${data.score || 0}%` : '—'} tone={blocked ? 'bad' : watch ? 'warn' : 'good'} />
      <Metric label="Status" value={data?.status || '—'} tone={blocked ? 'bad' : watch ? 'warn' : 'good'} />
      <Metric label="Blocked" value={blocked} tone={blocked ? 'bad' : 'good'} />
      <Metric label="Watch" value={watch} tone={watch ? 'warn' : 'good'} />
      <Metric label="Live orders" value={data?.summary?.liveOrders || 0} />
      <Metric label="Critical checks" value={`${criticalDone}/${critical.length}`} tone={criticalDone === critical.length ? 'good' : 'warn'} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Health inputs</h3>
        <div className="grid gap-3">
          <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
          <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
          <Input placeholder="Order limit" value={limit} onChange={(event) => setLimit(event.target.value)} />
          <textarea value={paths} onChange={(event) => setPaths(event.target.value)} className="min-h-[110px] rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" placeholder="Extra storefront paths" />
          <label className="flex items-center gap-2 text-xs text-textMuted"><input type="checkbox" checked={includeTests} onChange={(event) => setIncludeTests(event.target.checked)} /> Include TEST-HOLO orders</label>
          <PrimaryButton onClick={() => void refresh()} disabled={busy}>Run post-launch health</PrimaryButton>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">What this combines</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/final-launch-blockers" className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-sky-200 hover:bg-white/[0.06]">Final Launch Blockers <ExternalLink className="ml-1 inline h-3 w-3" /></Link>
          <Link href="/first-live-order-monitor" className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-sky-200 hover:bg-white/[0.06]">First Live Order Monitor <ExternalLink className="ml-1 inline h-3 w-3" /></Link>
          <Link href="/email-outbox" className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-sky-200 hover:bg-white/[0.06]">Email Outbox <ExternalLink className="ml-1 inline h-3 w-3" /></Link>
          <Link href="/orders" className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-sky-200 hover:bg-white/[0.06]">Orders <ExternalLink className="ml-1 inline h-3 w-3" /></Link>
          <Link href="/production-planner" className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-sky-200 hover:bg-white/[0.06]">Production Planner <ExternalLink className="ml-1 inline h-3 w-3" /></Link>
          <Link href="/launch-command-centre" className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-sky-200 hover:bg-white/[0.06]">Command Centre <ExternalLink className="ml-1 inline h-3 w-3" /></Link>
        </div>
        <p className="mt-4 text-xs leading-5 text-textMuted">Mode: read-only. This page does not create orders, send emails, release production or dispatch jobs.</p>
      </Card>
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_420px]">
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            ['risks', `Risks (${(data?.checks || []).filter((item) => item.level !== 'ok').length})`],
            ['actions', `Next actions (${data?.nextActions?.length || 0})`],
            ['all', `All checks (${data?.checks?.length || 0})`],
          ].map(([value, label]) => <button key={value} onClick={() => setTab(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
        </div>
        <div className="grid gap-3">{visibleChecks.map((item) => <CheckCard key={item.id} check={item} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
      </Card>
      <AftercareChecklist ticks={ticks} toggle={toggle} />
    </div>

    <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">After-launch position</h3>
      <p className="text-sm leading-6 text-textMuted">{checked}/{aftercareTasks.length} aftercare checks are ticked in this browser. Keep this page open during the first live orders and only increase traffic once blocked and watch items are clear.</p>
    </Card>
  </div>;
}
