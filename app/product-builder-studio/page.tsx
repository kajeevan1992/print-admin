'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Eye, Layers3, Save, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Category = { id: string; name: string; slug?: string };
type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; metadataJson?: Record<string, any> };
type ReadinessItem = { product: Product; ready: boolean; errors: number; warnings: number; issues: Array<{ code: string; message: string; field: string; severity: 'error' | 'warning' }> };

const templateOptions = [
  { value: 'business-cards', label: 'Business Cards', vatRate: 'standard', artworkProfile: 'print-ready-pdf', options: ['size', 'paper', 'sides', 'finish'] },
  { value: 'leaflets', label: 'Leaflets / Flyers', vatRate: 'zero', artworkProfile: 'flat-sheet-pdf', options: ['size', 'paper', 'sides', 'folding'] },
  { value: 'booklets', label: 'Booklets', vatRate: 'zero', artworkProfile: 'booklet-pdf', options: ['size', 'pages', 'paper', 'binding'] },
  { value: 'boards', label: 'Boards / Signs', vatRate: 'standard', artworkProfile: 'large-format-pdf', options: ['size', 'material', 'lamination'] },
];

const quantityPresets = ['100,250,500,1000', '25,50,100,250,500', '1,2,5,10,25', '250,500,1000,2500,5000'];

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseCsvNumbers(value: string) {
  return value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item > 0);
}

function optionObjects(keys: string[]) {
  return keys.map((key) => ({ id: key, label: key.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), type: key === 'pages' ? 'number' : 'select', required: true }));
}

function moneyMinor(value: string) {
  return Math.max(0, Math.round(Number(value || 0) * 100));
}

