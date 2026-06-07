'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, ExternalLink, Search, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Row = {
  path: string;
  url: string;
  pageType: string;
  status: string;
  indexable: boolean;
  score: number;
  readabilityScore: number;
  errors: string[];
  warnings: string[];
  metric: {
    dateFrom: string;
    dateTo: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    gaUsers: number;
    gaSessions: number;
    gaConversions: number;
    gaRevenueMinor: number;
    source: 'manual' | 'gsc' | 'ga4' | 'mixed' | 'estimate';
    topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
  };
  ctrPercent: number;
  conversionRatePercent: number;
  revenue: number;
  valuePerClickMinor: number;
  opportunity: string;
};

type Totals = { pages: number; clicks: number; impressions: number; ctrPercent: number; gaUsers: number; gaSessions: number; gaConversions: number; conversionRatePercent: number; gaRevenueMinor: number; errors: number; warnings: number; estimated: number; realMetricPages: number };

type Integrations = { recommendedSeoSource: string; recommendedBehaviourSource: string; searchConsoleApi: string; ga4: string; gscConnected: boolean; ga4Configured: boolean };

const pageTypes = ['all', 'home', 'product', 'category', 'location', 'collection-point', 'product-location', 'guide', 'static', 'service-area'];
const statuses = ['all', 'published', 'draft', 'hidden'];
const sources = ['all', 'gsc', 'ga4', 'mixed', 'manual', 'estimate'];

