'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Rocket, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type FinalBlockersPayload = {
  ok?: boolean;
  launchStatus?: string;
  softLaunchAllowed?: boolean;
  confidence?: number;
  summary?: Record<string, number>;
  hardBlockers?: Array<Record<string, any>>;
  reviewItems?: Array<Record<string, any>>;
  testGaps?: Array<Record<string, any>>;
  upstream?: Record<string, any>;
};
type SignOffItem = { id: string; label: string; phase: 'soft' | 'public'; required: boolean; detail: string; href?: string };

const STORAGE_KEY = 'holo-print-launch-sign-off-v1';

const signOffItems: SignOffItem[] = [
  { id: 'final-blockers-clear', phase: 'soft', required: true, label: 'Final blockers checked', detail: 'Final Launch Blockers has been refreshed and no hard blockers remain.', href: '/final-launch-blockers' },
  { id: 'stripe-tested', phase: 'soft', required: true, label: 'Stripe payment path tested', detail: 'A test checkout reaches Stripe and returns through the success/cancel flow.', href: '/production-smoke-test' },
  { id: 'artwork-flow-tested', phase: 'soft', required: true, label: 'Artwork/proof flow tested', detail: 'Upload now, upload later, design-help, proof approval and stale proof guards have been tested.', href: '/launch-test-order' },
  { id: 'production-gates-tested', phase: 'soft', required: true, label: 'Production gates tested', detail: 'Unpaid/unapproved jobs are blocked from production and dispatch.', href: '/production-smoke-test' },
  { id: 'email-ready', phase: 'soft', required: true, label: 'Email sending ready', detail: 'Email status/outbox is checked and queued notifications are safe.', href: '/email-send-controls' },
  { id: 'content-ready', phase: 'public', required: true, label: 'Public SEO/content checked', detail: 'Homepage and priority product/location pages have title, meta, H1, canonical, schema, robots and sitemap checks.', href: '/storefront-content-readiness' },
  { id: 'test-data-cleaned', phase: 'public', required: true, label: 'Launch test data cleaned or isolated', detail: 'TEST-HOLO / BUILD 67 test data is cleaned or clearly isolated before public traffic.', href: '/launch-test-data-cleanup' },
  { id: 'real-order-monitoring', phase: 'public', required: true, label: 'First live orders will be monitored', detail: 'Staff know to watch orders, payments, artwork uploads, proof requests, production and emails during the first real orders.', href: '/orders' },
  { id: 'fallback-process-ready', phase: 'public', required: false, label: 'Manual fallback ready', detail: 'Staff know how to manually contact customer, take payment, upload artwork and hold/release production if an edge case appears.', href: '/orders' },
];

async function loadFinalBlockers(productSlug: string, locationSlug: string, paths: string) {
  const params = new URLSearchParams({ productSlug, locationSlug });
  if (paths.trim()) params.set('paths', paths.trim());
  const response = await fetch(`/api/internal/launch/final-blockers?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Final launch blockers failed to load.');
  return payload as FinalBlockersPayload;
}

function readStored(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStored(value: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'bad' ? 'text-red-200' : 'text-white';
  return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p></Card>;
}

function StatusBanner({ data, softReady, publicReady }: { data: FinalBlockersPayload | null; softReady: boolean; publicReady: boolean }) {
  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  if (publicReady) return <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100"><Rocket className="mr-2 inline h-4 w-4" /> Public launch sign-off looks ready. Keep monitoring the first live orders.</div>;
  if (softReady) return <div className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100"><ShieldCheck className="mr-2 inline h-4 w-4" /> Soft launch sign-off looks ready. Review public-launch checks before pushing traffic hard.</div>;
  if (hard) return <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> Do not launch publicly yet. Hard blockers remain in Final Launch Blockers.</div>;
  return <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> Finish the required sign-off items before launch. Review warnings: {review}.</div>;
}

function SignOffRow({ item, checked, onToggle }: { item: SignOffItem; checked: boolean; onToggle: () => void }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1" />
        <span>
          <span className="block text-sm font-semibold text-white">{item.label} {item.required ? <span className="text-amber-200">*</span> : null}</span>
          <span className="mt-1 block text-sm leading-6 text-textMuted">{item.detail}</span>
          <span className="mt-2 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-xs text-textMuted">{item.phase === 'soft' ? 'Soft launch' : 'Public launch'}</span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {item.href ? <Link href={item.href} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-white/[0.04] hover:text-white">Open</Link> : null}
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${checked ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-textMuted'}`}>{checked ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}{checked ? 'signed' : 'pending'}</span>
      </div>
    </div>
  </div>;
}

