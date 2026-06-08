'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileCode2, Globe2, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type CrawlSettings = {
  robotsEnabled: boolean;
  allowAllPublicPages: boolean;
  includeSitemapIndex: boolean;
  includeLlmsTxt: boolean;
  customDisallow: string[];
  customAllow: string[];
  extraSitemaps: string[];
  noindexPaths: string[];
  crawlDelay?: string;
  notes?: string;
};

type CrawlData = {
  settings: CrawlSettings;
  robots: { text: string; blocked: string[] };
  sitemapIndex: { entries: Array<{ kind: string; loc: string; count: number; lastmod: string }>; count: number; xml: string };
  allSitemap: { urls: Array<{ loc: string; path: string; kind: string; pageType: string }>; count: number; xml: string };
  audit: {
    sitemaps: Record<string, { count: number; urls: Array<{ loc: string; path: string }> }>;
    issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; path?: string }>;
    summary: { totalSeoPages: number; sitemapUrls: number; sitemapFiles: number; robotsBlocked: number; errors: number; warnings: number; ready: boolean };
  };
};

function lines(value: string) { return value.split('\n').map((line) => line.trim()).filter(Boolean); }
function textFromLines(value: string[]) { return value.join('\n'); }

export function SeoCrawlControlPage() {
  const [data, setData] = useState<CrawlData | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CrawlSettings>({ robotsEnabled: true, allowAllPublicPages: true, includeSitemapIndex: true, includeLlmsTxt: true, customDisallow: [], customAllow: [], extraSitemaps: [], noindexPaths: [], crawlDelay: '', notes: '' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/internal/seo/crawl-control', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO crawl control failed to load.');
    setData(payload.data);
    setForm(payload.data?.settings || form);
    setLoading(false);
  }

  async function save() {
    const res = await fetch('/api/internal/seo/crawl-control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: form }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO crawl settings failed to save.');
    setData(payload.data);
    setForm(payload.data?.settings || form);
    setMessage('SEO crawl settings saved. Robots.txt and sitemap previews refreshed.');
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);

  const summary = data?.audit?.summary || { totalSeoPages: 0, sitemapUrls: 0, sitemapFiles: 0, robotsBlocked: 0, errors: 0, warnings: 0, ready: false };
  const sitemapEntries = data?.sitemapIndex?.entries || [];
  const issues = data?.audit?.issues || [];

  return (
    <div>
      <PageHeader
        title="Robots & Sitemap Control"
        subtitle="Final crawl control for Google: robots.txt rules, sitemap index, split sitemaps, no-index exclusions and live readiness checks."
        actions={<><Button onClick={() => void load()}>Refresh</Button><PrimaryButton onClick={() => void save()}>Save crawl settings</PrimaryButton></>}
      />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Metric label="SEO pages" value={summary.totalSeoPages} />
        <Metric label="Sitemap URLs" value={summary.sitemapUrls} tone="blue" />
        <Metric label="Sitemap files" value={summary.sitemapFiles} tone="blue" />
        <Metric label="Robots blocked" value={summary.robotsBlocked} tone="amber" />
        <Metric label="Errors" value={summary.errors} tone={summary.errors ? 'red' : 'green'} />
        <Metric label="Warnings" value={summary.warnings} tone={summary.warnings ? 'amber' : 'green'} />
        <Metric label="Ready" value={summary.ready ? 'Yes' : 'No'} tone={summary.ready ? 'green' : 'red'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><Search size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Crawl settings</h3></div>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={String(form.robotsEnabled)} onChange={(e) => setForm((c) => ({ ...c, robotsEnabled: e.target.value === 'true' }))} options={[{ value: 'true', label: 'Robots enabled' }, { value: 'false', label: 'Block all robots' }]} />
              <Select value={String(form.allowAllPublicPages)} onChange={(e) => setForm((c) => ({ ...c, allowAllPublicPages: e.target.value === 'true' }))} options={[{ value: 'true', label: 'Allow public pages' }, { value: 'false', label: 'Disallow by default' }]} />
              <Select value={String(form.includeSitemapIndex)} onChange={(e) => setForm((c) => ({ ...c, includeSitemapIndex: e.target.value === 'true' }))} options={[{ value: 'true', label: 'Advertise sitemap index' }, { value: 'false', label: 'Do not advertise sitemap' }]} />
              <label className="grid gap-1 text-xs text-textMuted">Crawl delay<input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={form.crawlDelay || ''} onChange={(e) => setForm((c) => ({ ...c, crawlDelay: e.target.value }))} placeholder="optional" /></label>
            </div>
            <TextArea label="Custom Allow paths, one per line" value={textFromLines(form.customAllow || [])} onChange={(value) => setForm((c) => ({ ...c, customAllow: lines(value) }))} />
            <TextArea label="Custom Disallow paths, one per line" value={textFromLines(form.customDisallow || [])} onChange={(value) => setForm((c) => ({ ...c, customDisallow: lines(value) }))} />
            <TextArea label="Force no-index paths, one per line" value={textFromLines(form.noindexPaths || [])} onChange={(value) => setForm((c) => ({ ...c, noindexPaths: lines(value) }))} />
            <TextArea label="Extra sitemap URLs, one per line" value={textFromLines(form.extraSitemaps || [])} onChange={(value) => setForm((c) => ({ ...c, extraSitemaps: lines(value) }))} />
            <TextArea label="Internal notes" value={form.notes || ''} onChange={(value) => setForm((c) => ({ ...c, notes: value }))} />
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">Keep checkout, account, order and admin URLs blocked. Only publish sitemap URLs that are reviewed, indexable and canonical.</div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><Globe2 size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Public test URLs</h3></div>
            <div className="grid gap-2 text-sm">
              {['/robots.txt', '/sitemap.xml', '/sitemaps/products.xml', '/sitemaps/locations.xml', '/sitemaps/collections.xml', '/sitemaps/guides.xml', '/sitemaps/static.xml'].map((href) => <a key={href} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sky-200">{href}<ExternalLink size={14} /></a>)}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><FileCode2 size={16} className="text-purple-300" /><h3 className="text-sm font-semibold text-white">Sitemap index</h3></div>
            <div className="grid gap-2">
              {sitemapEntries.map((entry) => <div key={entry.kind} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-semibold capitalize text-white">{entry.kind}</span><span className="text-textMuted">{entry.count} URLs</span></div><a href={entry.loc} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-sky-200">{entry.loc}</a></div>)}
              {!sitemapEntries.length ? <p className="text-sm text-textMuted">No sitemap entries yet. Publish SEO pages and include them in sitemap.</p> : null}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Robots.txt preview</h3>
            <pre className="max-h-[300px] overflow-auto rounded-xl border border-white/8 bg-black/30 p-4 text-xs leading-6 text-white">{loading ? 'Loading...' : data?.robots?.text || ''}</pre>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Live readiness issues</h3>
            <div className="space-y-2">
              {issues.slice(0, 80).map((issue, index) => <Issue key={`${issue.path}-${issue.message}-${index}`} issue={issue} />)}
              {!issues.length ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />No crawl readiness issues found.</div> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="mt-4 grid gap-1 text-xs text-textMuted">{label}<textarea className="min-h-[92px] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white outline-none" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'green' | 'blue' | 'amber' | 'red' }) {
  const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : '';
  return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}

function Issue({ issue }: { issue: { severity: 'error' | 'warning' | 'info'; message: string; path?: string } }) {
  const cls = issue.severity === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-100' : issue.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  return <div className={`rounded-xl border p-3 text-sm leading-6 ${cls}`}><AlertTriangle className="mr-2 inline h-4 w-4" /><strong className="uppercase">{issue.severity}</strong>{issue.path ? ` · ${issue.path}` : ''}: {issue.message}</div>;
}
