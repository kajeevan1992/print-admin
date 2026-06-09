'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, Play, RefreshCw, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Severity = 'pass' | 'warning' | 'error' | 'info';
type Step = { id: string; label: string; severity: Severity; detail: string; action?: string };
type Scenario = {
  id: string;
  label: string;
  mode: string;
  ready: boolean;
  steps: Step[];
  totals: Record<string, any>;
  paymentDecision: Record<string, any>;
  fulfilment: Record<string, any>;
  order?: Record<string, any>;
  items: Array<Record<string, any>>;
};
type Report = {
  mode: string;
  scenario: string;
  ready: boolean;
  score: number;
  generatedAt: string;
  summary: { scenarios: number; steps: number; pass: number; warning: number; error: number; info: number; testOrdersCreated: number };
  scenarios: Scenario[];
  nextActions: Array<{ label: string; detail: string; action?: string; severity: Severity }>;
};

const scenarioOptions = [
  { value: 'all', label: 'All scenarios' },
  { value: 'mixed-vat', label: 'Mixed VAT leaflet + design add-on' },
  { value: 'standard-vat', label: 'Standard VAT business cards' },
];

function money(value: unknown, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0) / 100);
}
function toneFor(severity: Severity | string) {
  if (severity === 'pass') return 'green';
  if (severity === 'error') return 'red';
  if (severity === 'warning') return 'amber';
  if (severity === 'info') return 'blue';
  return 'default';
}

