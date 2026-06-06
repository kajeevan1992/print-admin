'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDashed, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type ReadinessCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type ReadinessResult = { launchStatus: string; score: number; summary: Record<string, number>; checks: ReadinessCheck[]; nextActions: any[]; mode: string; startedAt: string; finishedAt: string };

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Launch readiness request failed.');
  return payload.data || payload;
}

function statusClass(status: CheckStatus) {
  if (status === 'pass') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'fail') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
}

function statusIcon(status: CheckStatus) {
  if (status === 'pass') return <CheckCircle2 size={16} />;
  if (status === 'fail') return <AlertTriangle size={16} />;
  if (status === 'warn') return <AlertTriangle size={16} />;
  return <CircleDashed size={16} />;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}

function CheckCard({ check }: { check: ReadinessCheck }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{check.label}</h3>
          <p className="mt-2 text-sm leading-6 text-textMuted">{check.detail}</p>
          {check.action ? <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-amber-100">{check.action}</p> : null}
          {check.href ? <Link className="mt-3 inline-flex text-xs font-semibold text-sky-200 hover:text-white" href={check.href}>Open related page</Link> : null}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusClass(check.status)}`}>{statusIcon(check.status)} {check.status}</span>
      </div>
    </div>
  );
}

export function LaunchReadinessRunnerPage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState('all');

  async function run() {
    setBusy(true);
    setMessage('');
    try {
      const data = await api('/api/internal/launch/readiness/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productSlug, locationSlug }),
      });
      setResult(data);
      setMessage(data.launchStatus === 'ready' ? 'Launch readiness looks good.' : data.launchStatus === 'blocked' ? 'Launch is blocked by failed checks.' : 'Launch needs review before going live.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Launch readiness runner failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void run(); }, []);

  const groups = useMemo(() => ['all', ...Array.from(new Set((result?.checks || []).map((check) => check.group)))], [result]);
  const visibleChecks = (result?.checks || []).filter((check) => group === 'all' || check.group === group);

  return (
    <div>
      <PageHeader
        title="Launch Readiness Test Runner"
        subtitle="Read-only launch checks for Holo Print: locations, SEO, collection selector, collection passes, notification queue, email settings and VAT sanity."
        actions={<><Button onClick={() => void run()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void run()} disabled={busy}><ShieldCheck size={14} /> Run checks</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-6">
        <Metric label="Score" value={result ? `${result.score}%` : '—'} />
        <Metric label="Status" value={result?.launchStatus || '—'} />
        <Metric label="Pass" value={result?.summary?.pass || 0} />
        <Metric label="Warn" value={result?.summary?.warn || 0} />
        <Metric label="Fail" value={result?.summary?.fail || 0} />
        <Metric label="Skip" value={result?.summary?.skip || 0} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-white">Runner controls</h3>
          <div className="grid gap-3">
            <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
            <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
            <label className="text-xs uppercase tracking-wide text-textMuted">Filter group</label>
            <select value={group} onChange={(event) => setGroup(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text outline-none">
              {groups.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <PrimaryButton onClick={() => void run()} disabled={busy}>Run readiness checks</PrimaryButton>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-white">Safe mode</h3>
          <div className="space-y-2 text-sm leading-6 text-textMuted">
            <p>This runner is <b className="text-white">read-only</b>. It checks existing systems but does not create test orders, generate collection passes, queue emails or send emails.</p>
            <p>Use it before launch and after each deploy to quickly see what blocks the Holo Print storefront from going live.</p>
            <p>Mode: <b className="text-white">{result?.mode || 'read-only'}</b></p>
          </div>
        </Card>
      </div>

      {result?.nextActions?.length ? (
        <Card className="mb-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3>
          <div className="grid gap-2">
            {result.nextActions.map((item: any) => <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><b className="text-white">{item.label}</b> — {item.action || 'Review this check.'}</div>)}
          </div>
        </Card>
      ) : null}

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Checks</h3>
        <div className="grid gap-3">{visibleChecks.map((check) => <CheckCard key={check.id} check={check} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">No checks loaded yet.</p> : null}</div>
      </Card>
    </div>
  );
}
