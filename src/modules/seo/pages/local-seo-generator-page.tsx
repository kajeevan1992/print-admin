'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Sparkles, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Select } from '@/components/forms/select';

type PreviewPage = {
  id: string;
  slug: string;
  path: string;
  pageType: string;
  status: string;
  title: string;
  metaDescription: string;
  h1: string;
  targetKeyword: string;
  locationName?: string;
  productName?: string;
  includeInSitemap?: boolean;
  metadata?: Record<string, unknown>;
};

type Summary = {
  total: number;
  productLocation: number;
  serviceArea: number;
  collectionPoint: number;
  draft: number;
  published: number;
  sitemapReady: number;
};

const defaultProducts = [
  { name: 'Business Cards', singular: 'business cards', slug: 'business-cards', category: 'Business stationery', path: '/standard-business-cards' },
  { name: 'Flyers & Leaflets', singular: 'flyers and leaflets', slug: 'flyers', category: 'Marketing print', path: '/flyers' },
  { name: 'Posters', singular: 'poster printing', slug: 'posters', category: 'Large format', path: '/posters-large-format-prints' },
  { name: 'Booklets & Brochures', singular: 'booklets and brochures', slug: 'booklets', category: 'Booklets', path: '/booklets' },
  { name: 'PVC Banners', singular: 'PVC banners', slug: 'pvc-banners', category: 'Signage', path: '/all-products' },
  { name: 'Stickers & Labels', singular: 'stickers and labels', slug: 'stickers-labels', category: 'Labels', path: '/all-products' },
];

const defaultLocations = [
  { name: 'Sidcup', slug: 'sidcup', areaType: 'store-area', isOwnedBranch: true },
  { name: 'Bexley', slug: 'bexley', areaType: 'service-area' },
  { name: 'Welling', slug: 'welling', areaType: 'service-area' },
  { name: 'New Eltham', slug: 'new-eltham', areaType: 'service-area' },
  { name: 'Chislehurst', slug: 'chislehurst', areaType: 'service-area' },
  { name: 'Bexleyheath', slug: 'bexleyheath', areaType: 'service-area' },
];

const defaultCollectionPoints = [
  { name: 'Wimbledon', slug: 'wimbledon', areaType: 'collection-point', isOwnedBranch: false, collectionNote: 'Partner collection point wording only. Do not describe this as a staffed Holo Print branch unless ownership changes.' },
  { name: 'Kingston', slug: 'kingston', areaType: 'collection-point', isOwnedBranch: false, collectionNote: 'Partner collection point wording only. Do not describe this as a staffed Holo Print branch unless ownership changes.' },
  { name: 'Lewisham', slug: 'lewisham', areaType: 'collection-point', isOwnedBranch: false, collectionNote: 'Partner collection point wording only. Do not describe this as a staffed Holo Print branch unless ownership changes.' },
];

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJsonField(value: string, fallback: unknown[]) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toneFor(pageType: string) {
  if (pageType === 'product-location') return 'border-sky-500/20 bg-sky-500/10 text-sky-100';
  if (pageType === 'collection-point') return 'border-purple-500/20 bg-purple-500/10 text-purple-100';
  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';
}