function money(minor = 0) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((minor || 0) / 100); }
function number(value = 0) { return new Intl.NumberFormat('en-GB').format(value || 0); }
function pct(value = 0) { return `${Number(value || 0).toFixed(2)}%`; }
function todayMinus(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
function csv(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }

export function SeoAnalyticsDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ pages: 0, clicks: 0, impressions: 0, ctrPercent: 0, gaUsers: 0, gaSessions: 0, gaConversions: 0, conversionRatePercent: 0, gaRevenueMinor: 0, errors: 0, warnings: 0, estimated: 0, realMetricPages: 0 });
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [search, setSearch] = useState('');
  const [pageType, setPageType] = useState('all');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [selectedPath, setSelectedPath] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [metricForm, setMetricForm] = useState({ path: '', dateFrom: todayMinus(28), dateTo: todayMinus(1), clicks: '0', impressions: '0', position: '0', gaUsers: '0', gaSessions: '0', gaConversions: '0', gaRevenueMinor: '0', source: 'manual', topQueries: '' });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, pageType, status, source });
    const res = await fetch(`/api/internal/seo/analytics?${params.toString()}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO analytics failed to load.');
    setRows(payload.data?.rows || []);
    setTotals(payload.data?.totals || totals);
    setIntegrations(payload.data?.integrations || null);
    setSelectedPath((current) => current || payload.data?.rows?.[0]?.path || '');
    setLoading(false);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);
  const selected = useMemo(() => rows.find((row) => row.path === selectedPath) || rows[0] || null, [rows, selectedPath]);
  useEffect(() => { if (selected) setMetricForm((current) => ({ ...current, path: selected.path })); }, [selected?.path]);

  async function saveMetric() {
    const impressions = Number(metricForm.impressions || 0);
    const clicks = Number(metricForm.clicks || 0);
    const topQueries = csv(metricForm.topQueries).map((query) => ({ query, clicks: 0, impressions: 0, position: Number(metricForm.position || 0) }));
    const metric = { ...metricForm, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: Number(metricForm.position || 0), gaUsers: Number(metricForm.gaUsers || 0), gaSessions: Number(metricForm.gaSessions || 0), gaConversions: Number(metricForm.gaConversions || 0), gaRevenueMinor: Number(metricForm.gaRevenueMinor || 0), topQueries };
    const res = await fetch('/api/internal/seo/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', metric }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Metric save failed.');
    setMessage(`Saved analytics metric for ${metric.path}.`);
    await load();
  }

  async function seedDemoMetrics() {
    const demoRows = rows.slice(0, 8).map((row, index) => {
      const impressions = Math.max(30, 500 - index * 47);
      const clicks = Math.max(1, Math.round(impressions * (index < 3 ? 0.05 : 0.018)));
      return { path: row.path, dateFrom: todayMinus(28), dateTo: todayMinus(1), clicks, impressions, ctr: clicks / impressions, position: 4 + index * 2, gaUsers: clicks, gaSessions: Math.round(clicks * 1.2), gaConversions: index < 2 ? 1 : 0, gaRevenueMinor: index < 2 ? 4500 + index * 2500 : 0, source: 'manual', topQueries: row.metric.topQueries?.length ? row.metric.topQueries : [] };
    });
    const res = await fetch('/api/internal/seo/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'import', rows: demoRows }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Demo import failed.');
    setMessage(`Imported ${payload.data?.count || 0} sample metrics. Replace these with Search Console/GA4 data when connected.`);
    await load();
  }

  return (
    <div>
      <PageHeader title="SEO Analytics" subtitle="Track SEO page performance, Search Console-ready metrics, GA4 behaviour metrics and optimisation opportunities using existing SEO Engine records." actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void seedDemoMetrics()}>Seed sample metrics</Button><PrimaryButton onClick={() => void saveMetric()}>Save metric</PrimaryButton></>} />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-8"><Metric label="SEO pages" value={totals.pages} /><Metric label="Clicks" value={number(totals.clicks)} tone="green" /><Metric label="Impressions" value={number(totals.impressions)} tone="blue" /><Metric label="CTR" value={pct(totals.ctrPercent)} tone="blue" /><Metric label="Avg data pages" value={`${totals.realMetricPages}/${totals.pages}`} /><Metric label="Conversions" value={number(totals.gaConversions)} tone="green" /><Metric label="Conv. rate" value={pct(totals.conversionRatePercent)} tone="green" /><Metric label="Revenue" value={money(totals.gaRevenueMinor)} tone="purple" /></div>
      <Card className="mb-4"><div className="grid gap-3 md:grid-cols-[1fr_170px_170px_160px_auto]"><Input placeholder="Search path, title, product, location..." value={search} onChange={(e) => setSearch(e.target.value)} /><Select value={pageType} onChange={(e) => setPageType(e.target.value)} options={pageTypes.map((value) => ({ value, label: value === 'all' ? 'All page types' : value }))} /><Select value={status} onChange={(e) => setStatus(e.target.value)} options={statuses.map((value) => ({ value, label: value === 'all' ? 'All statuses' : value }))} /><Select value={source} onChange={(e) => setSource(e.target.value)} options={sources.map((value) => ({ value, label: value === 'all' ? 'All data sources' : value }))} /><Button onClick={() => void load()}><Search size={14} /> Apply</Button></div></Card>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">SEO page performance</div>{loading ? <div className="p-6 text-sm text-textMuted">Loading analytics...</div> : null}<div className="divide-y divide-white/6">{rows.map((row) => <button key={row.path} onClick={() => setSelectedPath(row.path)} className={`grid w-full gap-2 p-4 text-left hover:bg-white/[0.04] ${selectedPath === row.path ? 'bg-white/[0.06]' : ''}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{row.path}</p><p className="mt-1 text-xs text-textMuted">{row.pageType} · {row.status} · {row.metric.source}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs ${row.indexable ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>{row.indexable ? 'indexable' : 'not indexable'}</span></div><div className="grid gap-2 text-xs text-textMuted md:grid-cols-6"><span>{number(row.metric.clicks)} clicks</span><span>{number(row.metric.impressions)} impr.</span><span>{pct(row.ctrPercent)} CTR</span><span>pos {row.metric.position || '-'}</span><span>{number(row.metric.gaConversions)} conv.</span><span>{money(row.metric.gaRevenueMinor)}</span></div><p className="text-xs text-amber-100">{row.opportunity}</p></button>)}{!loading && !rows.length ? <div className="p-8 text-center text-sm text-textMuted">No SEO analytics rows found.</div> : null}</div></Card>
        <div className="space-y-4"><Card><div className="mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Selected page details</h3></div>{selected ? <div className="space-y-3 text-sm"><Read label="URL" value={selected.url} link /><div className="grid gap-3 md:grid-cols-2"><Mini label="SEO score" value={`${selected.score}/100`} /><Mini label="Readability" value={`${selected.readabilityScore}/100`} /><Mini label="Clicks" value={number(selected.metric.clicks)} /><Mini label="Impressions" value={number(selected.metric.impressions)} /><Mini label="CTR" value={pct(selected.ctrPercent)} /><Mini label="Avg position" value={String(selected.metric.position || '-')} /></div>{selected.errors.map((item) => <Audit key={item} tone="red" text={item} />)}{selected.warnings.slice(0, 5).map((item) => <Audit key={item} tone="amber" text={item} />)}{!selected.errors.length && !selected.warnings.length ? <Audit tone="green" text="No SEO audit issues on this page." /> : null}</div> : null}</Card>
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Save/import metrics</h3><div className="grid gap-3"><Edit label="Path" value={metricForm.path} onChange={(v) => setMetricForm((c) => ({ ...c, path: v }))} /><div className="grid gap-3 md:grid-cols-2"><Edit label="Date from" value={metricForm.dateFrom} onChange={(v) => setMetricForm((c) => ({ ...c, dateFrom: v }))} /><Edit label="Date to" value={metricForm.dateTo} onChange={(v) => setMetricForm((c) => ({ ...c, dateTo: v }))} /><Edit label="GSC clicks" value={metricForm.clicks} onChange={(v) => setMetricForm((c) => ({ ...c, clicks: v }))} /><Edit label="GSC impressions" value={metricForm.impressions} onChange={(v) => setMetricForm((c) => ({ ...c, impressions: v }))} /><Edit label="GSC avg position" value={metricForm.position} onChange={(v) => setMetricForm((c) => ({ ...c, position: v }))} /><Select value={metricForm.source} onChange={(e) => setMetricForm((c) => ({ ...c, source: e.target.value }))} options={[{ value: 'manual', label: 'Manual import' }, { value: 'gsc', label: 'Search Console' }, { value: 'ga4', label: 'GA4' }, { value: 'mixed', label: 'Mixed' }]} /><Edit label="GA users" value={metricForm.gaUsers} onChange={(v) => setMetricForm((c) => ({ ...c, gaUsers: v }))} /><Edit label="GA sessions" value={metricForm.gaSessions} onChange={(v) => setMetricForm((c) => ({ ...c, gaSessions: v }))} /><Edit label="GA conversions" value={metricForm.gaConversions} onChange={(v) => setMetricForm((c) => ({ ...c, gaConversions: v }))} /><Edit label="GA revenue minor" value={metricForm.gaRevenueMinor} onChange={(v) => setMetricForm((c) => ({ ...c, gaRevenueMinor: v }))} /></div><Edit label="Top queries, comma separated" value={metricForm.topQueries} onChange={(v) => setMetricForm((c) => ({ ...c, topQueries: v }))} /><PrimaryButton onClick={() => void saveMetric()}>Save metric</PrimaryButton></div></Card>
          <Card><div className="mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-purple-300" /><h3 className="text-sm font-semibold text-white">Recommended integrations</h3></div><div className="space-y-3 text-sm text-textMuted"><p><strong className="text-white">SEO truth:</strong> {integrations?.recommendedSeoSource || 'Google Search Console'} — clicks, impressions, CTR, average position and queries.</p><p><strong className="text-white">Behaviour truth:</strong> {integrations?.recommendedBehaviourSource || 'Google Analytics 4'} — page views, users, checkout events, conversions and revenue.</p><p>GSC connected: <strong className={integrations?.gscConnected ? 'text-emerald-200' : 'text-amber-200'}>{integrations?.gscConnected ? 'yes' : 'not yet'}</strong></p><p>GA4 configured: <strong className={integrations?.ga4Configured ? 'text-emerald-200' : 'text-amber-200'}>{integrations?.ga4Configured ? 'yes' : 'not yet'}</strong></p><p className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-100">Use GA4, but do not rely on GA4 alone for SEO keywords/ranking. Search Console is the SEO performance source.</p></div></Card></div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'green' | 'blue' | 'purple' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : tone === 'purple' ? 'border-purple-500/30 bg-purple-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>; }
function Edit({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1 text-xs text-textMuted">{label}<input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function Read({ label, value, link = false }: { label: string; value: string; link?: boolean }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>{link ? <a className="mt-1 flex items-center gap-2 break-all text-sky-200" href={value} target="_blank" rel="noreferrer">{value}<ExternalLink size={13} /></a> : <p className="mt-1 break-words text-white">{value}</p>}</div>; }
function Audit({ tone, text }: { tone: 'red' | 'amber' | 'green'; text: string }) { const cls = tone === 'green' ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : tone === 'red' ? 'text-red-200 border-red-500/30 bg-red-500/10' : 'text-amber-200 border-amber-500/20 bg-amber-500/10'; return <div className={`flex gap-2 rounded-xl border p-3 text-sm ${cls}`}><AlertTriangle size={15} className="mt-0.5 shrink-0" />{text}</div>; }
