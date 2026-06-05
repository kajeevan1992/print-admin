'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Search } from 'lucide-react';
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
  productName?: string;
  locationName?: string;
  introCopy?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  internalLinks?: Array<{ label: string; href: string }>;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  qualityScore?: number;
  readabilityScore?: number;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
};

type Summary = { total: number; published: number; draft: number; hidden: number; indexable: number; errors: number; warnings: number; averageScore?: number; averageReadability?: number };

type FormState = {
  title: string;
  metaDescription: string;
  h1: string;
  canonicalUrl: string;
  targetKeyword: string;
  status: string;
  includeInSitemap: string;
  noIndex: string;
  schemaTypes: string;
  productName: string;
  locationName: string;
  introCopy: string;
  faqItems: string;
  internalLinks: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  reviewStatus: string;
};

const pageTypes = ['all', 'home', 'product', 'category', 'location', 'collection-point', 'product-location', 'guide', 'static', 'service-area'];
const statuses = ['all', 'published', 'draft', 'hidden'];
const reviews = ['all', 'needs-review', 'approved', 'has-errors', 'thin-content'];

function reviewFor(page: SeoPage) {
  const manual = String(page.metadata?.reviewStatus || '');
  if (manual) return manual;
  if ((page.errors || []).length) return 'has-errors';
  if ((page.warnings || []).some((item) => /intro|readability|weak/i.test(item))) return 'thin-content';
  if (page.status !== 'published') return 'needs-review';
  return 'approved';
}

function scoreTone(score = 0) {
  if (score >= 85) return 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10';
  if (score >= 60) return 'text-amber-200 border-amber-500/30 bg-amber-500/10';
  return 'text-red-200 border-red-500/30 bg-red-500/10';
}

