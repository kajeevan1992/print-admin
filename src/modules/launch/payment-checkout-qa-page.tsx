'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Severity = 'pass' | 'warning' | 'error' | 'info';
type Check = { id: string; category: string; severity: Severity; label: string; detail: string; action?: string };
type Report = {
  mode: string;
  ready: boolean;
  score: number;
  generatedAt: string;
  summary: { checks: number; pass: number; warning: number; error: number; info: number };
  stripe: { secretPresent: boolean; publishablePresent: boolean; webhookPresent: boolean; secretMode: string; publishableMode: string };
  checkoutTotals: Record<string, any>;
  e2eSummary: Record<string, any>;
  paymentReadyTestOrder?: Record<string, any> | null;
  checks: Check[];
  nextActions: Array<{ label: string; detail: string; action?: string; severity: Severity; category: string }>;
};

const categories = ['all', 'stripe-config', 'payment-rules', 'checkout-totals', 'order-payment', 'failure-handling', 'e2e'];
const severities = ['all', 'error', 'warning', 'info', 'pass'];
function toneFor(severity: string) { if (severity === 'pass') return 'green'; if (severity === 'error') return 'red'; if (severity === 'warning') return 'amber'; if (severity === 'info') return 'blue'; return 'default'; }
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' '); }
function money(value: unknown, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0) / 100); }

export function PaymentCheckoutQaPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function run(action: 'dry-run' | 'create-payment-test-order' = 'dry-run') {
    setBusy(true);
    const res = await fetch('/api/internal/launch/payment-checkout-qa', {
      method: action === 'dry-run' ? 'GET' : 'POST',
      headers: action === 'dry-run' ? undefined : { 'Content-Type': 'application/json' },
      body: action === 'dry-run' ? undefined : JSON.stringify({ action }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    setLoading(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Payment checkout QA failed.');
    setReport(payload.data);
    setMessage(action === 'create-payment-test-order' ? 'Payment-ready test order created/check completed.' : 'Dry-run completed. No payment test order was created.');
  }

  useEffect(() => { void run('dry-run').catch((error) => { setMessage(error.message); setLoading(false); setBusy(false); }); }, []);
  const checks = useMemo(() => (report?.checks || []).filter((item) => (category === 'all' || item.category === category) && (severity === 'all' || item.severity === severity)), [report, category, severity]);

  return (
    <div>
      <PageHeader
        title="Payment + Checkout QA"
        subtitle="Final launch checks for Stripe config, payment routing, checkout totals, VAT, payment-session eligibility and failure handling."
        actions={<><Button disabled={busy} onClick={() => void run('dry-run')}><RefreshCw size={14} /> Dry run</Button><PrimaryButton disabled={busy || !report?.ready} onClick={() => void run('create-payment-test-order')}><CreditCard size={14} /> Create payment test order</PrimaryButton></>}
      />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><ShieldCheck size={22} className="text-sky-300" /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Payment QA score</p><p className="text-4xl font-black text-white">{loading ? '...' : report?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div>
          {report?.ready ? <Notice tone="green"><CheckCircle2 className="mr-2 inline h-4 w-4" />Payment and checkout checks have no blocking errors.</Notice> : <Notice tone="amber"><AlertTriangle className="mr-2 inline h-4 w-4" />Fix errors/warnings before taking live payments.</Notice>}
          <p className="mt-3 text-xs text-textMuted">Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : '-'}</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Checks" value={report?.summary?.checks || 0} />
          <Metric label="Pass" value={report?.summary?.pass || 0} tone="green" />
          <Metric label="Warnings" value={report?.summary?.warning || 0} tone={report?.summary?.warning ? 'amber' : 'green'} />
          <Metric label="Errors" value={report?.summary?.error || 0} tone={report?.summary?.error ? 'red' : 'green'} />
          <Metric label="Info" value={report?.summary?.info || 0} tone="blue" />
          <Metric label="Stripe secret" value={report?.stripe?.secretMode || 'missing'} tone={report?.stripe?.secretPresent ? 'green' : 'amber'} />
          <Metric label="Mode" value={report?.mode || 'dry-run'} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Stripe config</h3><div className="grid gap-2 text-sm text-textMuted"><Read label="Secret key" value={report?.stripe?.secretPresent ? report.stripe.secretMode : 'missing'} /><Read label="Publishable key" value={report?.stripe?.publishablePresent ? report.stripe.publishableMode : 'missing'} /><Read label="Webhook secret" value={report?.stripe?.webhookPresent ? 'present' : 'missing'} /></div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Checkout totals</h3><div className="grid gap-2 text-sm text-textMuted"><Read label="Cart gross" value={money(report?.checkoutTotals?.grossTotalMinor, report?.checkoutTotals?.currency || 'GBP')} /><Read label="VAT" value={money(report?.checkoutTotals?.vatTotalMinor, report?.checkoutTotals?.currency || 'GBP')} /><Read label="With delivery" value={money(report?.checkoutTotals?.paymentGrossWithDeliveryMinor, report?.checkoutTotals?.currency || 'GBP')} /></div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Quick links</h3><div className="grid gap-2 text-sm"><Quick href="/storefront-order-test">Storefront Order Test</Quick><Quick href="/orders">Orders</Quick><Quick href="/merchant-accounts">Merchant Accounts</Quick><Quick href="/tracking-settings">Tracking Settings</Quick></div></Card>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[190px_190px_1fr]">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((value) => ({ value, label: label(value) }))} />
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)} options={severities.map((value) => ({ value, label: label(value) }))} />
          <div className="flex items-center text-sm text-textMuted">Showing {checks.length} of {report?.checks?.length || 0} checks</div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Payment + checkout checks</div>{loading ? <div className="p-6 text-sm text-textMuted">Running payment QA...</div> : null}<div className="divide-y divide-white/6">{checks.map((item) => <CheckRow key={item.id} item={item} />)}{!loading && !checks.length ? <div className="p-8 text-center text-sm text-textMuted">No checks match this filter.</div> : null}</div></Card>
        <div className="space-y-4">
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3><div className="space-y-2">{(report?.nextActions || []).map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-white">{item.label}</strong><Badge tone={toneFor(item.severity)}>{item.severity}</Badge></div><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>)}{!report?.nextActions?.length ? <Notice tone="green">No blocking next actions.</Notice> : null}</div></Card>
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Payment-ready test order</h3>{report?.paymentReadyTestOrder ? <div className="grid gap-2 text-sm"><Read label="Order" value={String(report.paymentReadyTestOrder.orderNumber || report.paymentReadyTestOrder.id)} /><Read label="Status" value={String(report.paymentReadyTestOrder.status || '-')} /><Read label="Total" value={money(report.paymentReadyTestOrder.totalMinor, report.paymentReadyTestOrder.currency || 'GBP')} /><Quick href="/orders">Open Orders</Quick></div> : <Notice tone="blue">No payment-ready test order created in dry-run mode.</Notice>}</Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold capitalize text-white">{value}</p></Card>; }
function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/10 bg-white/[0.04] text-textMuted'; return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/8 bg-white/[0.03] text-textMuted'; return <div className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${cls}`}>{children}</div>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Quick({ href, children }: { href: string; children: ReactNode }) { return <a href={href} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.05]">{children}<ExternalLink size={13} /></a>; }
function CheckRow({ item }: { item: Check }) { return <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={toneFor(item.severity)}>{item.severity}</Badge><Badge>{label(item.category)}</Badge></div><h3 className="mt-2 text-sm font-semibold text-white">{item.label}</h3></div></div><p className="mt-2 text-sm leading-6 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>; }