export function LaunchSignOffPage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [extraPaths, setExtraPaths] = useState('');
  const [data, setData] = useState<FinalBlockersPayload | null>(null);
  const [signed, setSigned] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSigned(readStored()); }, []);

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const payload = await loadFinalBlockers(productSlug, locationSlug, extraPaths);
      setData(payload);
      setMessage('Launch sign-off checks refreshed from Final Launch Blockers.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Launch sign-off refresh failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function toggle(id: string) {
    setSigned((current) => {
      const next = { ...current, [id]: !current[id] };
      saveStored(next);
      return next;
    });
  }

  function reset() {
    setSigned({});
    saveStored({});
  }

  const hard = data?.hardBlockers?.length || 0;
  const review = data?.reviewItems?.length || 0;
  const gaps = data?.testGaps?.length || 0;
  const requiredSoft = signOffItems.filter((item) => item.phase === 'soft' && item.required);
  const requiredPublic = signOffItems.filter((item) => item.required);
  const softSigned = requiredSoft.filter((item) => signed[item.id]).length;
  const publicSigned = requiredPublic.filter((item) => signed[item.id]).length;
  const softReady = hard === 0 && softSigned === requiredSoft.length;
  const publicReady = hard === 0 && review === 0 && publicSigned === requiredPublic.length;
  const grouped = useMemo(() => ({ soft: signOffItems.filter((item) => item.phase === 'soft'), public: signOffItems.filter((item) => item.phase === 'public') }), []);

  return <div>
    <PageHeader
      title="Launch Sign-off"
      subtitle="Final human sign-off for Holo Print soft launch and public launch. Uses live Final Launch Blockers plus local browser checklist progress."
      actions={<><Button onClick={() => void refresh()} disabled={busy}>Refresh blockers</Button><PrimaryButton onClick={() => void refresh()} disabled={busy}><ShieldCheck size={14} /> Run sign-off check</PrimaryButton></>}
    />

    {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <StatusBanner data={data} softReady={softReady} publicReady={publicReady} />

    <div className="mb-4 grid gap-4 md:grid-cols-6">
      <Metric label="Confidence" value={data ? `${data.confidence || 0}%` : '—'} tone={hard ? 'bad' : review ? 'warn' : 'good'} />
      <Metric label="Hard blockers" value={hard} tone={hard ? 'bad' : 'good'} />
      <Metric label="Review" value={review} tone={review ? 'warn' : 'good'} />
      <Metric label="Test gaps" value={gaps} tone={gaps ? 'warn' : 'good'} />
      <Metric label="Soft sign-off" value={`${softSigned}/${requiredSoft.length}`} tone={softReady ? 'good' : 'warn'} />
      <Metric label="Public sign-off" value={`${publicSigned}/${requiredPublic.length}`} tone={publicReady ? 'good' : 'warn'} />
    </div>

    <div className="mb-4 grid gap-4 xl:grid-cols-[340px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Sign-off controls</h3>
        <div className="grid gap-3">
          <Input placeholder="Product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
          <Input placeholder="Location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
          <textarea value={extraPaths} onChange={(event) => setExtraPaths(event.target.value)} placeholder={'Extra public paths, one per line\n/business-cards/wimbledon\n/flyers/bromley'} className="min-h-[110px] rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
          <PrimaryButton onClick={() => void refresh()} disabled={busy}>Refresh final blockers</PrimaryButton>
          <Button onClick={reset}>Reset local sign-off</Button>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Go-live rule</h3>
        <div className="space-y-2 text-sm leading-6 text-textMuted">
          <p><b className="text-sky-200">Soft launch</b> means you can test with controlled real customers. It requires no hard blockers and all soft-launch items signed.</p>
          <p><b className="text-emerald-200">Public launch</b> means you can send wider traffic. It requires no hard blockers, no review warnings and all required items signed.</p>
          <p>This page is <b className="text-white">read-only</b>. It stores sign-off ticks only in this browser and does not create orders, send emails, or switch the storefront live.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/final-launch-blockers" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-sky-200">Final blockers</Link>
            <Link href="/production-smoke-test" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-sky-200">Smoke test</Link>
            <Link href="/storefront-content-readiness" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-sky-200">Content readiness</Link>
            <Link href="/launch-test-order" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-sky-200">Test order</Link>
          </div>
        </div>
      </Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Soft launch sign-off</h3>
        <div className="grid gap-3">{grouped.soft.map((item) => <SignOffRow key={item.id} item={item} checked={Boolean(signed[item.id])} onToggle={() => toggle(item.id)} />)}</div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Public launch sign-off</h3>
        <div className="grid gap-3">{grouped.public.map((item) => <SignOffRow key={item.id} item={item} checked={Boolean(signed[item.id])} onToggle={() => toggle(item.id)} />)}</div>
      </Card>
    </div>
  </div>;
}
