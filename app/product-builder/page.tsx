'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Database, ExternalLink, Layers3, Route, Save, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/forms/select';
import { PRODUCT_BUILDER_JOURNEY, getProductBuilderTab, getProductBuilderTabHref, type ProductBuilderTabKey } from '@/config/product-builder-journey';

type Product = {
  id: string;
  name: string;
  slug: string;
  categoryId?: string | null;
  categoryName?: string | null;
  priceFromMinor?: number;
  currency?: string;
  isActive?: boolean;
  productType?: string;
  metadataJson?: Record<string, any>;
};

type ReadinessItem = {
  product: Product;
  ready: boolean;
  errors: number;
  warnings: number;
  issues: Array<{ code: string; message: string; field: string; severity: 'error' | 'warning' }>;
};

function money(minor?: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format((minor || 0) / 100);
}

function tabStatusClass(status: string) {
  if (status === 'live') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
  if (status === 'migrate') return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  if (status === 'replace') return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
  return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function evaluateTabProgress(product: Product | null, readiness?: ReadinessItem) {
  const meta = product?.metadataJson || {};
  return {
    overview: Boolean(product),
    basics: Boolean(product?.name && product?.slug && product?.categoryId && hasValue(meta.template) && hasValue(meta.vatRate)),
    content: hasValue(meta.media) || hasValue(meta.content) || hasValue(meta.delivery) || hasValue(meta.designServices),
    options: hasValue(meta.optionGroups) || hasValue(meta.options) || hasValue(meta.selectorUi),
    rules: Array.isArray(meta.rules) && meta.rules.length > 0,
    pricing: hasValue(meta.pricing) || Number(product?.priceFromMinor || 0) > 0,
    'print-maths': hasValue(meta.printMaths) || hasValue(meta.pricing?.quoteMaths),
    artwork: hasValue(meta.artwork) || hasValue(meta.artworkRules) || meta.artworkRequired === true,
    preview: hasValue(meta.storefront) || hasValue(meta.media) || hasValue(meta.content),
    publish: Boolean(readiness?.ready),
  } satisfies Record<ProductBuilderTabKey, boolean>;
}

function progressPercent(progress: Record<ProductBuilderTabKey, boolean>) {
  const total = PRODUCT_BUILDER_JOURNEY.length;
  const done = PRODUCT_BUILDER_JOURNEY.filter((tab) => progress[tab.key]).length;
  return Math.round((done / total) * 100);
}

export default function UnifiedProductBuilderPage({ searchParams }: { searchParams?: { tab?: string; productId?: string } }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams?.productId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeTab = getProductBuilderTab(searchParams?.tab);
  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId || product.slug === selectedId) || products[0] || null, [products, selectedId]);
  const selectedReadiness = useMemo(() => readiness.find((item) => item.product.id === selectedProduct?.id), [readiness, selectedProduct?.id]);
  const progress = useMemo(() => evaluateTabProgress(selectedProduct, selectedReadiness), [selectedProduct, selectedReadiness]);
  const percent = progressPercent(progress);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [productsRes, readinessRes] = await Promise.all([
        fetch('/api/internal/catalog/products?limit=300', { cache: 'no-store' }),
        fetch('/api/internal/catalog/product-readiness', { cache: 'no-store' }).catch(() => null),
      ]);
      const productsJson = await productsRes.json().catch(() => ({}));
      if (!productsRes.ok || productsJson.ok === false) throw new Error(productsJson.error || 'Products failed to load.');
      const items = Array.isArray(productsJson.data?.items) ? productsJson.data.items : [];
      setProducts(items);
      if (!selectedId && items[0]?.id) setSelectedId(items[0].id);

      if (readinessRes) {
        const readinessJson = await readinessRes.json().catch(() => ({}));
        if (readinessRes.ok && readinessJson.ok !== false && Array.isArray(readinessJson.data?.items)) setReadiness(readinessJson.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product Builder failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const productParam = selectedProduct?.id || selectedId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unified Product Builder"
        subtitle="One clean setup journey for print products: basics, storefront content, selector UI, rules, pricing, print maths, artwork, preview and publish readiness."
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v359 architecture shell</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Product setup is now one journey</h2>
            <p className="mt-1 max-w-3xl text-sm text-textMuted">Existing specialist pages are not deleted. They are mapped into this journey until each tab is migrated into one unified builder component.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05] disabled:opacity-50">Refresh</button>
            <Link href="/product-builder-studio" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"><Save size={16}/>Create / edit product</Link>
          </div>
        </div>
      </Card>

      {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 text-white"><Database size={17}/><h3 className="font-semibold">Product</h3></div>
            <div className="mt-4">
              <Select
                value={selectedProduct?.id || selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                options={products.length ? products.map((product) => ({ value: product.id, label: `${product.name} /${product.slug}` })) : [{ value: '', label: loading ? 'Loading products...' : 'No products found' }]}
              />
            </div>
            {selectedProduct ? <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">{selectedProduct.name}</p>
              <p className="mt-1 text-xs text-textMuted">/{selectedProduct.slug}</p>
              <div className="mt-4 grid gap-3 text-xs text-textMuted">
                <div className="flex justify-between gap-3"><span>Category</span><span className="text-white">{selectedProduct.categoryName || selectedProduct.categoryId || 'Not set'}</span></div>
                <div className="flex justify-between gap-3"><span>Price from</span><span className="text-white">{money(selectedProduct.priceFromMinor, selectedProduct.currency)}</span></div>
                <div className="flex justify-between gap-3"><span>Status</span><span className="text-white">{selectedProduct.isActive ? 'Published' : 'Draft'}</span></div>
                <div className="flex justify-between gap-3"><span>Template</span><span className="text-white">{selectedProduct.metadataJson?.template || selectedProduct.productType || 'Not set'}</span></div>
              </div>
            </div> : <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No product selected.</p>}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-white"><ShieldCheck size={17}/><h3 className="font-semibold">Setup progress</h3></div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm"><span className="text-textMuted">Completion</span><span className="font-semibold text-white">{percent}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} /></div>
            </div>
            <div className="mt-4 space-y-2">
              {PRODUCT_BUILDER_JOURNEY.map((tab) => {
                const done = progress[tab.key];
                return <Link key={tab.key} href={getProductBuilderTabHref(tab.key, productParam)} className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm transition ${activeTab.key === tab.key ? 'border-sky-400/40 bg-sky-400/10 text-white' : 'border-white/8 bg-white/[0.02] text-textMuted hover:bg-white/[0.05]'}`}>
                  <span className="flex items-center gap-2">{done ? <CheckCircle2 size={15} className="text-emerald-300"/> : <Circle size={15}/>} {tab.label}</span>
                  <ArrowRight size={14}/>
                </Link>;
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${tabStatusClass(activeTab.status)}`}>{activeTab.status}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-textMuted">{activeTab.key}</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{activeTab.label}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-textMuted">{activeTab.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTab.sourceRoutes.map((route) => route === '/product-builder' ? null : (
                  <Link key={route} href={route} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05]">
                    Open tool <ExternalLink size={15}/>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          {activeTab.key === 'overview' ? <OverviewPanel selectedProduct={selectedProduct} readiness={selectedReadiness} progress={progress} /> : null}
          {activeTab.key !== 'overview' ? <MigrationPanel tab={activeTab} productId={productParam} isDone={progress[activeTab.key]} /> : null}
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({ selectedProduct, readiness, progress }: { selectedProduct: Product | null; readiness?: ReadinessItem; progress: Record<ProductBuilderTabKey, boolean> }) {
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card>
      <div className="flex items-center gap-2 text-white"><Layers3 size={17}/><h3 className="font-semibold">Unified product data map</h3></div>
      <div className="mt-4 space-y-3">
        {PRODUCT_BUILDER_JOURNEY.filter((tab) => tab.key !== 'overview').map((tab) => <div key={tab.key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{tab.label}</p>
              <p className="mt-1 text-xs leading-5 text-textMuted">Owns: {tab.owns.join(', ')}</p>
            </div>
            {progress[tab.key] ? <CheckCircle2 size={16} className="text-emerald-300"/> : <Circle size={16} className="text-textMuted"/>}
          </div>
        </div>)}
      </div>
    </Card>

    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 text-white"><ShieldCheck size={17}/><h3 className="font-semibold">Publish readiness</h3></div>
        {readiness ? <div className={`mt-4 rounded-2xl border p-4 ${readiness.ready ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-amber-400/20 bg-amber-400/10'}`}>
          <p className="text-sm font-semibold text-white">{readiness.ready ? 'Ready for storefront' : 'Needs fixes before publishing'}</p>
          <p className="mt-1 text-xs text-textMuted">{readiness.errors} errors · {readiness.warnings} warnings</p>
        </div> : <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No readiness result for this product yet.</p>}
        {readiness?.issues?.length ? <div className="mt-4 space-y-2">{readiness.issues.slice(0, 8).map((issue) => <div key={`${issue.code}-${issue.field}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">{issue.code}</p><p className="mt-1 text-xs text-textMuted">{issue.message}</p></div>)}</div> : null}
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-white"><Route size={17}/><h3 className="font-semibold">Migration rule</h3></div>
        <p className="mt-3 text-sm leading-6 text-textMuted">Old product setup pages remain available while we migrate each tab into this unified builder. Once a tab is fully migrated, the old route should redirect here and be removed from sidebar navigation.</p>
        <pre className="mt-4 max-h-[300px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{selectedProduct ? JSON.stringify({ productId: selectedProduct.id, slug: selectedProduct.slug, metadataKeys: Object.keys(selectedProduct.metadataJson || {}) }, null, 2) : 'Select a product'}</pre>
      </Card>
    </div>
  </div>;
}

function MigrationPanel({ tab, productId, isDone }: { tab: (typeof PRODUCT_BUILDER_JOURNEY)[number]; productId?: string; isDone: boolean }) {
  return <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
    <Card>
      <h3 className="text-lg font-semibold text-white">What this tab will become</h3>
      <p className="mt-2 text-sm leading-6 text-textMuted">This tab is part of the unified Product Builder. For v359 it links to the existing specialist tools so we keep every feature working while removing duplicate navigation and planning the safe migration.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {tab.owns.map((item) => <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted">{item}</div>)}
      </div>
    </Card>

    <Card>
      <h3 className="font-semibold text-white">Source tools</h3>
      <div className="mt-4 space-y-2">
        {tab.sourceRoutes.map((route) => route === '/product-builder' ? null : <Link key={route} href={route} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white hover:bg-white/[0.06]">
          <span>{route}</span><ExternalLink size={14}/>
        </Link>)}
      </div>
      <div className={`mt-4 rounded-2xl border p-3 text-xs ${isDone ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'}`}>
        {isDone ? 'This product already has data for this tab.' : 'This product has no/partial data for this tab yet.'}
      </div>
      <pre className="mt-4 max-h-[260px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{JSON.stringify({ tab: tab.key, productId, status: tab.status, dataKeys: tab.dataKeys }, null, 2)}</pre>
    </Card>
  </div>;
}
