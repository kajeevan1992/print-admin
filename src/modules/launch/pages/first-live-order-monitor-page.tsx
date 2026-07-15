'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, CircleDashed, Mail, PackageCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

const STORAGE_KEY = 'holo-first-live-order-monitor-checks-v1';

type MonitorStatus = 'ok' | 'watch' | 'blocked' | 'test-only';
type Risk = { id: string; level: 'info' | 'watch' | 'blocked'; label: string; detail: string; href?: string };
type MonitorItem = {
  order: Record<string, any>;
  ticket?: Record<string, any> | null;
  emails: Array<Record<string, any>>;
  stage: string;
  status: MonitorStatus;
  risks: Risk[];
  links: Record<string, string>;
};
type Payload = {
  ok: boolean;
  launchStatus: string;
  summary: Record<string, number>;
  items: MonitorItem[];
  generatedAt: string;
};

const operatorChecks = [
  { id: 'payment', label: 'Payment has updated from Stripe/manual payment', detail: 'Open the order and confirm payment status is paid/captured/authorized before releasing production.' },
  { id: 'customer-email', label: 'Customer confirmation/payment email checked', detail: 'Check Email Outbox for order confirmation, payment received or proof email status.' },
  { id: 'artwork', label: 'Artwork/design state checked', detail: 'Confirm upload-now, upload-later or design-help flow is visible and correct.' },
  { id: 'proof', label: 'Proof/revision state checked', detail: 'If proof is required, confirm proof approval or revision request is tracked.' },
  { id: 'production', label: 'Production gate checked', detail: 'Confirm ticket can schedule only when payment and proof gates are clear.' },
  { id: 'dispatch', label: 'Dispatch/collection handover checked', detail: 'Confirm dispatch remains blocked until production and payment/proof gates are safe.' },
  { id: 'customer-contact', label: 'Customer contact details checked', detail: 'Confirm phone, email, collection/delivery and billing details are present.' },
  { id: 'notes', label: 'First-order notes added for staff', detail: 'Make sure staff know this is being monitored as the first live order.' },
];

async function load(path: string) {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'First live order monitor failed.');
  return payload as Payload;
}