function formFrom(page: SeoPage | null): FormState {
  return {
    title: page?.title || '',
    metaDescription: page?.metaDescription || '',
    h1: page?.h1 || '',
    canonicalUrl: page?.canonicalUrl || '',
    targetKeyword: page?.targetKeyword || '',
    status: page?.status || 'draft',
    includeInSitemap: page?.includeInSitemap ? 'true' : 'false',
    noIndex: page?.noIndex ? 'true' : 'false',
    schemaTypes: (page?.schemaTypes || ['WebPage']).join(', '),
    productName: page?.productName || '',
    locationName: page?.locationName || '',
    introCopy: page?.introCopy || '',
    faqItems: JSON.stringify(page?.faqItems || [], null, 2),
    internalLinks: JSON.stringify(page?.internalLinks || [], null, 2),
    ogTitle: page?.ogTitle || '',
    ogDescription: page?.ogDescription || '',
    ogImage: page?.ogImage || '',
    twitterCard: page?.twitterCard || 'summary_large_image',
    reviewStatus: page ? reviewFor(page) : 'needs-review',
  };
}

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function SeoReviewWorkflowPage() {
  const [items, setItems] = useState<SeoPage[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, published: 0, draft: 0, hidden: 0, indexable: 0, errors: 0, warnings: 0 });
  const [search, setSearch] = useState('');
  const [pageType, setPageType] = useState('all');
  const [status, setStatus] = useState('all');
  const [review, setReview] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(formFrom(null));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sitemapCount, setSitemapCount] = useState(0);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, pageType, status });
    const res = await fetch(`/api/internal/seo/pages?${params.toString()}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO pages failed to load.');
    const next = payload.data?.items || [];
    setItems(next);
    setSummary(payload.data?.summary || summary);
    setSelectedId((current) => current || next[0]?.id || '');
    setChecked((current) => current.filter((id) => next.some((item: SeoPage) => item.id === id)));
    setLoading(false);
  }

  async function refreshCounts() {
    const res = await fetch('/api/internal/seo/sitemap', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    setSitemapCount(payload.data?.count || 0);
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); void refreshCounts(); }, []);

  const visible = useMemo(() => review === 'all' ? items : items.filter((item) => reviewFor(item) === review), [items, review]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) || visible[0] || items[0] || null, [items, visible, selectedId]);
  const activeIds = checked.length ? checked : selected ? [selected.id] : [];
  const needsReview = useMemo(() => items.filter((item) => reviewFor(item) !== 'approved').length, [items]);

  useEffect(() => { setForm(formFrom(selected)); }, [selected?.id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggle(id: string) {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleVisible() {
    const ids = visible.map((item) => item.id);
    const all = ids.length > 0 && ids.every((id) => checked.includes(id));
    setChecked(all ? checked.filter((id) => !ids.includes(id)) : [...new Set([...checked, ...ids])]);
  }

  async function seed() {
    const res = await fetch('/api/internal/seo/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO seed failed.');
    setMessage(`Seeded ${payload.data?.count || 0} SEO pages.`);
    await load();
    await refreshCounts();
  }

  async function saveSelected() {
    if (!selected) return;
    const metadata = { ...(selected.metadata || {}), reviewStatus: form.reviewStatus, reviewedAt: form.reviewStatus === 'approved' ? new Date().toISOString() : selected.metadata?.reviewedAt };
    const body: SeoPage = {
      ...selected,
      title: form.title,
      metaDescription: form.metaDescription,
      h1: form.h1,
      canonicalUrl: form.canonicalUrl,
      targetKeyword: form.targetKeyword,
      status: form.status,
      includeInSitemap: form.includeInSitemap === 'true',
      noIndex: form.noIndex === 'true',
      schemaTypes: csv(form.schemaTypes),
      productName: form.productName,
      locationName: form.locationName,
      introCopy: form.introCopy,
      faqItems: safeJson(form.faqItems, selected.faqItems || []),
      internalLinks: safeJson(form.internalLinks, selected.internalLinks || []),
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      ogImage: form.ogImage,
      twitterCard: form.twitterCard,
      metadata,
    };
    const res = await fetch('/api/internal/seo/pages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Save failed.');
    setMessage(`Saved ${selected.path}.`);
    await load();
    await refreshCounts();
  }

  async function bulk(label: string, updates: Record<string, unknown>) {
    if (!activeIds.length) return;
    const res = await fetch('/api/internal/seo/pages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk-update', ids: activeIds, updates }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `${label} failed.`);
    setMessage(`${label}: updated ${payload.data?.count || 0} page(s).`);
    setChecked([]);
    await load();
    await refreshCounts();
  }

  function openPreview() {
    if (!selected) return;
    window.open(selected.canonicalUrl || selected.path || '/', '_blank', 'noopener,noreferrer');
  }

  return (
    <div>
      <PageHeader
        title="SEO Engine"
        subtitle="Review, edit, publish and control sitemap visibility for generated and manual SEO pages. This reuses the existing SEO records and resolver."
        actions={<><Button onClick={() => void load()}>Refresh</Button><Button onClick={() => void seed()}>Seed Holo SEO</Button><PrimaryButton onClick={() => void saveSelected()} disabled={!selected}>Save edits</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <Metric label="Total" value={summary.total} />
        <Metric label="Published" value={summary.published} tone="green" />
        <Metric label="Draft" value={summary.draft} tone="amber" />
        <Metric label="Needs review" value={needsReview} tone={needsReview ? 'amber' : 'green'} />
        <Metric label="Indexable" value={summary.indexable} tone="blue" />
        <Metric label="Errors" value={summary.errors} tone={summary.errors ? 'red' : 'green'} />
        <Metric label="Avg SEO" value={summary.averageScore || 0} tone="blue" />
        <Metric label="Sitemap URLs" value={sitemapCount} tone="blue" />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_auto]">
          <Input placeholder="Search title, path, keyword, product or location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={pageType} onChange={(e) => setPageType(e.target.value)} options={pageTypes.map((value) => ({ value, label: value === 'all' ? 'All page types' : value }))} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statuses.map((value) => ({ value, label: value === 'all' ? 'All status' : value }))} />
          <Select value={review} onChange={(e) => setReview(e.target.value)} options={reviews.map((value) => ({ value, label: value === 'all' ? 'All review states' : value }))} />
          <Button onClick={() => void load()}><Search size={14} /> Apply</Button>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-textMuted"><span className="text-white">{activeIds.length}</span> selected. If none are ticked, actions apply to the selected page.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={toggleVisible}>{visible.length && visible.every((item) => checked.includes(item.id)) ? 'Untick visible' : 'Tick visible'}</Button>
            <PrimaryButton onClick={() => void bulk('Publish + sitemap', { status: 'published', includeInSitemap: true, noIndex: false, metadata: { reviewStatus: 'approved', reviewedAt: new Date().toISOString() } })}>Publish + sitemap</PrimaryButton>
            <Button onClick={() => void bulk('Draft / needs review', { status: 'draft', includeInSitemap: false, metadata: { reviewStatus: 'needs-review' } })}>Draft / needs review</Button>
            <Button onClick={() => void bulk('Exclude sitemap', { includeInSitemap: false })}>Exclude sitemap</Button>
            <Button onClick={() => void bulk('Include sitemap', { includeInSitemap: true, noIndex: false })}>Include sitemap</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">SEO pages</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading SEO records...</div> : null}
          <div className="divide-y divide-white/6">
            {visible.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`grid w-full gap-2 px-4 py-4 text-left hover:bg-white/[0.04] ${selectedId === item.id ? 'bg-white/[0.06]' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <input type="checkbox" checked={checked.includes(item.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(item.id)} className="mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title || item.path}</p>
                      <p className="mt-1 text-xs text-textMuted">{item.path} · {item.pageType} · {item.targetKeyword || 'no keyword'}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${scoreTone(item.qualityScore)}`}>{item.qualityScore ?? 0}/100</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-8 text-[11px] text-textMuted">
                  <Badge>{item.status}</Badge><Badge>{reviewFor(item)}</Badge><Badge>{item.includeInSitemap && !item.noIndex ? 'sitemap ready' : 'not in sitemap'}</Badge><Badge>{item.noIndex ? 'no-index' : 'indexable'}</Badge><Badge>read {item.readabilityScore ?? 0}/100</Badge>
                </div>
              </button>
            ))}
            {!loading && !visible.length ? <div className="p-8 text-center text-sm text-textMuted">No SEO pages match the current filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">Selected page editor</h3><Button onClick={openPreview}><ExternalLink size={14} /> Public preview</Button></div>
            {selected ? <div className="space-y-3 text-sm">
              <Edit label="SEO title" value={form.title} onChange={(value) => setField('title', value)} />
              <Edit label="Meta description" value={form.metaDescription} onChange={(value) => setField('metaDescription', value)} textarea />
              <Edit label="H1" value={form.h1} onChange={(value) => setField('h1', value)} />
              <div className="grid gap-3 md:grid-cols-2"><Edit label="Path" value={selected.path} disabled /><Edit label="Canonical URL" value={form.canonicalUrl} onChange={(value) => setField('canonicalUrl', value)} /><Edit label="Target keyword" value={form.targetKeyword} onChange={(value) => setField('targetKeyword', value)} /><Edit label="Schema types CSV" value={form.schemaTypes} onChange={(value) => setField('schemaTypes', value)} /><Edit label="Product" value={form.productName} onChange={(value) => setField('productName', value)} /><Edit label="Location" value={form.locationName} onChange={(value) => setField('locationName', value)} /></div>
              <div className="grid gap-3 md:grid-cols-4"><Select value={form.status} onChange={(e) => setField('status', e.target.value)} options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'hidden', label: 'Hidden' }]} /><Select value={form.reviewStatus} onChange={(e) => setField('reviewStatus', e.target.value)} options={[{ value: 'needs-review', label: 'Needs review' }, { value: 'approved', label: 'Approved' }, { value: 'has-errors', label: 'Has errors' }, { value: 'thin-content', label: 'Thin content' }]} /><Select value={form.includeInSitemap} onChange={(e) => setField('includeInSitemap', e.target.value)} options={[{ value: 'false', label: 'Not in sitemap' }, { value: 'true', label: 'Include sitemap' }]} /><Select value={form.noIndex} onChange={(e) => setField('noIndex', e.target.value)} options={[{ value: 'false', label: 'Indexable' }, { value: 'true', label: 'No-index' }]} /></div>
              <Edit label="Intro copy" value={form.introCopy} onChange={(value) => setField('introCopy', value)} textarea tall />
              <Edit label="FAQ items JSON" value={form.faqItems} onChange={(value) => setField('faqItems', value)} textarea tall />
              <Edit label="Internal links JSON" value={form.internalLinks} onChange={(value) => setField('internalLinks', value)} textarea />
              <div className="grid gap-3 md:grid-cols-2"><Edit label="Open Graph title" value={form.ogTitle} onChange={(value) => setField('ogTitle', value)} /><Edit label="Open Graph description" value={form.ogDescription} onChange={(value) => setField('ogDescription', value)} /><Edit label="Open Graph image" value={form.ogImage} onChange={(value) => setField('ogImage', value)} /><Select value={form.twitterCard} onChange={(e) => setField('twitterCard', e.target.value)} options={[{ value: 'summary_large_image', label: 'X card: large image' }, { value: 'summary', label: 'X card: summary' }]} /></div>
              <PrimaryButton onClick={() => void saveSelected()}>Save selected SEO page</PrimaryButton>
            </div> : <p className="text-sm text-textMuted">Select a page to edit.</p>}
          </Card>

          <Card><h3 className="mb-3 text-sm font-semibold text-white">Google preview</h3>{selected ? <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-emerald-200">{form.canonicalUrl || selected.canonicalUrl}</p><p className="mt-1 text-base font-semibold text-sky-200">{form.title || selected.title}</p><p className="mt-1 text-sm leading-6 text-textMuted">{form.metaDescription || selected.metaDescription}</p></div> : null}</Card>
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Audit</h3>{selected ? <div className="space-y-3 text-sm"><div className="grid gap-3 md:grid-cols-2"><MiniMetric label="Quality" value={`${selected.qualityScore ?? 0}/100`} /><MiniMetric label="Readability" value={`${selected.readabilityScore ?? 0}/100`} /></div>{(selected.errors || []).map((item) => <AuditLine key={item} tone="red" text={item} />)}{(selected.warnings || []).map((item) => <AuditLine key={item} tone="amber" text={item} />)}{!(selected.errors || []).length && !(selected.warnings || []).length ? <AuditLine tone="green" text="No current SEO audit issues." /> : null}</div> : null}</Card>
          <Card><h3 className="mb-3 text-sm font-semibold text-white">Workflow rules</h3><div className="space-y-2 text-sm text-textMuted"><p>Generated local pages should stay draft and out of sitemap until reviewed.</p><p>Publish + sitemap makes the page published, indexable, sitemap-ready and approved.</p><p>Partner collection points must keep honest collection-point wording and must not claim fake branches.</p></div></Card>
        </div>
      </div>
    </div>
  );
}

function Edit({ label, value, onChange, textarea = false, tall = false, disabled = false }: { label: string; value: string; onChange?: (value: string) => void; textarea?: boolean; tall?: boolean; disabled?: boolean }) {
  return <label className="grid gap-1 text-xs text-textMuted">{label}{textarea ? <textarea className={`rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white outline-none ${tall ? 'min-h-[170px]' : 'min-h-[92px]'}`} value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} /> : <input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none disabled:opacity-60" value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} />}</label>;
}
function Metric({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'green' | 'amber' | 'red' | 'blue' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p></div>; }
function Badge({ children }: { children: ReactNode }) { return <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 capitalize">{children}</span>; }
function AuditLine({ tone, text }: { tone: 'red' | 'amber' | 'green'; text: string }) { const Icon = tone === 'green' ? CheckCircle2 : AlertTriangle; const cls = tone === 'green' ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : tone === 'red' ? 'text-red-200 border-red-500/30 bg-red-500/10' : 'text-amber-200 border-amber-500/10 bg-amber-500/10'; return <div className={`flex gap-2 rounded-xl border p-3 ${cls}`}><Icon size={15} className="mt-0.5 shrink-0" /><span>{text}</span></div>; }
