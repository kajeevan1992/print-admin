'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type Check = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type Payload = { ok?: boolean; launchStatus?: string; summary?: Record<string, number>; checks?: Check[]; nextActions?: Array<Record<string, any>>; generatedAt?: string; error?: string };

async function loadAudit() {
  const response = await fetch('/api/internal/launch/public-endpoint-abuse-audit', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Public endpoint abuse audit failed to load.');
  return payload as Payload;
}

function tone(status?: string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (status === 'skip') return 'border-slate-500/30 bg-slate-500/10 text-slate-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function label(status?: string) {
  if (status === 'fail') return 'Blocked';
  if (status === 'warn') return 'Review';
  if (status === 'skip') return 'Skipped';
  return 'Pass';
}

function Metric({ label, value, status }: { label: string; value: string | number; status?: string }) {
  return <Card className={status ? tone(status) : ''}>
    <p className="text-xs uppercase tracking-wide opacity-75">{label}</p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
  </Card>;
}

function CheckCard({ check }: { check: Check }) {
  return <Card className={`border ${tone(check.status)}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide opacity-75">{check.group}</p>
        <h3 className="mt-1 text-sm font-semibold">{check.label}</h3>
      </div>
      <span className="rounded-full border border-current/25 px-2 py-0.5 text-xs font-semibold">{label(check.status)}</span>
    </div>
    <p className="mt-3 text-sm leading-6 opacity-90">{check.detail}</p>
    {check.action ? <p className="mt-2 text-xs leading-5 opacity-80"><strong>Next:</strong> {check.action}</p> : null}
    {check.href ? <Link href={check.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:text-white">Open related page <ExternalLink size={12} /></Link> : null}
  </Card>;
}

export function PublicEndpointAbuseAuditPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadAudit();
      setData(payload);
      setMessage(payload.launchStatus === 'blocked' ? 'Public launch is blocked until abuse/rate-limit risks are reviewed.' : payload.launchStatus === 'review' ? 'Soft launch can continue with manual monitoring, but public launch still needs review.' : 'Public endpoint abuse audit is clear.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Public endpoint abuse audit failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const checks = data?.checks || [];
  const groups = useMemo(() => {
    const map = new Map<string, Check[]>();
    for (const check of checks) map.set(check.group, [...(map.get(check.group) || []), check]);
    return [...map.entries()];
  }, [checks]);

  const summary = data?.summary || {};
  const blocked = Number(summary.fail || 0);
  const warn = Number(summary.warn || 0);
  const status = data?.launchStatus || 'loading';

  return <div>
    <PageHeader
      title="Public Endpoint Abuse Audit"
      subtitle="Checks checkout, proof, tracking, payment return and upload endpoints for rate-limit, bot challenge and abuse-readiness before public traffic."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton asChild><Link href="/final-launch-blockers"><ShieldCheck size={14} /> Final blockers</Link></PrimaryButton></>}
    />

    {message ? <div className={`mb-4 rounded-xl border p-3 text-sm ${tone(status)}`}>{message}</div> : null}

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Status" value={status} status={status === 'blocked' ? 'fail' : status === 'review' ? 'warn' : 'pass'} />
      <Metric label="Blocked" value={blocked} status={blocked ? 'fail' : 'pass'} />
      <Metric label="Review" value={warn} status={warn ? 'warn' : 'pass'} />
      <Metric label="Passed" value={summary.pass || 0} status="pass" />
      <Metric label="Checks" value={summary.total || checks.length || '—'} />
    </div>

    <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${tone(status === 'blocked' ? 'fail' : status === 'review' ? 'warn' : 'pass')}`}>
      {status === 'blocked' ? <AlertTriangle className="mr-2 inline h-4 w-4" /> : <CheckCircle2 className="mr-2 inline h-4 w-4" />}
      {status === 'blocked'
        ? 'Do not go fully public until public write endpoints have durable abuse/rate-limit controls or you accept the risk for a controlled soft launch.'
        : status === 'review'
          ? 'Public endpoints need review. Controlled soft launch is possible if you watch First Live Order Monitor and Post-launch Health closely.'
          : 'Public endpoint abuse readiness is clear from this audit.'}
    </div>

    <div className="mb-4 grid gap-3 md:grid-cols-4">
      {[
        ['/customer-public-flow-audit', 'Customer Public Flow Audit'],
        ['/launch-security-access-audit', 'Security Access Audit'],
        ['/live-environment-readiness', 'Live Environment'],
        ['/first-live-order-monitor', 'First Live Order Monitor'],
      ].map(([href, text]) => <Link key={href} href={href} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-white/[0.06] hover:text-white"><ShieldAlert className="mr-1 inline h-3 w-3" />{text}</Link>)}
    </div>

    <div className="grid gap-5">
      {groups.map(([group, items]) => <section key={group}>
        <h2 className="mb-3 text-sm font-semibold text-white">{group}</h2>
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((check) => <CheckCard key={check.id} check={check} />)}
        </div>
      </section>)}
    </div>
  </div>;
}
