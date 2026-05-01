'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, ImageIcon, Save, Truck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };

type FormState = {
  heroImageUrl: string;
  galleryUrls: string;
  materialImages: string;
  shortDescription: string;
  longDescription: string;
  sameDayEnabled: string;
  sameDayCutoff: string;
  saverDays: string;
  standardDays: string;
  expressDays: string;
  deliveryCountdown: string;
  designServices: string;
  artworkGuides: string;
  artworkTemplates: string;
  specifications: string;
  designGuidelines: string;
  faqs: string;
  orderingProcess: string;
  technicalSpecifications: string;
  sustainabilityPolicy: string;
  relatedProducts: string;
  materialDetails: string;
  editorMode: string;
};

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parsePairs(value: string) {
  return lines(value).map((line) => {
    const [label, ...rest] = line.split(':');
    return { label: (label || '').trim(), value: rest.join(':').trim() };
  }).filter((item) => item.label || item.value);
}

function parseFaqs(value: string) {
  return lines(value).map((line) => {
    const [question, ...rest] = line.split('|');
    return { question: (question || '').trim(), answer: rest.join('|').trim() };
  }).filter((item) => item.question || item.answer);
}

function parseServices(value: string) {
  return lines(value).map((line, index) => {
    const [label, price] = line.split('|');
    return { id: `design-service-${index + 1}`, label: (label || '').trim(), priceMinor: Math.round(Number(price || 0) * 100) };
  }).filter((item) => item.label);
}

function parseAssets(value: string) {
  return lines(value).map((line, index) => {
    const [label, url] = line.split('|');
    return { id: `asset-${index + 1}`, label: (label || '').trim(), url: (url || '').trim() };
  }).filter((item) => item.label || item.url);
}

function formFromProduct(product: Product | null): FormState {
  const meta = product?.metadataJson || {};
  const media = meta.media || {};
  const content = meta.content || {};
  const delivery = meta.delivery || {};
  const artwork = meta.artwork || {};
  const editor = meta.editor || {};
  return {
    heroImageUrl: media.heroImageUrl || '',
    galleryUrls: Array.isArray(media.gallery) ? media.gallery.join('\n') : '',
    materialImages: Array.isArray(media.materialImages) ? media.materialImages.map((item: any) => `${item.label || ''}|${item.url || ''}`).join('\n') : '',
    shortDescription: content.shortDescription || '',
    longDescription: content.longDescription || '',
    sameDayEnabled: delivery.services?.find((item: any) => item.id === 'same-day')?.enabled ? 'yes' : 'no',
    sameDayCutoff: delivery.services?.find((item: any) => item.id === 'same-day')?.cutoff || '10:00',
    saverDays: String(delivery.services?.find((item: any) => item.id === 'saver')?.workingDays ?? 5),
    standardDays: String(delivery.services?.find((item: any) => item.id === 'standard')?.workingDays ?? 3),
    expressDays: String(delivery.services?.find((item: any) => item.id === 'express')?.workingDays ?? 1),
    deliveryCountdown: delivery.countdownEnabled === false ? 'no' : 'yes',
    designServices: Array.isArray(meta.designServices) ? meta.designServices.map((item: any) => `${item.label}|${Number(item.priceMinor || 0) / 100}`).join('\n') : 'Basic design help|25\nFull design service|75',
    artworkGuides: Array.isArray(artwork.guides) ? artwork.guides.map((item: any) => `${item.label}|${item.url}`).join('\n') : '',
    artworkTemplates: Array.isArray(artwork.templates) ? artwork.templates.map((item: any) => `${item.label}|${item.url}`).join('\n') : '',
    specifications: Array.isArray(content.specifications) ? content.specifications.map((item: any) => `${item.label}: ${item.value}`).join('\n') : '',
    designGuidelines: Array.isArray(content.designGuidelines) ? content.designGuidelines.join('\n') : '',
    faqs: Array.isArray(content.faqs) ? content.faqs.map((item: any) => `${item.question}|${item.answer}`).join('\n') : '',
    orderingProcess: Array.isArray(content.orderingProcess) ? content.orderingProcess.join('\n') : '',
    technicalSpecifications: Array.isArray(content.technicalSpecifications) ? content.technicalSpecifications.map((item: any) => `${item.label}: ${item.value}`).join('\n') : '',
    sustainabilityPolicy: content.sustainabilityPolicy || '',
    relatedProducts: Array.isArray(meta.relatedProducts) ? meta.relatedProducts.join(',') : '',
    materialDetails: Array.isArray(content.materialDetails) ? content.materialDetails.map((item: any) => `${item.label}: ${item.value}`).join('\n') : '',
    editorMode: editor.useTemplateDesign ? 'template-and-cart' : 'add-to-cart-only',
  };
}