function minorToPounds(value?: number) {
  return ((value || 0) / 100).toFixed(2);
}

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    id: '',
    name: 'Business Cards',
    slug: 'business-cards',
    categoryId: '',
    template: 'business-cards',
    priceFrom: '19.00',
    vatRate: 'standard',
    quantities: '100,250,500,1000',
    pricingSource: 'fixed',
    artworkRequired: 'yes',
    visible: 'yes',
    paymentEnabled: 'yes',
    status: 'draft',
  });

  const selectedTemplate = useMemo(() => templateOptions.find((item) => item.value === form.template) || templateOptions[0], [form.template]);
  const readinessForSelected = useMemo(() => readiness.find((item) => item.product.id === selectedId || item.product.id === form.id), [readiness, selectedId, form.id]);

  function updateForm(patch: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [productsRes, categoriesRes, readinessRes] = await Promise.all([
        fetch('/api/internal/catalog/products', { cache: 'no-store' }),
        fetch('/api/internal/catalog/categories', { cache: 'no-store' }),
        fetch('/api/internal/catalog/product-readiness', { cache: 'no-store' }),
      ]);
      const productsJson = await productsRes.json();
      const categoriesJson = await categoriesRes.json();
      const readinessJson = await readinessRes.json();
      if (!productsRes.ok || productsJson.ok === false) throw new Error(productsJson.error || 'Products failed to load.');
      if (!categoriesRes.ok || categoriesJson.ok === false) throw new Error(categoriesJson.error || 'Categories failed to load.');
      if (!readinessRes.ok || readinessJson.ok === false) throw new Error(readinessJson.error?.message || 'Readiness failed to load.');
      setProducts(productsJson.data?.items || []);
      setCategories(categoriesJson.data?.items || []);
      setReadiness(readinessJson.data?.items || []);
      if (!form.categoryId && categoriesJson.data?.items?.[0]?.id) updateForm({ categoryId: categoriesJson.data.items[0].id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load builder data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function loadProduct(id: string) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const meta = product.metadataJson || {};
    const template = meta.template || meta.productTemplate || 'business-cards';
    const tpl = templateOptions.find((item) => item.value === template) || templateOptions[0];
    setSelectedId(product.id);
    setForm({
      id: product.id,
      name: product.name || '',
      slug: product.slug || '',
      categoryId: product.categoryId || '',
      template,
      priceFrom: minorToPounds(product.priceFromMinor),
      vatRate: meta.vatRate || tpl.vatRate,
      quantities: Array.isArray(meta.quantities) ? meta.quantities.join(',') : '100,250,500,1000',
      pricingSource: meta.pricing?.source || 'fixed',
      artworkRequired: meta.artworkRequired === false ? 'no' : 'yes',
      visible: meta.storefront?.visible ? 'yes' : 'no',
      paymentEnabled: meta.checkout?.paymentEnabled === false ? 'no' : 'yes',
      status: meta.status || (product.isActive ? 'published' : 'draft'),
    });
  }

  function newProduct() {
    setSelectedId('');
    setForm((prev) => ({ ...prev, id: '', name: 'Business Cards', slug: 'business-cards', template: 'business-cards', priceFrom: '19.00', vatRate: 'standard', status: 'draft' }));
  }

  async function saveProduct(publish = false) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const tpl = selectedTemplate;
      const id = form.id || `prod-${slugify(form.slug || form.name)}`;
      const payload = {
        id,
        name: form.name,
        slug: slugify(form.slug || form.name),
        categoryId: form.categoryId || null,
        priceFromMinor: moneyMinor(form.priceFrom),
        currency: 'GBP',
        isActive: publish || form.status === 'published',
        productType: tpl.value,
        metadataJson: {
          status: publish ? 'published' : form.status,
          template: tpl.value,
          vatRate: form.vatRate,
          artworkRequired: form.artworkRequired === 'yes',
          options: optionObjects(tpl.options),
          quantities: parseCsvNumbers(form.quantities),
          turnaroundOptions: [{ id: 'standard', label: 'Standard', days: 3 }, { id: 'express', label: 'Express', days: 1 }],
          pricing: { source: form.pricingSource, priceFromMinor: moneyMinor(form.priceFrom) },
          artworkRules: { profile: tpl.artworkProfile, bleedMm: 3, fileTypes: ['application/pdf'] },
          storefront: { visible: form.visible === 'yes' || publish },
          checkout: { paymentEnabled: form.paymentEnabled === 'yes' },
          builderVersion: 'v323',
        },
      };
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/internal/catalog/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Product save failed.');
      const readinessRes = await fetch('/api/internal/catalog/product-readiness', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, visible: payload.metadataJson.storefront.visible, paymentEnabled: payload.metadataJson.checkout.paymentEnabled }) });
      const readinessJson = await readinessRes.json();
      if (!readinessRes.ok || readinessJson.ok === false) throw new Error(readinessJson.error?.message || 'Readiness update failed.');
      setSelectedId(id);
      updateForm({ id, status: publish ? 'published' : form.status });
      setMessage(readinessJson.data.ready ? 'Product saved and ready for storefront.' : 'Product saved. Fix readiness issues before publishing.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Product Builder Studio" subtitle="Create and save real storefront products with options, VAT, pricing, artwork rules and publish readiness checks." />

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v323 Database connected</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Products now save to internal catalog</h2>
            <p className="mt-1 text-sm text-textMuted">Builder output is stored in product metadata and checked before storefront publishing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={newProduct} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05]">New product</button>
            <button onClick={() => load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05]">Refresh</button>
          </div>
        </div>
      </Card>

      {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18} />{error}</div> : null}
      {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18} />{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[320px_1fr_360px]">
        <Card>
          <div className="flex items-center gap-2 text-white"><Database size={17} /><h3 className="font-semibold">Catalog products</h3></div>
          <div className="mt-4 space-y-2">
            {products.length ? products.map((product) => {
              const ready = readiness.find((item) => item.product.id === product.id);
              return <button key={product.id} onClick={() => loadProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-white">{product.name}</p>{ready?.ready ? <CheckCircle2 size={15} className="text-emerald-300" /> : <AlertTriangle size={15} className="text-amber-300" />}</div>
                <p className="mt-1 text-xs text-textMuted">/{product.slug}</p>
                <p className="mt-2 text-xs text-textMuted">{ready?.ready ? 'Ready' : `${ready?.errors ?? 0} errors · ${ready?.warnings ?? 0} warnings`}</p>
              </button>;
            }) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No products found yet.</p>}
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Product name</span><Input value={form.name} onChange={(e) => updateForm({ name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Slug / URL</span><Input value={form.slug} onChange={(e) => updateForm({ slug: slugify(e.target.value) })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Category</span><Select options={[{ value: '', label: 'Choose category' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} value={form.categoryId} onChange={(e) => updateForm({ categoryId: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Template</span><Select options={templateOptions} value={form.template} onChange={(e) => { const tpl = templateOptions.find((item) => item.value === e.target.value) || templateOptions[0]; updateForm({ template: tpl.value, vatRate: tpl.vatRate }); }} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Price from (£)</span><Input type="number" value={form.priceFrom} onChange={(e) => updateForm({ priceFrom: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">VAT rate</span><Select options={[{ value: 'standard', label: 'Standard VAT' }, { value: 'zero', label: 'Zero VAT' }]} value={form.vatRate} onChange={(e) => updateForm({ vatRate: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Quantity breaks</span><Select options={quantityPresets.map((value) => ({ value, label: value }))} value={form.quantities} onChange={(e) => updateForm({ quantities: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Pricing source</span><Select options={[{ value: 'fixed', label: 'Fixed / starter' }, { value: 'matrix', label: 'Matrix / Excel ready' }, { value: 'cost-based', label: 'Cost based' }, { value: 'supplier-api', label: 'Supplier API' }]} value={form.pricingSource} onChange={(e) => updateForm({ pricingSource: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Artwork required</span><Select options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} value={form.artworkRequired} onChange={(e) => updateForm({ artworkRequired: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Storefront visible</span><Select options={[{ value: 'yes', label: 'Visible' }, { value: 'no', label: 'Hidden' }]} value={form.visible} onChange={(e) => updateForm({ visible: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Payment</span><Select options={[{ value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Disabled' }]} value={form.paymentEnabled} onChange={(e) => updateForm({ paymentEnabled: e.target.value })} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Status</span><Select options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} value={form.status} onChange={(e) => updateForm({ status: e.target.value })} /></label>
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-white"><Layers3 size={16} /><p className="font-semibold">Selling options generated</p></div>
            <div className="mt-3 flex flex-wrap gap-2">{selectedTemplate.options.map((option) => <span key={option} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-textMuted">{option}</span>)}</div>
            <p className="mt-3 text-xs text-textMuted">Artwork profile: {selectedTemplate.artworkProfile} · bleed 3mm · PDF enabled</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button disabled={saving} onClick={() => saveProduct(false)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05] disabled:opacity-50"><Save size={16} />Save product</button>
            <button disabled={saving} onClick={() => saveProduct(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100 disabled:opacity-50"><Eye size={16} />Save & publish</button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 text-white"><ShieldCheck size={17} /><h3 className="font-semibold">Publish readiness</h3></div>
            {readinessForSelected ? <div className="mt-4 space-y-3">
              <div className={`rounded-2xl border p-4 ${readinessForSelected.ready ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-amber-400/20 bg-amber-400/10'}`}>
                <p className="text-sm font-semibold text-white">{readinessForSelected.ready ? 'Ready for storefront' : 'Needs fixes'}</p>
                <p className="mt-1 text-xs text-textMuted">{readinessForSelected.errors} errors · {readinessForSelected.warnings} warnings</p>
              </div>
              {readinessForSelected.issues.map((item) => <div key={`${item.code}-${item.field}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">{item.code}</p><p className="mt-1 text-xs leading-5 text-textMuted">{item.message}</p></div>)}
            </div> : <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">Save or select a product to see readiness.</p>}
          </Card>

          <Card>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Storefront payload</p>
            <pre className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{JSON.stringify({ name: form.name, slug: form.slug, priceFromMinor: moneyMinor(form.priceFrom), vatRate: form.vatRate, options: optionObjects(selectedTemplate.options), quantities: parseCsvNumbers(form.quantities), pricing: { source: form.pricingSource }, artworkRules: { profile: selectedTemplate.artworkProfile, bleedMm: 3 } }, null, 2)}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
