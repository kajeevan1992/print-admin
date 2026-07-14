'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, CreditCard, Mail, Map, PackageCheck, RefreshCw, Rocket, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

type StatusPayload = Record<string, any> & { ok?: boolean; readyForLivePayments?: boolean; readyForLaunchEmails?: boolean; mode?: string; summary?: Record<string, any>; checks?: Array<Record<string, any>> };

const tools = [
  ['Launch Readiness', '/launch-readiness', ShieldCheck, 'Run read-only launch checks across foundation, locations, SEO, storefront, collection, payments, email and VAT.'],
  ['Design Proof Readiness', '/launch-design-proof-readiness', ClipboardCheck, 'Check design-help briefs, proof tokens, proof history, proof emails, revision holds and payment holds before launch.'],
  ['Launch Test Order', '/launch-test-order', PackageCheck, 'Create an opt-in test order to verify VAT, collection pass and notification queueing.'],
  ['Test Data Cleanup', '/launch-test-data-cleanup', Trash2, 'Preview and clean only TEST-HOLO / Build 67 launch test data.'],
  ['Location Manager', '/location-manager', Map, 'Manage stores, branches, collection points and service areas.'],
  ['Collection Handover', '/collection-handover', ClipboardCheck, 'Verify collection passes and mark orders collected.'],
  ['Ready Collection Automation', '/ready-collection-automation', Activity, 'Queue ready-for-collection messages for ready orders.'],
  ['Email Send Controls', '/email-send-controls', Mail, 'Process queued outbox emails through tenant SMTP settings.'],
] as const;

const statusCards = [
  { key: 'stripe', title: 'Stripe payments', href: '/api/internal/payments/stripe/status', icon: CreditCard, readyKey: 'readyForLivePayments', readyLabel: 'Ready for live payments', blockedLabel: 'Payment setup needs review' },
  { key: 'email', title: 'Email notifications', href: '/api/internal/email/status', icon: Mail, readyKey: 'readyForLaunchEmails', readyLabel: 'Ready for launch emails', blockedLabel: 'Email setup needs review' },
  { key: 'designProof', title: 'Design proof readiness', href: '/api/internal/launch/design-proof-readiness', icon: ClipboardCheck, readyKey: 'ok', readyLabel: 'Design proof workflow launch-ready', blockedLabel: 'Design proof workflow needs review' },
] as const;

async function loadJson(path: string) {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `Failed to load ${path}`);
  return payload.data || payload;
}

function checkFailed(check: Record<string, any>) {
  return check.ok === false || check.status === 'fail';
}

function checkWarn(check: Record<string, any>) {
  return check.status === 'warn';
}

function StatusPill({ ready }: { ready: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${ready ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>{ready ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{ready ? 'ready' : 'review'}</span>;
}

function LaunchStatusCard({ config, data, error }: { config: typeof statusCards[number]; data?: StatusPayload; error?: string }) {
  const Icon = config.icon;
  const ready = Boolean(data?.[config.readyKey]);
  const checks = Array.isArray(data?.checks) ? data.checks : [];
  const failed = checks.filter(checkFailed).length;
  const warned = checks.filter(checkWarn).length;
  const summary = data?.summary || {};
  const issueCount = failed || summary.blocking || summary.fail || warned || summary.warn || 0;
  return (
    <Card className="h-full border-white/10 bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-200"><Icon size={18} /></div>
          <div>
            <h3 className="text-base font-semibold text-white">{config.title}</h3>
            <p className="mt-1 text-sm text-textMuted">{error ? error : ready ? config.readyLabel : config.blockedLabel}</p>
          </div>
        </div>
        <StatusPill ready={ready} />
      </div>
      <div className="mt-4 grid gap-2 text-xs text-textMuted sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-panelMuted p-3"><p className="uppercase tracking-wide">Mode</p><p className="mt-1 font-semibold text-white">{data?.mode || data?.launchStatus || '—'}</p></div>
        <div className="rounded-xl border border-white/8 bg-panelMuted p-3"><p className="uppercase tracking-wide">Checks</p><p className="mt-1 font-semibold text-white">{checks.length || summary.total || '—'}</p></div>
        <div className="rounded-xl border border-white/8 bg-panelMuted p-3"><p className="uppercase tracking-wide">Issues</p><p className="mt-1 font-semibold text-white">{issueCount}</p></div>
      </div>
      {config.key === 'email' ? <p className="mt-3 text-xs text-textMuted">Queued {summary.queued || 0} · Failed {summary.failed || 0} · SMTP missing {summary.smtpNotConfigured || 0}</p> : null}
      {config.key === 'stripe' ? <p className="mt-3 text-xs text-textMuted">Webhook: {data?.webhookUrl || 'not loaded yet'}</p> : null}
      {config.key === 'designProof' ? <p className="mt-3 text-xs text-textMuted">Pass {summary.pass || 0} · Warn {summary.warn || 0} · Fail {summary.fail || 0} · Skip {summary.skip || 0}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="inline-flex text-xs font-semibold text-sky-200 hover:text-white" href={config.href}>Open status endpoint</Link>
        {config.key === 'designProof' ? <Link className="inline-flex text-xs font-semibold text-sky-200 hover:text-white" href="/launch-design-proof-readiness">Open readiness page</Link> : null}
      </div>
    </Card>
  );
}

export function LaunchOperationsPage() {
  const [statuses, setStatuses] = useState<Record<string, StatusPayload>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function refreshStatuses() {
    setLoading(true);
    const next: Record<string, StatusPayload> = {};
    const nextErrors: Record<string, string> = {};
    for (const card of statusCards) {
      try {
        next[card.key] = await loadJson(card.href);
      } catch (error) {
        nextErrors[card.key] = error instanceof Error ? error.message : 'Status check failed.';
      }
    }
    setStatuses(next);
    setErrors(nextErrors);
    setLoading(false);
  }

  useEffect(() => { void refreshStatuses(); }, []);

  return (
    <div>
      <PageHeader
        title="Launch Operations"
        subtitle="Quick access to the Holo Print launch tools for readiness checks, test orders, cleanup, locations, collection handover, payments, email sending and design proof approval."
        actions={<><Button onClick={() => void refreshStatuses()} disabled={loading}><RefreshCw size={14} /> Refresh status</Button><Link href="/launch-readiness" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Run Launch Readiness</Link></>}
      />
      <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
        <Rocket className="mr-2 inline h-4 w-4" /> These links reuse existing modules. No duplicate workflows are created here.
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {statusCards.map((card) => <LaunchStatusCard key={card.key} config={card} data={statuses[card.key]} error={errors[card.key]} />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tools.map(([title, href, Icon, body]) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:border-sky-500/40 hover:bg-white/[0.05]">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-200">
                <Icon size={18} />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-textMuted">{body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