function buildMetadata(product: Product, form: FormState) {
  const existing = product.metadataJson || {};
  return {
    ...existing,
    media: {
      ...(existing.media || {}),
      heroImageUrl: form.heroImageUrl,
      gallery: lines(form.galleryUrls),
      materialImages: parseAssets(form.materialImages),
    },
    content: {
      ...(existing.content || {}),
      shortDescription: form.shortDescription,
      longDescription: form.longDescription,
      specifications: parsePairs(form.specifications),
      designGuidelines: lines(form.designGuidelines),
      faqs: parseFaqs(form.faqs),
      orderingProcess: lines(form.orderingProcess),
      technicalSpecifications: parsePairs(form.technicalSpecifications),
      sustainabilityPolicy: form.sustainabilityPolicy,
      materialDetails: parsePairs(form.materialDetails),
    },
    delivery: {
      ...(existing.delivery || {}),
      countdownEnabled: form.deliveryCountdown === 'yes',
      services: [
        { id: 'same-day', label: 'Same Day', enabled: form.sameDayEnabled === 'yes', cutoff: form.sameDayCutoff, workingDays: 0, extraMinor: 1500 },
        { id: 'saver', label: 'Saver', enabled: true, workingDays: Number(form.saverDays || 5), extraMinor: 0 },
        { id: 'standard', label: 'Standard', enabled: true, workingDays: Number(form.standardDays || 3), extraMinor: 500 },
        { id: 'express', label: 'Express', enabled: true, workingDays: Number(form.expressDays || 1), extraMinor: 1000 },
      ],
    },
    designServices: parseServices(form.designServices),
    artwork: {
      ...(existing.artwork || {}),
      guides: parseAssets(form.artworkGuides),
      templates: parseAssets(form.artworkTemplates),
      acceptedFiles: ['pdf'],
      bleedMm: existing.artwork?.bleedMm || existing.artworkRules?.bleedMm || 3,
    },
    editor: {
      ...(existing.editor || {}),
      addToCartOnly: form.editorMode === 'add-to-cart-only',
      useTemplateDesign: form.editorMode === 'template-and-cart',
    },
    relatedProducts: csv(form.relatedProducts),
    storefrontContentVersion: 'v332',
  };
}