export function StorefrontOrderTestPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [scenario, setScenario] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function run(action: 'dry-run' | 'create-test-order' = 'dry-run') {
    setBusy(true);
    const res = await fetch('/api/internal/launch/storefront-order-test', {
      method: action === 'dry-run' ? 'GET' : 'POST',
      headers: action === 'dry-run' ? undefined : { 'Content-Type': 'application/json' },
      body: action === 'dry-run' ? undefined : JSON.stringify({ action, scenario }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    setLoading(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Storefront order E2E test failed.');
    setReport(payload.data);
    setSelectedId((current) => current || payload.data?.scenarios?.[0]?.id || '');
    setMessage(action === 'create-test-order' ? `Created ${payload.data?.summary?.testOrdersCreated || 0} test order(s).` : 'Dry-run completed. No order was created.');
  }

  async function dryRunWithScenario(nextScenario = scenario) {
    setBusy(true);
    const params = new URLSearchParams({ scenario: nextScenario });
    const res = await fetch(`/api/internal/launch/storefront-order-test?${params.toString()}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    setLoading(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Storefront order E2E dry-run failed.');
    setReport(payload.data);
    setSelectedId((current) => current || payload.data?.scenarios?.[0]?.id || '');
    setMessage('Dry-run completed. No order was created.');
  }

  useEffect(() => { void dryRunWithScenario().catch((error) => { setMessage(error.message); setLoading(false); setBusy(false); }); }, []);
  const selected = useMemo(() => report?.scenarios?.find((item) => item.id === selectedId) || report?.scenarios?.[0] || null, [report, selectedId]);

  return (
    <div>
      <PageHeader
        title="Storefront Order E2E Test"
        subtitle="Launch QA for SEO landing → product/cart payload → VAT totals → fulfilment → checkout order persistence."
        actions={<><Button onClick={() => void dryRunWithScenario()} disabled={busy}><RefreshCw size={14} /> Dry run</Button><PrimaryButton onClick={() => void run('create-test-order')} disabled={busy || !report?.ready}><Play size={14} /> Create test order</PrimaryButton></>}
      />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><ShoppingCart size={22} className="text-sky-300" /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">E2E score</p><p className="text-4xl font-black text-white">{loading ? '...' : report?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div>
          {report?.ready ? <Notice tone="green"><CheckCircle2 className="mr-2 inline h-4 w-4" />Storefront order flow is ready enough for this E2E test.</Notice> : <Notice tone="amber"><AlertTriangle className="mr-2 inline h-4 w-4" />Fix warnings/errors before launch testing with real customers.</Notice>}
          <p className="mt-3 text-xs text-textMuted">Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : '-'}</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Scenarios" value={report?.summary?.scenarios || 0} />
          <Metric label="Pass" value={report?.summary?.pass || 0} tone="green" />
          <Metric label="Warnings" value={report?.summary?.warning || 0} tone={report?.summary?.warning ? 'amber' : 'green'} />
          <Metric label="Errors" value={report?.summary?.error || 0} tone={report?.summary?.error ? 'red' : 'green'} />
          <Metric label="Info" value={report?.summary?.info || 0} tone="blue" />
          <Metric label="Orders made" value={report?.summary?.testOrdersCreated || 0} tone={report?.summary?.testOrdersCreated ? 'blue' : 'default'} />
          <Metric label="Mode" value={report?.mode || 'dry-run'} />
        </div>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[260px_auto_1fr]">
          <Select value={scenario} onChange={(e) => { setScenario(e.target.value); void dryRunWithScenario(e.target.value); }} options={scenarioOptions} />
          <Button onClick={() => void dryRunWithScenario()} disabled={busy}><ClipboardCheck size={14} /> Run selected</Button>
          <div className="flex items-center text-sm text-textMuted">Create test order only after dry-run has no errors. Test orders use manual review/test unpaid mode.</div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Scenarios</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Running E2E test...</div> : null}
          <div className="divide-y divide-white/6">
            {(report?.scenarios || []).map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`grid w-full gap-2 p-4 text-left hover:bg-white/[0.04] ${selected?.id === item.id ? 'bg-white/[0.06]' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge tone={item.ready ? 'green' : 'red'}>{item.ready ? 'ready' : 'fix'}</Badge><Badge>{item.mode}</Badge></div><p className="mt-2 text-sm font-semibold text-white">{item.label}</p><p className="mt-1 text-xs text-textMuted">{item.steps.length} checks · {money(item.totals?.grossTotalMinor, item.totals?.currency || 'GBP')} gross</p></div>{item.order ? <Badge tone="blue">order created</Badge> : null}</div>
              <div className="grid gap-2 text-xs text-textMuted md:grid-cols-4"><span>Net {money(item.totals?.netTotalMinor, item.totals?.currency || 'GBP')}</span><span>VAT {money(item.totals?.vatTotalMinor, item.totals?.currency || 'GBP')}</span><span>Lines {item.items?.length || 0}</span><span>{item.fulfilment?.label || item.fulfilment?.publicLabel || 'Fulfilment'}</span></div>
            </button>)}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Selected scenario</h3>
            {selected ? <div className="grid gap-3 text-sm"><Read label="Scenario" value={selected.label} /><Read label="Fulfilment" value={selected.fulfilment?.label || selected.fulfilment?.publicLabel || '-'} /><Read label="Payment decision" value={String(selected.paymentDecision?.mode || selected.paymentDecision?.nextAction || 'manual review')} />{selected.order ? <Read label="Test order" value={String(selected.order.orderNumber || selected.order.id)} /> : <Notice tone="blue">No order written in dry-run mode.</Notice>}</div> : <p className="text-sm text-textMuted">No scenario selected.</p>}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Checks</h3>
            <div className="space-y-2">{selected?.steps?.map((step) => <StepCard key={`${step.id}-${step.label}`} step={step} />)}{!selected?.steps?.length ? <Notice>No checks to show.</Notice> : null}</div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Next actions</h3>
            <div className="space-y-2">{(report?.nextActions || []).map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-white">{item.label}</strong><Badge tone={toneFor(item.severity)}>{item.severity}</Badge></div><p className="mt-2 text-xs leading-5 text-textMuted">{item.detail}</p>{item.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p> : null}</div>)}{!report?.nextActions?.length ? <Notice tone="green">No blocking next actions.</Notice> : null}</div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Where to verify after creating a test order</h3>
            <div className="grid gap-2 text-sm"><Quick href="/orders">Open Orders</Quick><Quick href="/artwork-uploads">Open Artwork Uploads</Quick><Quick href="/seo-live-readiness">Open SEO Live Readiness</Quick><Quick href="/tracking-settings">Open Tracking Settings</Quick></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold text-white">{value}</p></Card>; }
function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/10 bg-white/[0.04] text-textMuted'; return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/8 bg-white/[0.03] text-textMuted'; return <div className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${cls}`}>{children}</div>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function StepCard({ step }: { step: Step }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-white">{step.label}</strong><Badge tone={toneFor(step.severity)}>{step.severity}</Badge></div><p className="mt-2 text-xs leading-5 text-textMuted">{step.detail}</p>{step.action ? <p className="mt-2 text-xs leading-5 text-amber-100">Action: {step.action}</p> : null}</div>; }
function Quick({ href, children }: { href: string; children: ReactNode }) { return <a href={href} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.05]">{children}<ExternalLink size={13} /></a>; }
