'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type Check = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type Payload = {
  ok?: boolean;
  launchStatus?: string;
  adminConnected?: boolean;
  noDemoDataConfirmed?: boolean;
  strictMode?: boolean;
  answer?: { short?: string; connected?: string; remainingRisk?: string };
  summary?: Record<string, number>;
  checks?: Check[];
  nextActions?: Array<Record<string, any>>;
  finishedAt?: string;
  error?: string;
};

function tone(status?: CheckStatus | string) {
  if (status === 'fail' || status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (status === 'warn' || status === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (status === 'skip') return 'border-slate-500/30 bg-slate-500/10 text-slate-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function badge(status?: CheckStatus | string) {
  const className = `rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone(status)}`;
  return <span className={className}>{status || 'pass'}</span>;
}

function Metric({ label, value, status }: { label: string; value: string | number; status?: CheckStatus | string }) {
  return <Card>
    <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    {status ? <div className="mt-3">{badge(status)}</div> : null}
  </Card>;
}

export function InternalThemeSaasConnectionAuditPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/internal/launch/internal-theme-saas-connection-audit', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      setData(payload);
      setMessage(payload?.answer?.short || payload?.error || 'Audit loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Internal theme audit failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const checks = data?.checks || [];
  const grouped = useMemo(() => checks.reduce((acc, item) => {
    const key = item.group || 'Other';
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Check[]>), [checks]);
  const summary = data?.summary || {};
  const status = data?.launchStatus || 'loading';

  return <div>
    <PageHeader
      title="Internal Theme SaaS Connection Audit"
      subtitle="Checks whether the internal/native Atlantis storefront is controlled by SaaS admin data, backend pricing, VAT, checkout, artwork and production flow — and flags any fallback/demo risk."
      actions={<><Button onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run audit</PrimaryButton></>}
    />

    {message ? <div className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${tone(status)}`}>
      {status === 'ready' ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
      {message}
    </div> : null}

    <div className="mb-4 grid gap-4 md:grid-cols-5">
      <Metric label="Status" value={status} status={status} />
      <Metric label="Admin connected" value={data?.adminConnected ? 'Yes' : data ? 'Review' : '—'} status={data?.adminConnected ? 'pass' : 'warn'} />
      <Metric label="No demo confirmed" value={data?.noDemoDataConfirmed ? 'Yes' : data ? 'Not yet' : '—'} status={data?.noDemoDataConfirmed ? 'pass' : 'warn'} />
      <Metric label="Strict mode" value={data?.strictMode ? 'On' : 'Off'} status={data?.strictMode ? 'pass' : 'warn'} />
      <Metric label="Checks" value={`${summary.pass || 0}/${summary.total || 0}`} status={(summary.fail || 0) ? 'fail' : (summary.warn || 0) ? 'warn' : 'pass'} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-3">
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-white">What is connected</h3>
        <p className="text-sm leading-6 text-textMuted">{data?.answer?.connected || 'Product setup, pricing, VAT and checkout connection are checked here.'}</p>
      </Card>
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-white">Remaining risk</h3>
        <p className="text-sm leading-6 text-textMuted">{data?.answer?.remainingRisk || 'Fallback paths and incomplete admin content are reviewed here.'}</p>
      </Card>
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-white">Recommended next action</h3>
        <p className="text-sm leading-6 text-textMuted">Enable strict admin-data mode or remove product/cart fallback rendering before full public launch, then run Storefront Content Readiness.</p>
      </Card>
    </div>

    <div className="grid gap-4">
      {Object.entries(grouped).map(([group, items]) => <Card key={group}>
        <h3 className="mb-3 text-sm font-semibold text-white">{group}</h3>
        <div className="grid gap-3">
          {items.map((item) => <div key={item.id} className={`rounded-xl border p-4 text-sm ${tone(item.status)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 leading-6 opacity-90">{item.detail}</p>
                {item.action ? <p className="mt-2 text-xs font-semibold opacity-90">Action: {item.action}</p> : null}
              </div>
              {badge(item.status)}
            </div>
            {item.href ? <Link href={item.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:text-white">Open related check <ExternalLink size={12} /></Link> : null}
          </div>)}
        </div>
      </Card>)}
    </div>
  </div>;
}
