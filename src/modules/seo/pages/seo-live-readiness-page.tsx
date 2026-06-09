'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Gauge, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type Severity = 'pass' | 'info' | 'warning' | 'error';
type Check = { id: string; category: string; severity: Severity; title: string; detail: string; action: string; path?: string; link?: string; weight: number };
type Category = { category: string; total: number; errors: number; warnings: number; ready: boolean; checks: Check[] };
type Readiness = {
  score: number;
  grade: string;
  status: string;
  ready: boolean;
  generatedAt: string;
  counts: { pass: number; info: number; warnings: number; errors: number; total: number };
  checks: Check[];
  categories: Category[];
  sourceSummaries: Record<string, any>;
  nextActions: Array<{ title: string; action: string; link?: string; path?: string; severity: Severity }>;
};

const severities = ['all', 'error', 'warning', 'info', 'pass'];
const categories = ['all', 'crawl', 'sitemap', 'robots', 'metadata', 'schema', 'redirects', 'analytics', 'internal-links', 'content', 'storefront'];

function toneFor(severity: Severity | string) {
  if (severity === 'pass') return 'green';
  if (severity === 'error') return 'red';
  if (severity === 'warning') return 'amber';
  if (severity === 'info') return 'blue';
  return 'default';
}
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' '); }
function scoreTone(score: number) { if (score >= 90) return 'green'; if (score >= 75) return 'blue'; if (score >= 55) return 'amber'; return 'red'; }

export function SeoLiveReadinessPage() {
  const [data, setData] = useState<Readiness | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/internal/seo/live-readiness', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO live readiness failed to load.');
    setData(payload.data);
    setLoading(false);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);

  const checks = useMemo(() => {
    const source = data?.checks || [];
    return source.filter((check) => (category === 'all' || check.category === category) && (severity === 'all' || check.severity === severity));
  }, [data, category, severity]);

  const summary = data?.sourceSummaries || {};

  return (
    <div>
      <PageHeader
        title="SEO Live Readiness"
        subtitle="Final pre-launch SEO QA: crawl control, sitemap, metadata, schema, redirects, analytics, internal links and content tasks."
        actions={<><Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => window.open('/sitemap.xml', '_blank')}>Open sitemap</PrimaryButton></>}
      />
      {message ? <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{message}</div> : null}

      <div className="mb-4 grid gap-4 xl:grid-cols-[330px_1fr]">
        <Card className={`border-${scoreTone(data?.score || 0)}-500/30`}>
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><Gauge size={22} className="text-sky-300" /></div><div><p className="text-xs uppercase tracking-wide text-textMuted">Readiness score</p><p className="text-4xl font-black text-white">{loading ? '...' : data?.score ?? 0}<span className="ml-2 text-lg text-textMuted">/100</span></p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><Mini label="Grade" value={data?.grade || '-'} /><Mini label="Status" value={data?.status || 'Loading'} /></div>
          {data?.ready ? <Notice tone="green"><CheckCircle2 className="mr-2 inline h-4 w-4" />Ready enough for SEO launch checks.</Notice> : <Notice tone="amber"><AlertTriangle className="mr-2 inline h-4 w-4" />Not fully ready. Fix errors/warnings before Google push.</Notice>}
          <p className="mt-3 text-xs text-textMuted">Generated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '-'}</p>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Pass" value={data?.counts?.pass || 0} tone="green" />
          <Metric label="Info" value={data?.counts?.info || 0} tone="blue" />
          <Metric label="Warnings" value={data?.counts?.warnings || 0} tone={data?.counts?.warnings ? 'amber' : 'green'} />
          <Metric label="Errors" value={data?.counts?.errors || 0} tone={data?.counts?.errors ? 'red' : 'green'} />
          <Metric label="Sitemap URLs" value={summary?.crawl?.sitemapUrls || 0} tone="blue" />
          <Metric label="Real metrics" value={summary?.analytics?.realMetricPages || 0} tone={summary?.analytics?.realMetricPages ? 'green' : 'amber'} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Top next actions</h3><div className="space-y-2">{(data?.nextActions || []).slice(0, 6).map((item, index) => <Action key={`${item.title}-${index}`} item={item} />)}{!data?.nextActions?.length ? <Notice tone="green">No blocking next actions.</Notice> : null}</div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Source summary</h3><div className="grid gap-2 text-sm text-textMuted"><Read label="Sitemap files" value={String(summary?.crawl?.sitemapFiles || 0)} /><Read label="Robots blocked" value={String(summary?.crawl?.robotsBlocked || 0)} /><Read label="Search Console" value={summary?.searchConsole?.connected ? 'Connected' : 'Not connected'} /><Read label="Content tasks" value={String(summary?.contentQueue?.tasks || 0)} /></div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Quick links</h3><div className="grid gap-2 text-sm"><Quick href="/robots-txt">Robots & Sitemap Control</Quick><Quick href="/seo-engine">SEO Engine</Quick><Quick href="/seo-analytics">SEO Analytics</Quick><Quick href="/seo-search-console">Search Console</Quick><Quick href="/seo-internal-links">Internal Linking</Quick><Quick href="/seo-content-queue">Content Queue</Quick></div></Card>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[180px_180px_1fr]">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((value) => ({ value, label: label(value) }))} />
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)} options={severities.map((value) => ({ value, label: label(value) }))} />
          <div className="flex items-center text-sm text-textMuted">Showing {checks.length} of {data?.checks?.length || 0} readiness checks</div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Category status</h3></div>
          <div className="space-y-2">{(data?.categories || []).map((cat) => <button key={cat.category} onClick={() => setCategory(cat.category)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left hover:bg-white/[0.05]"><div><p className="text-sm font-semibold capitalize text-white">{label(cat.category)}</p><p className="text-xs text-textMuted">{cat.total} checks · {cat.errors} errors · {cat.warnings} warnings</p></div><Badge tone={cat.ready ? 'green' : 'red'}>{cat.ready ? 'Ready' : 'Fix'}</Badge></button>)}</div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Readiness checks</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading readiness report...</div> : null}
          <div className="divide-y divide-white/6">{checks.map((item) => <CheckRow key={item.id} item={item} />)}{!loading && !checks.length ? <div className="p-8 text-center text-sm text-textMuted">No checks match this filter.</div> : null}</div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>; }
function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/10 bg-white/[0.04] text-textMuted'; return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-white/8 bg-white/[0.03] text-textMuted'; return <div className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${cls}`}>{children}</div>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Quick({ href, children }: { href: string; children: ReactNode }) { return <a href={href} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200 hover:bg-white/[0.05]">{children}<ExternalLink size={13} /></a>; }
function Action({ item }: { item: { title: string; action: string; link?: string; path?: string; severity: Severity } }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-white">{item.title}</strong><Badge tone={toneFor(item.severity)}>{item.severity}</Badge></div><p className="mt-2 text-xs leading-5 text-textMuted">{item.action}</p>{item.link ? <a href={item.link} className="mt-2 inline-flex items-center gap-1 text-xs text-sky-200">Open fix area <ExternalLink size={12} /></a> : null}</div>; }
function CheckRow({ item }: { item: Check }) { return <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={toneFor(item.severity)}>{item.severity}</Badge><Badge>{label(item.category)}</Badge>{item.path ? <Badge tone="blue">{item.path}</Badge> : null}</div><h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3></div>{item.link ? <a href={item.link} className="text-xs text-sky-200">Open</a> : null}</div><p className="mt-2 text-sm leading-6 text-textMuted">{item.detail}</p><p className="mt-2 text-xs leading-5 text-amber-100">Action: {item.action}</p></div>; }
