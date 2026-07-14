'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CircleDashed, RefreshCw, SearchCheck, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type ReadinessCheck = { id: string; group: string; label: string; status: CheckStatus; detail: string; action?: string; href?: string; data?: Record<string, any> };
type ReadinessResult = { launchStatus: string; score: number; summary: Record<string, number>; paths: string[]; checks: ReadinessCheck[]; sitemap?: Record<string, any>; robots?: Record<string, any>; audit?: Record<string, any>; mode: string };

async function api(path: string) {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Storefront content readiness failed.');
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
  if (status === 'fail' || status === 'warn') return <AlertTriangle size={16} />;
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
          {check.href ? <Link href={check.href} className="mt-3 inline-flex text-xs font-semibold text-sky-200 hover:text-white">Open related page</Link> : null}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusClass(check.status)}`}>{statusIcon(check.status)} {check.status}</span>
      </div>
    </div>
  );
}

export function StorefrontContentReadinessPage() {
  const [productSlug, setProductSlug] = useState('business-cards');
  const [locationSlug, setLocationSlug] = useState('sidcup');
  const [extraPaths, setExtraPaths] = useState('/flyers/sidcup, /leaflets/sidcup, /banners/sidcup');
  const [group, setGroup] = useState('all');
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ productSlug, locationSlug, paths: extraPaths });
      const data = await api(`/api/internal/launch/storefront-content-readiness?${params.toString()}`);
      setResult(data);
      setMessage(data.launchStatus === 'ready' ? 'Storefront content looks launch-ready.' : data.launchStatus === 'blocked' ? 'Storefront content has hard blockers.' : 'Storefront content needs review before public traffic.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Storefront content readiness failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void run(); }, []);

  const groups = useMemo(() => ['all', ...Array.from(new Set((result?.checks || []).map((check) => check.group)))], [result]);
  const visibleChecks = (result?.checks || []).filter((check) => group === 'all' || check.group === group);
  const blockers = (result?.checks || []).filter((check) => check.status === 'fail');
  const warnings = (result?.checks || []).filter((check) => check.status === 'warn');

  return (
    <div>
      <PageHeader
        title="Storefront Content Readiness"
        subtitle="Read-only SEO and public-page launch checks for homepage, product/location landing pages, sitemap, robots, schema, titles and meta descriptions."
        actions={<><Button onClick={() => void run()} disabled={busy}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void run()} disabled={busy}><SearchCheck size={14} /> Run content checks</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-6">
        <Metric label="Score" value={result ? `${result.score}%` : '—'} />
        <Metric label="Status" value={result?.launchStatus || '—'} />
        <Metric label="Hard blockers" value={blockers.length} />
        <Metric label="Warnings" value={warnings.length} />
        <Metric label="Sitemap URLs" value={result?.sitemap?.count || 0} />
        <Metric label="Checked paths" value={result?.paths?.length || 0} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-white">Launch page controls</h3>
          <div className="grid gap-3">
            <Input placeholder="Main product slug" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} />
            <Input placeholder="Main location slug" value={locationSlug} onChange={(event) => setLocationSlug(event.target.value)} />
            <Input placeholder="Extra paths, comma separated" value={extraPaths} onChange={(event) => setExtraPaths(event.target.value)} />
            <label className="text-xs uppercase tracking-wide text-textMuted">Filter group</label>
            <select value={group} onChange={(event) => setGroup(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text outline-none">
              {groups.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <PrimaryButton onClick={() => void run()} disabled={busy}>Run storefront content checks</PrimaryButton>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck size={16} /> What this protects</h3>
          <div className="space-y-2 text-sm leading-6 text-textMuted">
            <p>This is <b className="text-white">read-only</b>. It does not publish pages or change SEO data.</p>
            <p>It checks whether the most important launch pages have saved SEO records, indexable robots, usable title/meta content, H1, canonical URL, schema, sitemap output and crawl-audit health.</p>
            <p>Use this before sending customers to Google, WhatsApp, Instagram, partner collection pages or paid ads.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white" href="/seo-engine">SEO Engine</Link>
            <Link className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white" href="/robots-txt">Robots.txt</Link>
            <Link className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white" href="/sitemap.xml">Sitemap</Link>
            <Link className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white" href="/final-launch-blockers">Final Launch Blockers</Link>
          </div>
        </Card>
      </div>

      {blockers.length ? <Card className="mb-4 border-red-500/20 bg-red-500/5"><h3 className="mb-3 text-sm font-semibold text-red-100">Hard blockers</h3><div className="grid gap-3">{blockers.map((check) => <CheckCard key={check.id} check={check} />)}</div></Card> : null}
      {warnings.length ? <Card className="mb-4 border-amber-500/20 bg-amber-500/5"><h3 className="mb-3 text-sm font-semibold text-amber-100">Review warnings</h3><div className="grid gap-3">{warnings.slice(0, 10).map((check) => <CheckCard key={check.id} check={check} />)}</div></Card> : null}

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">All storefront content checks</h3>
        <div className="grid gap-3">{visibleChecks.map((check) => <CheckCard key={check.id} check={check} />)}{!visibleChecks.length ? <p className="p-6 text-center text-sm text-textMuted">No checks loaded yet.</p> : null}</div>
      </Card>
    </div>
  );
}
