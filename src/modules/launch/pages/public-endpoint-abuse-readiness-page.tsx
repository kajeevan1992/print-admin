'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type Check = {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

type Endpoint = { id: string; method: string; path: string; group: string; risk: 'low' | 'medium' | 'high'; expectedGuard: string; abuseRisk: string; ownerLink: string };

type Payload = {
  ok?: boolean;
  launchStatus?: string;
  controls?: Record<string, boolean>;
  summary?: Record<string, number>;
  checks?: Check[];
  endpoints?: Endpoint[];
  nextActions?: Array<Record<string, any>>;
  finishedAt?: string;
  error?: string;
};

async function loadReadiness() {
  const response = await fetch('/api/internal/launch/public-endpoint-abuse-readiness', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Public endpoint abuse readiness failed.');
  return payload as Payload;
}

function tone(status?: string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function Metric({ label, value, status }: { label: string; value: string | number; status?: string }) {
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${status === 'bad' ? 'text-red-200' : status === 'warn' ? 'text-amber-200' : 'text-white'}`}>{value}</p></Card>;
}

function StatusBadge({ status }: { status: CheckStatus | string }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tone(status)}`}>{status}</span>;
}

function ControlCard({ label, enabled, detail }: { label: string; enabled?: boolean; detail: string }) {
  return <div className={`rounded-xl border p-4 text-sm ${enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-semibold">{label}</p><p className="mt-1 text-xs leading-5 opacity-90">{detail}</p></div>
      {enabled ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
    </div>
  </div>;
}

function CheckRow({ check }: { check: Check }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{check.group}</p>
        <h3 className="mt-1 font-semibold text-white">{check.label}</h3>
      </div>
      <StatusBadge status={check.status} />
    </div>
    <p className="mt-3 text-xs leading-5 text-textMuted">{check.detail}</p>
    {check.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Next: {check.action}</p> : null}
    {check.href ? <Link href={check.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open related page <ExternalLink size={12} /></Link> : null}
  </div>;
}

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const riskTone = endpoint.risk === 'high' ? 'text-red-200' : endpoint.risk === 'medium' ? 'text-amber-200' : 'text-emerald-200';
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-textMuted">{endpoint.group}</p>
        <h3 className="mt-1 font-mono text-sm font-semibold text-white">{endpoint.method} {endpoint.path}</h3>
      </div>
      <span className={`text-xs font-semibold uppercase ${riskTone}`}>{endpoint.risk} risk</span>
    </div>
    <p className="mt-3 text-xs leading-5 text-textMuted"><span className="text-white">Expected guard:</span> {endpoint.expectedGuard}</p>
    <p className="mt-2 text-xs leading-5 text-textMuted"><span className="text-white">Abuse risk:</span> {endpoint.abuseRisk}</p>
    <Link href={endpoint.ownerLink} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white">Open owner page <ExternalLink size={12} /></Link>
  </div>;
}

export function PublicEndpointAbuseReadinessPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadReadiness();
      setData(payload);
      setMessage(payload.launchStatus === 'ready' ? 'Public endpoint abuse readiness looks clear.' : payload.launchStatus === 'blocked' ? 'Hard abuse-readiness blockers found.' : 'Abuse-readiness review items remain before full public launch.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Public endpoint abuse readiness failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const checks = data?.checks || [];
  const endpoints = data?.endpoints || [];
  const controls = data?.controls || {};
  const summary = data?.summary || {};
  const grouped = useMemo(() => checks.reduce<Record<string, Check[]>>((acc, check) => { (acc[check.group] ||= []).push(check); return acc; }, {}), [checks]);

  return <div>
    <PageHeader
      title="Public Endpoint Abuse Readiness"
      subtitle="Checks checkout, tracking, proof, upload, design brief and pricing endpoints for spam, brute-force and bot-readiness before public traffic."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run abuse check</PrimaryButton></>}
    />

    {message ? <div className={`mb-4 rounded-xl border p-3 text-sm ${tone(data?.launchStatus)}`}>{message}</div> : null}

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Status" value={data?.launchStatus || '—'} status={summary.fail ? 'bad' : summary.warn ? 'warn' : 'good'} />
      <Metric label="Checks" value={summary.total || 0} />
      <Metric label="Pass" value={summary.pass || 0} />
      <Metric label="Review" value={summary.warn || 0} status={(summary.warn || 0) > 0 ? 'warn' : 'good'} />
      <Metric label="Blocked" value={summary.fail || 0} status={(summary.fail || 0) > 0 ? 'bad' : 'good'} />
    </div>

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <ControlCard label="App rate limit" enabled={controls.appRateLimit} detail="Redis/KV or RATE_LIMIT_ENABLED style signal." />
      <ControlCard label="Firewall / Bot" enabled={controls.firewall} detail="Vercel Firewall/BotID or equivalent signal." />
      <ControlCard label="CAPTCHA / Turnstile" enabled={controls.captcha} detail="Human verification available if a public form is abused." />
      <ControlCard label="Upload limits" enabled={controls.uploadLimit} detail="Explicit upload size/type limit signal." />
      <ControlCard label="Security headers" enabled={controls.securityHeaders} detail="Strict headers/HSTS signal for public traffic." />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-white">Checks</h2>
        <div className="grid gap-4">
          {Object.entries(grouped).map(([group, rows]) => <div key={group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textMuted">{group}</h3>
            <div className="grid gap-3">{rows.map((check) => <CheckRow key={check.id} check={check} />)}</div>
          </div>)}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-white">Recommended launch policy</h2>
        <div className="space-y-3 text-xs leading-5 text-textMuted">
          <p><span className="font-semibold text-white">Soft launch:</span> acceptable with manual monitoring if there are no hard blockers and order volume is low.</p>
          <p><span className="font-semibold text-white">Public launch:</span> add or verify rate limiting/firewall coverage for checkout, proof, upload, tracking and design brief endpoints.</p>
          <p><span className="font-semibold text-white">Emergency action:</span> if spam starts, temporarily disable design-help submissions or upload-later forms, then enable CAPTCHA/firewall rules.</p>
        </div>
        <div className="mt-4 grid gap-2">
          <Link href="/final-launch-blockers" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-sky-200 hover:text-white">Final Launch Blockers</Link>
          <Link href="/customer-public-flow-audit" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-sky-200 hover:text-white">Customer Public Flow Audit</Link>
          <Link href="/first-live-order-monitor" className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-sky-200 hover:text-white">First Live Order Monitor</Link>
        </div>
      </Card>
    </div>

    <Card>
      <h2 className="mb-3 text-sm font-semibold text-white">Public endpoints under review</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {endpoints.map((endpoint) => <EndpointRow key={endpoint.id} endpoint={endpoint} />)}
      </div>
    </Card>
  </div>;
}
