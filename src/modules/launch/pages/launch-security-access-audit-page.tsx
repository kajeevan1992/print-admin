'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type AuditStatus = 'pass' | 'warn' | 'fail';
type AuditCheck = { id: string; group: string; label: string; status: AuditStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type Payload = {
  ok: boolean;
  launchStatus: string;
  summary: Record<string, number>;
  groups: Record<string, Record<string, number>>;
  hardBlockers: AuditCheck[];
  reviewItems: AuditCheck[];
  checks: AuditCheck[];
  surfaces?: Record<string, string[]>;
  generatedAt?: string;
};

async function loadAudit() {
  const response = await fetch('/api/internal/launch/security-access-audit', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Launch security access audit failed to load.');
  return payload as Payload;
}

function tone(status?: AuditStatus | string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function Metric({ label, value, toneName = 'default' }: { label: string; value: string | number; toneName?: 'default' | 'good' | 'warn' | 'bad' }) {
  const text = toneName === 'good' ? 'text-emerald-200' : toneName === 'warn' ? 'text-amber-200' : toneName === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${text}`}>{value}</p></Card>;
}

function StatusIcon({ status }: { status: AuditStatus }) {
  if (status === 'fail') return <AlertTriangle size={16} />;
  if (status === 'warn') return <AlertTriangle size={16} />;
  return <CheckCircle2 size={16} />;
}

function CheckCard({ check }: { check: AuditCheck }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}</p>
        <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
        <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
        {check.action ? <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-amber-100">{check.action}</p> : null}
        {check.href ? <Link href={check.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open related page <ExternalLink size={12} /></Link> : null}
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${tone(check.status)}`}><StatusIcon status={check.status} /> {check.status}</span>
    </div>
  </div>;
}

function GroupTable({ groups }: { groups?: Payload['groups'] }) {
  const rows = Object.entries(groups || {}).sort((a, b) => (b[1].fail || 0) - (a[1].fail || 0) || (b[1].warn || 0) - (a[1].warn || 0));
  return <div className="grid gap-2">{rows.map(([group, counts]) => <div key={group} className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted sm:grid-cols-[1fr_repeat(4,72px)]">
    <b className="text-white">{group}</b>
    <span>Total {counts.total || 0}</span>
    <span className="text-emerald-200">Pass {counts.pass || 0}</span>
    <span className="text-amber-200">Warn {counts.warn || 0}</span>
    <span className="text-red-200">Fail {counts.fail || 0}</span>
  </div>)}</div>;
}

function SurfaceList({ title, items = [], note }: { title: string; items?: string[]; note: string }) {
  return <Card>
    <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
    <p className="mb-3 text-xs leading-5 text-textMuted">{note}</p>
    <div className="grid max-h-[260px] gap-1 overflow-auto rounded-xl border border-white/8 bg-black/10 p-3">
      {items.map((item) => <code key={item} className="text-xs text-sky-100">{item}</code>)}
      {!items.length ? <p className="text-xs text-textMuted">No items reported.</p> : null}
    </div>
  </Card>;
}

export function LaunchSecurityAccessAuditPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'blockers' | 'review' | 'groups' | 'surfaces' | 'all'>('blockers');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadAudit();
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'Security blockers found. Do not launch publicly yet.' : payload.launchStatus === 'review' ? 'No hard security blockers, but review items remain.' : 'Security access audit is clear.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Security audit failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  const visibleChecks = useMemo(() => {
    if (!data) return [] as AuditCheck[];
    if (tab === 'blockers') return data.hardBlockers || [];
    if (tab === 'review') return data.reviewItems || [];
    if (tab === 'all') return data.checks || [];
    return [] as AuditCheck[];
  }, [data, tab]);

  return <div>
    <PageHeader
      title="Launch Security / Access Audit"
      subtitle="Read-only pre-launch audit for admin page protection, internal API exposure, customer public flows, proof/order tracking links and launch test tools."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run security audit</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${tone(data?.launchStatus || 'review')}`}>
      {hard ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : <Lock className="mr-2 inline h-4 w-4" />}
      {hard ? 'Public launch is blocked by security/access issues.' : review ? 'No hard access blockers, but review security warnings before public launch.' : 'Admin/customer access separation looks ready for launch.'}
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Status" value={data?.launchStatus || '—'} toneName={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} toneName={hard ? 'bad' : 'good'} />
      <Metric label="Review" value={review} toneName={review ? 'warn' : 'good'} />
      <Metric label="Pass" value={data?.summary?.pass || 0} toneName="good" />
      <Metric label="Total checks" value={data?.summary?.total || 0} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Security control links</h3>
        <div className="grid gap-2 text-xs font-semibold">
          <Link href="/launch-command-centre" className="text-sky-200 hover:text-white">Launch Command Centre</Link>
          <Link href="/final-launch-blockers" className="text-sky-200 hover:text-white">Final Launch Blockers</Link>
          <Link href="/first-live-order-monitor" className="text-sky-200 hover:text-white">First Live Order Monitor</Link>
          <Link href="/post-launch-health" className="text-sky-200 hover:text-white">Post-launch Health</Link>
          <Link href="/credentials" className="text-sky-200 hover:text-white">Credentials / env review</Link>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">What this audit does</h3>
        <div className="space-y-2 text-sm leading-6 text-textMuted">
          <p>It checks that admin and launch tools are protected by middleware, while customer storefront, checkout, tracking and proof links stay public by design.</p>
          <p>It also checks that admin internal APIs are not in the public storefront API allow-list.</p>
          <p>Mode: <b className="text-white">read-only</b>. This page does not change orders, emails, payments, production tickets or customer data.</p>
        </div>
      </Card>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {[
        ['blockers', `Blockers (${hard})`],
        ['review', `Review (${review})`],
        ['groups', 'Groups'],
        ['surfaces', 'Surfaces'],
        ['all', `All checks (${data?.summary?.total || 0})`],
      ].map(([value, label]) => <button key={value} onClick={() => setTab(value as any)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-sky-400 bg-sky-400/10 text-sky-100' : 'border-white/10 text-textMuted hover:bg-white/[0.04] hover:text-white'}`}>{label}</button>)}
    </div>

    {tab === 'groups' ? <Card><h3 className="mb-3 text-sm font-semibold text-white">Access audit by group</h3><GroupTable groups={data?.groups} /></Card> : null}

    {tab === 'surfaces' ? <div className="grid gap-4 xl:grid-cols-2">
      <SurfaceList title="Admin surfaces" items={data?.surfaces?.adminSurfaces} note="These pages should require an admin session cookie." />
      <SurfaceList title="Public customer surfaces" items={data?.surfaces?.publicCustomerSurfaces} note="These are public by design, but must validate order/email/token inside each flow." />
      <SurfaceList title="Internal admin APIs" items={data?.surfaces?.internalAdminApis} note="These should stay behind the admin session middleware guard." />
      <SurfaceList title="Customer allowed APIs" items={data?.surfaces?.customerAllowedApis} note="These support storefront rendering/pricing and are intentionally available to the public storefront." />
    </div> : null}

    {tab !== 'groups' && tab !== 'surfaces' ? <Card>
      <h3 className="mb-3 text-sm font-semibold text-white">{tab === 'blockers' ? 'Hard security blockers' : tab === 'review' ? 'Security review items' : 'All security checks'}</h3>
      <div className="grid gap-3">{visibleChecks.map((check) => <CheckCard key={check.id} check={check} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">Nothing to show here.</p> : null}</div>
    </Card> : null}
  </div>;
}
