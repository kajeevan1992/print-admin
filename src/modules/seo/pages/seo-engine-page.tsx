'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Globe2, Search, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type SeoPage = {
  id: string;
  slug: string;
  path: string;
  pageType: string;
  status: string;
  title: string;
  metaDescription: string;
  h1: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  includeInSitemap: boolean;
  schemaTypes: string[];
  targetKeyword: string;
  locationName?: string;
  productName?: string;
  qualityScore?: number;
  warnings?: string[];
  errors?: string[];
};

type Summary = { total: number; published: number; draft: number; hidden: number; indexable: number; errors: number; warnings: number };

const pageTypes = ['all', 'home', 'product', 'category', 'location', 'collection-point', 'product-location', 'guide', 'static', 'service-area'];
const statuses = ['all', 'published', 'draft', 'hidden'];

function scoreTone(score = 0) {
  if (score >= 85) return 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10';
  if (score >= 60) return 'text-amber-200 border-amber-500/30 bg-amber-500/10';
  return 'text-red-200 border-red-500/30 bg-red-500/10';
}

export function SeoEnginePage() {
  const [items, setItems] = useState<SeoPage[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, published: 0, draft: 0, hidden: 0, indexable: 0, errors: 0, warnings: 0 });
  const [search, setSearch] = useState('');
  const [pageType, setPageType] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [sitemapCount, setSitemapCount] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, pageType, status });
    const response = await fetch(`/api/internal/seo/pages?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO pages failed to load.');
    const nextItems = payload.data?.items || [];
    setItems(nextItems);
    setSummary(payload.data?.summary || summary);
    setSelectedId((current) => current || nextItems[0]?.id || '');
    setLoading(false);
  }

  async function loadSitemap() {
    const response = await fetch('/api/internal/seo/sitemap', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    setSitemapCount(payload.data?.count || 0);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);
  useEffect(() => { void loadSitemap(); }, []);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0] || null, [items, selectedId]);

  async function seed() {
    setMessage('Seeding Holo Print SEO foundation...');
    const response = await fetch('/api/internal/seo/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO seed failed.');
    setMessage(`Seeded ${payload.data?.count || 0} SEO pages.`);
    await load();
    await loadSitemap();
  }

  async function publishSelected() {
    if (!selected) return;
    const response = await fetch('/api/internal/seo/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selected, status: 'published' }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Publish failed.');
    setMessage(`Published ${selected.path}.`);
    await load();
    await loadSitemap();
  }

  return (
    <div>
      <PageHeader
        title="SEO Engine"
        subtitle="Powerful tenant SEO foundation for Holo Print: page metadata, canonical controls, index rules, sitemap readiness, schema selection and local SEO audit checks."
        actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void seed()}>Seed Holo SEO</Button><PrimaryButton onClick={() => void publishSelected()} disabled={!selected}>Publish selected</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Metric label="Total" value={summary.total} />
        <Metric label="Published" value={summary.published} tone="green" />
        <Metric label="Draft" value={summary.draft} tone="amber" />
        <Metric label="Hidden" value={summary.hidden} />
        <Metric label="Indexable" value={summary.indexable} tone="blue" />
        <Metric label="Errors" value={summary.errors} tone={summary.errors ? 'red' : 'green'} />
        <Metric label="Sitemap URLs" value={sitemapCount} tone="blue" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <Input placeholder="Search SEO title, path, keyword, product or location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={pageType} onChange={(e) => setPageType(e.target.value)} options={pageTypes.map((value) => ({ value, label: value === 'all' ? 'All page types' : value }))} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statuses.map((value) => ({ value, label: value === 'all' ? 'All status' : value }))} />
          <Button onClick={() => void load()}><Search size={14} /> Apply</Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">SEO pages</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading SEO records...</div> : null}
          <div className="divide-y divide-white/6">
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`grid w-full gap-2 px-4 py-4 text-left hover:bg-white/[0.04] ${selectedId === item.id ? 'bg-white/[0.06]' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title || item.path}</p>
                    <p className="mt-1 text-xs text-textMuted">{item.path} · {item.pageType} · {item.targetKeyword || 'no keyword'}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${scoreTone(item.qualityScore)}`}>{item.qualityScore ?? 0}/100</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-textMuted">
                  <Badge>{item.status}</Badge>
                  <Badge>{item.includeInSitemap && !item.noIndex ? 'sitemap ready' : 'not in sitemap'}</Badge>
                  <Badge>{item.noIndex ? 'no-index' : 'indexable'}</Badge>
                  <Badge>{(item.schemaTypes || []).join(', ') || 'no schema'}</Badge>
                </div>
              </button>
            ))}
            {!loading && !items.length ? <div className="p-8 text-center text-sm text-textMuted">No SEO pages yet. Use Seed Holo SEO to create the foundation records.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><Globe2 size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Selected SEO record</h3></div>
            {selected ? <div className="space-y-3 text-sm">
              <Read label="Path" value={selected.path} />
              <Read label="Title" value={selected.title} />
              <Read label="Meta description" value={selected.metaDescription} />
              <Read label="H1" value={selected.h1} />
              <Read label="Canonical" value={selected.canonicalUrl} />
              <Read label="Keyword" value={selected.targetKeyword || 'not set'} />
              <Read label="Product / location" value={`${selected.productName || '—'} / ${selected.locationName || '—'}`} />
            </div> : <p className="text-sm text-textMuted">Select an SEO page to review details.</p>}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><ShieldAlert size={16} className="text-amber-300" /><h3 className="text-sm font-semibold text-white">Audit</h3></div>
            {selected ? <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">Quality score</p><p className="mt-1 text-2xl font-semibold text-white">{selected.qualityScore ?? 0}/100</p></div>
              {(selected.errors || []).map((item) => <AuditLine key={item} tone="red" text={item} />)}
              {(selected.warnings || []).map((item) => <AuditLine key={item} tone="amber" text={item} />)}
              {!(selected.errors || []).length && !(selected.warnings || []).length ? <AuditLine tone="green" text="No current SEO audit issues." /> : null}
            </div> : null}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Foundation rules included</h3>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Canonical URL and no-index/no-follow controls.</p>
              <p>Sitemap include/exclude logic.</p>
              <p>Schema type selection for products, local pages, FAQs and web pages.</p>
              <p>Fake-location warning for partner collection points using LocalBusiness schema.</p>
              <p>Local/product page checks for missing product, location, keyword, FAQ and internal links.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'green' | 'amber' | 'red' | 'blue' }) {
  const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : '';
  return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 capitalize">{children}</span>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function AuditLine({ tone, text }: { tone: 'red' | 'amber' | 'green'; text: string }) { const Icon = tone === 'green' ? CheckCircle2 : AlertTriangle; const cls = tone === 'green' ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : tone === 'red' ? 'text-red-200 border-red-500/30 bg-red-500/10' : 'text-amber-200 border-amber-500/30 bg-amber-500/10'; return <div className={`flex gap-2 rounded-xl border p-3 ${cls}`}><Icon size={15} className="mt-0.5 shrink-0" /><span>{text}</span></div>; }