function loadChecks() {
  if (typeof window === 'undefined') return {} as Record<string, boolean>;
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveChecks(value: Record<string, boolean>) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function statusClass(status: MonitorStatus | string) {
  if (status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'watch') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (status === 'test-only') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}

function statusIcon(status: MonitorStatus | string) {
  if (status === 'blocked') return <AlertTriangle size={16} />;
  if (status === 'watch') return <AlertTriangle size={16} />;
  if (status === 'test-only') return <CircleDashed size={16} />;
  return <CheckCircle2 size={16} />;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p></Card>;
}

function OrderCard({ item }: { item: MonitorItem }) {
  const paymentStatus = item.order.paymentStatus || item.ticket?.paymentStatus || 'unknown';
  return <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{item.stage}</p>
        <h3 className="mt-1 text-base font-semibold text-white">{item.order.orderNumber}</h3>
        <p className="mt-1 text-sm text-textMuted">{item.order.customerName || 'Customer'} · {item.order.customerEmail || 'No email'} · £{Number(item.order.total || 0).toFixed(2)}</p>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusClass(item.status)}`}>{statusIcon(item.status)} {item.status}</span>
    </div>

    <div className="mt-4 grid gap-2 md:grid-cols-4">
      <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-textMuted"><b className="text-white">Order</b><br />{item.order.status || 'unknown'}</div>
      <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-textMuted"><b className="text-white">Payment</b><br />{paymentStatus}</div>
      <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-textMuted"><b className="text-white">Artwork/proof</b><br />{item.ticket?.artworkStatus || item.ticket?.customerProofStatus || (item.order.artworkUploadIds?.length ? 'uploaded' : 'not seen')}</div>
      <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs text-textMuted"><b className="text-white">Email records</b><br />{item.emails.length}</div>
    </div>

    {item.risks?.length ? <div className="mt-4 grid gap-2">
      {item.risks.map((risk) => <div key={`${item.order.id}-${risk.id}`} className={`rounded-xl border p-3 text-xs ${risk.level === 'blocked' ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-amber-500/20 bg-amber-500/10 text-amber-100'}`}><b>{risk.label}</b><br />{risk.detail}{risk.href ? <Link href={risk.href} className="ml-2 font-semibold underline">Open</Link> : null}</div>)}
    </div> : <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">No immediate risks detected for this order.</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      <Link href={item.links.order || '/orders'} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/[0.04]">Open order</Link>
      <Link href={item.links.track || '/track-order'} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/[0.04]">Customer tracking</Link>
      <Link href={item.links.production || '/production-planner'} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/[0.04]">Production</Link>
      <Link href={item.links.emailOutbox || '/email-outbox'} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/[0.04]">Email outbox</Link>
    </div>
  </div>;
}

export function FirstLiveOrderMonitorPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [includeTests, setIncludeTests] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await load(`/api/internal/launch/first-live-order-monitor?limit=12&includeTests=${includeTests ? 'true' : 'false'}`);
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'One or more live orders need urgent attention.' : payload.launchStatus === 'watch' ? 'Live orders loaded with items to watch.' : payload.launchStatus === 'waiting-for-first-order' ? 'No live orders found yet.' : 'Live order monitor looks healthy.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'First live order monitor failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { setChecks(loadChecks()); }, []);
  useEffect(() => { void refresh(); }, [includeTests]);

  const done = useMemo(() => Object.values(checks).filter(Boolean).length, [checks]);
  const orderCount = data?.summary?.total || 0;
  const blocked = data?.summary?.blocked || 0;
  const watch = data?.summary?.watch || 0;

  function toggle(id: string) {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next); saveChecks(next);
  }

  return <div>
    <PageHeader
      title="First Live Order Monitor"
      subtitle="Watch the first real orders from payment to artwork, proofing, production, email and dispatch. Read-only launch-day monitoring."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><Activity size={14} /> Monitor orders</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${blocked ? 'border-red-500/30 bg-red-500/10 text-red-100' : watch ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
      {blocked ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : <ShieldCheck className="mr-2 inline h-4 w-4" />}
      {blocked ? 'Urgent: at least one live order is blocked.' : watch ? 'Orders need monitoring, but no urgent block was detected.' : orderCount ? 'Live order flow looks healthy.' : 'Waiting for the first live order.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-6">
      <Metric label="Live orders" value={orderCount} />
      <Metric label="Healthy" value={data?.summary?.ok || 0} tone="good" />
      <Metric label="Watch" value={watch} tone={watch ? 'warn' : 'good'} />
      <Metric label="Blocked" value={blocked} tone={blocked ? 'bad' : 'good'} />
      <Metric label="Tickets" value={data?.summary?.productionTickets || 0} />
      <Metric label="Emails" value={data?.summary?.emails || 0} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><PackageCheck size={16} /> Operator checklist</h3>
        <p className="mb-3 text-sm text-textMuted">{done}/{operatorChecks.length} checks ticked locally for this browser.</p>
        <div className="grid gap-2">
          {operatorChecks.map((item) => <button key={item.id} onClick={() => toggle(item.id)} className={`rounded-xl border p-3 text-left text-sm transition ${checks[item.id] ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-textMuted hover:bg-white/[0.05]'}`}><b className={checks[item.id] ? 'text-emerald-100' : 'text-white'}>{checks[item.id] ? '✓ ' : ''}{item.label}</b><br /><span className="text-xs">{item.detail}</span></button>)}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Launch-day quick links</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {[['Launch Command Centre', '/launch-command-centre'], ['Final Launch Blockers', '/final-launch-blockers'], ['Launch Sign-off', '/launch-signoff'], ['Production Smoke Test', '/production-smoke-test'], ['Orders', '/orders'], ['Production Planner', '/production-planner'], ['Dispatch Center', '/dispatch-center'], ['Email Outbox', '/email-outbox']].map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white hover:bg-white/[0.06]">{label}</Link>)}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={includeTests} onChange={(event) => setIncludeTests(event.target.checked)} /> Include BUILD 67 test orders</label>
        <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-6 text-textMuted"><Mail className="mr-1 inline h-4 w-4" /> This monitor is read-only. It does not send emails, change order states, release production or dispatch jobs.</div>
      </Card>
    </div>

    <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">Recent live orders</h3>
      <div className="grid gap-3">{(data?.items || []).map((item) => <OrderCard key={item.order.id || item.order.orderNumber} item={item} />)}{!data?.items?.length ? <p className="p-6 text-center text-sm text-textMuted">No live orders found yet. When the first real customer order arrives, it will appear here.</p> : null}</div>
    </Card>
  </div>;
}
