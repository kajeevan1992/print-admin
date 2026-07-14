'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDashed, ClipboardCheck, RefreshCw, Rocket, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type SmokeStep = {
  id: string;
  group: string;
  title: string;
  detail: string;
  expected: string;
  href: string;
  risk: 'blocker' | 'review' | 'test';
};

type SmokeState = Record<string, boolean>;

const STORAGE_KEY = 'holo-print-production-smoke-test-v1';

const steps: SmokeStep[] = [
  {
    id: 'final-blockers-clear',
    group: 'Go / no-go',
    title: 'Final launch blockers checked',
    detail: 'Open the final blockers screen and confirm there are no hard blockers before going public.',
    expected: 'Hard blockers = 0. Review warnings are understood and accepted for soft launch.',
    href: '/final-launch-blockers',
    risk: 'blocker',
  },
  {
    id: 'launch-readiness-main',
    group: 'Go / no-go',
    title: 'Main launch readiness run completed',
    detail: 'Run the read-only launch readiness runner for business-cards / sidcup.',
    expected: 'Database, products, locations, SEO, storefront, collection, payments, email and VAT checks are visible.',
    href: '/launch-readiness',
    risk: 'blocker',
  },
  {
    id: 'stripe-live-or-test-safe',
    group: 'Payments',
    title: 'Stripe checkout verified',
    detail: 'Confirm Stripe keys, publishable key and webhook are configured for the intended launch mode.',
    expected: 'Checkout creates a Stripe URL, success return sync works, webhook event log records test/live events.',
    href: '/api/internal/payments/stripe/status',
    risk: 'blocker',
  },
  {
    id: 'customer-checkout-details',
    group: 'Storefront order',
    title: 'Customer checkout collects fulfilment details',
    detail: 'Place a storefront test basket and confirm phone, company, collection/delivery, delivery address and billing address are captured before payment.',
    expected: 'Order and production ticket contain contactSnapshot, fulfilmentSnapshot, deliveryAddress and billingAddress.',
    href: '/launch-test-order',
    risk: 'blocker',
  },
  {
    id: 'upload-now-preflight',
    group: 'Artwork',
    title: 'Upload-now artwork gate tested',
    detail: 'Test upload-now checkout with a missing file and a bad file; the user should be blocked before Stripe payment starts.',
    expected: 'Checkout shows preflight errors and lets the customer switch to design help or upload later.',
    href: '/artwork-preflight',
    risk: 'blocker',
  },
  {
    id: 'upload-later-track-order',
    group: 'Artwork',
    title: 'Upload-later customer path tested',
    detail: 'Create an upload-later order and verify Track Order tells the customer what to do next.',
    expected: 'Production remains blocked/needs-artwork until artwork is uploaded and reviewed.',
    href: '/track-order',
    risk: 'test',
  },
  {
    id: 'design-proof-e2e',
    group: 'Design proofing',
    title: 'Design-help proof approval test completed',
    detail: 'Run the Design-help proof approval test scenario from Launch Test Order.',
    expected: 'It creates a test order, design brief, production ticket, proof token, proof version, proof event history and proof action link.',
    href: '/launch-test-order',
    risk: 'blocker',
  },
  {
    id: 'proof-stale-link-guard',
    group: 'Design proofing',
    title: 'Old proof link guard confirmed',
    detail: 'Send/resend a proof, then create a new version and confirm older links cannot approve the current proof.',
    expected: 'Only the current proof token/version can approve or request changes.',
    href: '/proof-action',
    risk: 'blocker',
  },
  {
    id: 'staff-proof-review',
    group: 'Design proofing',
    title: 'Staff design brief review checked',
    detail: 'Open Design Briefs and confirm proof history, current review link, resend proof email and proof decision status are visible.',
    expected: 'Staff can see the current proof version/token, event history and customer decision state.',
    href: '/design-briefs',
    risk: 'review',
  },
  {
    id: 'production-payment-gate',
    group: 'Production',
    title: 'Production payment gate verified',
    detail: 'Confirm approved proof jobs are not released to production until print payment is paid/released.',
    expected: 'Unpaid approved jobs show payment-hold; paid approved jobs can release to production.',
    href: '/production-planner',
    risk: 'blocker',
  },
  {
    id: 'dispatch-gate',
    group: 'Dispatch',
    title: 'Dispatch gate verified',
    detail: 'Confirm dispatch refuses blocked/unpaid/unapproved jobs and allows only released jobs.',
    expected: 'Dispatch Center shows payment/proof/production release state before shipment.',
    href: '/dispatch-center',
    risk: 'blocker',
  },
  {
    id: 'email-outbox-safe',
    group: 'Email',
    title: 'Email outbox checked',
    detail: 'Check queued, failed, SMTP missing and missing-recipient emails before launch.',
    expected: 'No failed or missing-recipient customer emails remain. SMTP mode is understood.',
    href: '/email-send-controls',
    risk: 'blocker',
  },
  {
    id: 'customer-pages-working',
    group: 'Customer pages',
    title: 'Customer pages opened',
    detail: 'Open Track Order, Design Brief and Proof Action with test order data and confirm customer wording is clear.',
    expected: 'Customer sees next action, proof history, payment hold/release and upload/design instructions.',
    href: '/track-order',
    risk: 'review',
  },
  {
    id: 'collection-handover',
    group: 'Collection',
    title: 'Collection handover tested',
    detail: 'Run a collection test order and confirm collection pass/PIN and ready collection automation are visible.',
    expected: 'Collection pass exists and staff can mark collected from Collection Handover.',
    href: '/collection-handover',
    risk: 'test',
  },
  {
    id: 'seo-indexing-basics',
    group: 'SEO',
    title: 'SEO basics reviewed',
    detail: 'Review homepage, product-location SEO, sitemap output and noindex warnings.',
    expected: 'Important launch pages are indexable and sitemap has URLs.',
    href: '/seo-engine',
    risk: 'review',
  },
];