export function LocalSeoGeneratorPage() {
  const [items, setItems] = useState<PreviewPage[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, productLocation: 0, serviceArea: 0, collectionPoint: 0, draft: 0, published: 0, sitemapReady: 0 });
  const [mode, setMode] = useState('all');
  const [status, setStatus] = useState('draft');
  const [includeInSitemap, setIncludeInSitemap] = useState('false');
  const [maxPages, setMaxPages] = useState('60');
  const [productsJson, setProductsJson] = useState(pretty(defaultProducts));
  const [locationsJson, setLocationsJson] = useState(pretty(defaultLocations));
  const [collectionPointsJson, setCollectionPointsJson] = useState(pretty(defaultCollectionPoints));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const input = useMemo(() => ({
    mode,
    status,
    includeInSitemap: includeInSitemap === 'true',
    maxPages: Number(maxPages || 60),
    products: parseJsonField(productsJson, defaultProducts),
    locations: parseJsonField(locationsJson, defaultLocations),
    collectionPoints: parseJsonField(collectionPointsJson, defaultCollectionPoints),
  }), [mode, status, includeInSitemap, maxPages, productsJson, locationsJson, collectionPointsJson]);

  async function preview() {
    setLoading(true);
    setMessage('Previewing local SEO pages...');
    const response = await fetch('/api/internal/seo/local-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', input }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Local SEO preview failed.');
    setItems(payload.data?.items || []);
    setSummary(payload.data?.summary || summary);
    setMessage(`Preview ready: ${payload.data?.summary?.total || 0} pages. They are not saved until you click Generate.`);
    setLoading(false);
  }

  async function generate() {
    const ok = window.confirm(`Generate ${items.length || 'the previewed'} local SEO pages as ${status} records?`);
    if (!ok) return;
    setLoading(true);
    setMessage('Generating local SEO pages into the existing SEO Engine...');
    const response = await fetch('/api/internal/seo/local-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', input }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Local SEO generation failed.');
    setItems(payload.data?.items || []);
    setSummary(payload.data?.summary || summary);
    setMessage(`Generated ${payload.data?.saved || 0} SEO records. Review/publish them inside SEO Engine before indexing.`);
    setLoading(false);
  }

  useEffect(() => { void preview().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);

  return (
    <div>
      <PageHeader
        title="Local SEO Generator"
        subtitle="Build draft-first product + location pages, service-area pages and honest partner collection-point pages without duplicating the SEO Engine."
        actions={<><Button onClick={() => void preview()}>Preview</Button><PrimaryButton onClick={() => void generate()} disabled={loading}>Generate pages</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        <Metric label="Total" value={summary.total} />
        <Metric label="Product + location" value={summary.productLocation} tone="blue" />
        <Metric label="Service area" value={summary.serviceArea} tone="green" />
        <Metric label="Collection point" value={summary.collectionPoint} tone="purple" />
        <Metric label="Draft" value={summary.draft} tone="amber" />
        <Metric label="Published" value={summary.published} tone="green" />
        <Metric label="Sitemap ready" value={summary.sitemapReady} tone="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <div className="mb-3 flex items-center gap-2"><Wand2 size={16} className="text-purple-200" /><h3 className="text-sm font-semibold text-white">Generator settings</h3></div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={mode} onChange={(event) => setMode(event.target.value)} options={[
              { value: 'all', label: 'All local SEO page types' },
              { value: 'product-location', label: 'Product + location only' },
              { value: 'service-area', label: 'Service area only' },
              { value: 'collection-points', label: 'Collection points only' },
            ]} />
            <Select value={status} onChange={(event) => setStatus(event.target.value)} options={[
              { value: 'draft', label: 'Draft first' },
              { value: 'published', label: 'Publish immediately' },
              { value: 'hidden', label: 'Hidden' },
            ]} />
            <Select value={includeInSitemap} onChange={(event) => setIncludeInSitemap(event.target.value)} options={[
              { value: 'false', label: 'Keep out of sitemap until reviewed' },
              { value: 'true', label: 'Include in sitemap' },
            ]} />
            <label className="grid gap-1 text-xs text-textMuted">
              Max pages per run
              <input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" value={maxPages} onChange={(event) => setMaxPages(event.target.value)} />
            </label>
          </div>

          <JsonEditor label="Products" value={productsJson} onChange={setProductsJson} />
          <JsonEditor label="Locations / service areas" value={locationsJson} onChange={setLocationsJson} />
          <JsonEditor label="Partner collection points" value={collectionPointsJson} onChange={setCollectionPointsJson} />

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
            Recommended workflow: generate as draft, review the page copy in SEO Engine, then publish only pages with real service or collection coverage.
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3">
            <div className="flex items-center gap-2"><MapPin size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Preview pages</h3></div>
          </div>
          {loading ? <div className="p-6 text-sm text-textMuted">Working...</div> : null}
          <div className="divide-y divide-white/6">
            {items.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 hover:bg-white/[0.03]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneFor(item.pageType)}`}>{item.pageType}</span>
                    </div>
                    <p className="mt-1 text-xs text-textMuted">{item.path} · {item.targetKeyword || 'no keyword'} · {item.status}</p>
                    <p className="mt-2 max-w-3xl text-xs leading-6 text-textMuted">{item.metaDescription}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-textMuted">
                      {item.productName ? <Badge>Product: {item.productName}</Badge> : null}
                      {item.locationName ? <Badge>Location: {item.locationName}</Badge> : null}
                      <Badge>{item.includeInSitemap ? 'sitemap ready' : 'not in sitemap'}</Badge>
                      {item.metadata?.locationTruthRule ? <Badge>{String(item.metadata.locationTruthRule)}</Badge> : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !items.length ? <div className="p-8 text-center text-sm text-textMuted">No preview pages yet.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 grid gap-2 text-xs text-textMuted">
      {label}
      <textarea
        className="min-h-[150px] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs leading-5 text-white outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1">{children}</span>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'green' | 'amber' | 'blue' | 'purple' }) {
  const tones = {
    default: 'border-white/8 bg-white/[0.03] text-white',
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    blue: 'border-sky-500/20 bg-sky-500/10 text-sky-100',
    purple: 'border-purple-500/20 bg-purple-500/10 text-purple-100',
  };
  return <div className={`rounded-xl border p-4 ${tones[tone]}`}><p className="text-xs uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