export default function ProductStorefrontContentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>(formFromProduct(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId) || null, [products, selectedId]);

  function patch(patchValue: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patchValue }));
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/internal/catalog/products', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Products failed to load.');
      const items = json.data?.items || [];
      setProducts(items);
      const next = selectedId ? items.find((item: Product) => item.id === selectedId) : items[0];
      if (next) {
        setSelectedId(next.id);
        setForm(formFromProduct(next));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storefront content.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function selectProduct(id: string) {
    const product = products.find((item) => item.id === id);
    setSelectedId(id);
    setForm(formFromProduct(product || null));
    setMessage('');
    setError('');
  }

  async function save() {
    if (!selectedProduct) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const metadataJson = buildMetadata(selectedProduct, form);
      const res = await fetch('/api/internal/catalog/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: selectedProduct.name,
          slug: selectedProduct.slug,
          categoryId: selectedProduct.categoryId ?? null,
          priceFromMinor: selectedProduct.priceFromMinor ?? 0,
          currency: selectedProduct.currency || 'GBP',
          isActive: selectedProduct.isActive ?? false,
          productType: selectedProduct.productType,
          metadataJson,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Storefront content save failed.');
      setMessage('Storefront content saved to product metadata.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Storefront content save failed.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Product Storefront Content Builder" subtitle="Manage product-specific storefront content: images, descriptions, delivery services, design add-ons, artwork guides, FAQs, specifications, sustainability and related products." />

    <Card className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v332 product content</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Everything shown on the storefront comes from each product</h2>
          <p className="mt-1 text-sm text-textMuted">This stores content in metadataJson.media, content, delivery, designServices, artwork, editor and relatedProducts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05]">Refresh</button>
          <button onClick={save} disabled={!selectedProduct || saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save content</button>
        </div>
      </div>
    </Card>

    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}

    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="text-sm font-semibold text-white">Products</h3>
        <div className="mt-4 space-y-2">
          {products.map((product) => <button key={product.id} onClick={() => selectProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
            <p className="text-sm font-semibold text-white">{product.name}</p>
            <p className="mt-1 text-xs text-textMuted">/{product.slug}</p>
            <p className="mt-2 text-xs text-textMuted">{product.metadataJson?.storefrontContentVersion ? 'Content saved' : 'No content yet'}</p>
          </button>)}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 text-white"><ImageIcon size={17}/><h3 className="font-semibold">Media and descriptions</h3></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Hero image URL</span><Input value={form.heroImageUrl} onChange={(e) => patch({ heroImageUrl: e.target.value })}/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Gallery image URLs, one per line</span><textarea value={form.galleryUrls} onChange={(e) => patch({ galleryUrls: e.target.value })} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">Short description</span><Input value={form.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })}/></label>
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">Long description</span><textarea value={form.longDescription} onChange={(e) => patch({ longDescription: e.target.value })} className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-white"><Truck size={17}/><h3 className="font-semibold">Delivery options and countdown</h3></div>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <label className="space-y-2"><span className="text-sm font-medium">Same day</span><Select value={form.sameDayEnabled} onChange={(e) => patch({ sameDayEnabled: e.target.value })} options={[{ value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Disabled' }]}/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Same day cutoff</span><Input value={form.sameDayCutoff} onChange={(e) => patch({ sameDayCutoff: e.target.value })}/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Saver days</span><Input type="number" value={form.saverDays} onChange={(e) => patch({ saverDays: e.target.value })}/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Standard days</span><Input type="number" value={form.standardDays} onChange={(e) => patch({ standardDays: e.target.value })}/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Express days</span><Input type="number" value={form.expressDays} onChange={(e) => patch({ expressDays: e.target.value })}/></label>
          </div>
          <div className="mt-4"><Select value={form.deliveryCountdown} onChange={(e) => patch({ deliveryCountdown: e.target.value })} options={[{ value: 'yes', label: 'Show countdown: order within X to receive by date' }, { value: 'no', label: 'Hide countdown' }]}/></div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-white"><FileText size={17}/><h3 className="font-semibold">Design services, artwork guides and templates</h3></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2"><span className="text-sm font-medium">Design services: label|price</span><textarea value={form.designServices} onChange={(e) => patch({ designServices: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Artwork guide PDFs: label|url</span><textarea value={form.artworkGuides} onChange={(e) => patch({ artworkGuides: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Artwork templates: label|url</span><textarea value={form.artworkTemplates} onChange={(e) => patch({ artworkTemplates: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
          </div>
          <div className="mt-4"><Select value={form.editorMode} onChange={(e) => patch({ editorMode: e.target.value })} options={[{ value: 'add-to-cart-only', label: 'Add to cart only' }, { value: 'template-and-cart', label: 'Add to cart + Use template designer' }]}/></div>
        </Card>

        <Card>
          <h3 className="font-semibold text-white">Product information tabs</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Specifications: label: value</span><textarea value={form.specifications} onChange={(e) => patch({ specifications: e.target.value })} className="min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Technical specifications: label: value</span><textarea value={form.technicalSpecifications} onChange={(e) => patch({ technicalSpecifications: e.target.value })} className="min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Design guidelines, one per line</span><textarea value={form.designGuidelines} onChange={(e) => patch({ designGuidelines: e.target.value })} className="min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">FAQs: question|answer</span><textarea value={form.faqs} onChange={(e) => patch({ faqs: e.target.value })} className="min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Ordering process, one step per line</span><textarea value={form.orderingProcess} onChange={(e) => patch({ orderingProcess: e.target.value })} className="min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Sustainability/environmental policy</span><textarea value={form.sustainabilityPolicy} onChange={(e) => patch({ sustainabilityPolicy: e.target.value })} className="min-h-[130px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-white">Related products and material details</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2"><span className="text-sm font-medium">Related product IDs, comma separated</span><textarea value={form.relatedProducts} onChange={(e) => patch({ relatedProducts: e.target.value })} className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Material details: label: value</span><textarea value={form.materialDetails} onChange={(e) => patch({ materialDetails: e.target.value })} className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
            <label className="space-y-2"><span className="text-sm font-medium">Material images: label|url</span><textarea value={form.materialImages} onChange={(e) => patch({ materialImages: e.target.value })} className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>
          </div>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Storefront content preview</p>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{selectedProduct ? JSON.stringify(buildMetadata(selectedProduct, form), null, 2) : 'Select a product'}</pre>
        </Card>
      </div>
    </div>
  </div>;
}