function riskClass(risk: SmokeStep['risk']) {
  if (risk === 'blocker') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (risk === 'review') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
}

function StepCard({ step, done, onToggle }: { step: SmokeStep; done: boolean; onToggle: () => void }) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-wide text-textMuted">{step.group}</p>
          <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-textMuted">{step.detail}</p>
          <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-5 text-textMuted"><b className="text-white">Expected:</b> {step.expected}</p>
          <Link href={step.href} className="mt-3 inline-flex text-xs font-semibold text-sky-200 hover:text-white">Open related page</Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${riskClass(step.risk)}`}>{step.risk}</span>
          <button type="button" onClick={onToggle} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-textMuted hover:text-white'}`}>
            {done ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}{done ? 'Done' : 'Mark done'}
          </button>
        </div>
      </div>
    </Card>
  );
}

export function ProductionSmokeTestPage() {
  const [state, setState] = useState<SmokeState>({});
  const [group, setGroup] = useState('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [loaded, state]);

  const groups = useMemo(() => ['all', ...Array.from(new Set(steps.map((step) => step.group)))], []);
  const visibleSteps = steps.filter((step) => group === 'all' || step.group === group);
  const doneCount = steps.filter((step) => state[step.id]).length;
  const blockers = steps.filter((step) => step.risk === 'blocker' && !state[step.id]).length;
  const reviews = steps.filter((step) => step.risk === 'review' && !state[step.id]).length;
  const tests = steps.filter((step) => step.risk === 'test' && !state[step.id]).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  function toggle(id: string) {
    setState((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function reset() {
    setState({});
  }

  function markCriticalDone() {
    const next: SmokeState = { ...state };
    for (const step of steps.filter((item) => item.risk === 'blocker')) next[step.id] = true;
    setState(next);
  }

  return (
    <div>
      <PageHeader
        title="Production Smoke Test"
        subtitle="A practical go-live checklist for Holo Print: storefront checkout, payment, artwork, proofing, production, dispatch, email, collection and SEO."
        actions={<><Button onClick={reset}><RefreshCw size={14} /> Reset</Button><PrimaryButton onClick={markCriticalDone}><ShieldCheck size={14} /> Mark critical done</PrimaryButton></>}
      />

      <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100">
        <Rocket className="mr-2 inline h-4 w-4" /> Use this after every deploy and before public launch. It stores progress only in this browser, so it does not change customer data.
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <Card><p className="text-xs uppercase tracking-wide text-textMuted">Progress</p><p className="mt-2 text-2xl font-semibold text-white">{percent}%</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-textMuted">Done</p><p className="mt-2 text-2xl font-semibold text-white">{doneCount}/{steps.length}</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-textMuted">Critical left</p><p className="mt-2 text-2xl font-semibold text-white">{blockers}</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-textMuted">Review left</p><p className="mt-2 text-2xl font-semibold text-white">{reviews}</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-textMuted">Test gaps</p><p className="mt-2 text-2xl font-semibold text-white">{tests}</p></Card>
      </div>

      {blockers ? <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> Public launch is not safe until the critical items are marked done.</div> : <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" /> Critical smoke-test items are complete. Review warnings and test gaps before public launch.</div>}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Smoke test controls</h3>
            <p className="mt-1 text-sm text-textMuted">Filter by workflow area, open each related module, then mark the step done once verified.</p>
          </div>
          <select value={group} onChange={(event) => setGroup(event.target.value)} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text outline-none">
            {groups.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </Card>

      <div className="grid gap-3">
        {visibleSteps.map((step) => <StepCard key={step.id} step={step} done={Boolean(state[step.id])} onToggle={() => toggle(step.id)} />)}
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><ClipboardCheck size={16} /> Recommended final order</h3>
        <div className="grid gap-2 text-sm leading-6 text-textMuted md:grid-cols-3">
          <p><b className="text-white">1.</b> Run Final Launch Blockers and Launch Readiness.</p>
          <p><b className="text-white">2.</b> Run both Launch Test Order scenarios.</p>
          <p><b className="text-white">3.</b> Place one real Stripe test checkout and follow it into production/dispatch.</p>
        </div>
      </Card>
    </div>
  );
}
