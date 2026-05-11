'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };

type ArtworkForm = {
  artworkRequired: string;
  acceptedFileTypes: string;
  maxFileSizeMb: string;
  bleedMm: string;
  safeAreaMm: string;
  minDpi: string;
  colourMode: string;
  pdfStandard: string;
  pageCountMode: string;
  minPages: string;
  maxPages: string;
  allowManualOverride: string;
  blockCheckoutOnFail: string;
  customerMessage: string;
  artworkGuidance: string;
  machineRows: string;
  materialRows: string;
  finishingRows: string;
  supplierRows: string;
  sizeLimitMode: string;
  maxWidthMm: string;
  maxHeightMm: string;
  maxRollWidthMm: string;
  allowPanelJoin: string;
  panelJoinMessage: string;
};

function lines(value: string) { return value.split('\n').map((line) => line.trim()).filter(Boolean); }
function csv(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function numberValue(value: string | number | undefined, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? next : fallback; }
function parseRows(value: string, fields: string[]) {
  return lines(value).map((line, index) => {
    const parts = line.split('|').map((part) => part.trim());
    const row: Record<string, any> = { id: parts[0] || `row-${index + 1}` };
    fields.forEach((field, fieldIndex) => { row[field] = parts[fieldIndex] || ''; });
    return row;
  });
}
function formFromProduct(product: Product | null): ArtworkForm {
  const meta = product?.metadataJson || {};
  const artwork = meta.artwork || {};
  const rules = meta.artworkRules || {};
  const constraints = meta.productionConstraints || {};
  const machines = Array.isArray(constraints.machines) ? constraints.machines : [];
  const materials = Array.isArray(constraints.materials) ? constraints.materials : [];
  const finishing = Array.isArray(constraints.finishingCompatibility) ? constraints.finishingCompatibility : [];
  const suppliers = Array.isArray(constraints.supplierRestrictions) ? constraints.supplierRestrictions : [];
  return {
    artworkRequired: meta.artworkRequired === false ? 'no' : 'yes',
    acceptedFileTypes: Array.isArray(artwork.acceptedFiles) ? artwork.acceptedFiles.join(',') : Array.isArray(rules.fileTypes) ? rules.fileTypes.join(',') : 'pdf,ai,eps,jpg,png',
    maxFileSizeMb: String(rules.maxFileSizeMb ?? artwork.maxFileSizeMb ?? 250),
    bleedMm: String(artwork.bleedMm ?? rules.bleedMm ?? 3),
    safeAreaMm: String(rules.safeAreaMm ?? 3),
    minDpi: String(rules.minDpi ?? 300),
    colourMode: rules.colourMode || 'cmyk-preferred',
    pdfStandard: rules.pdfStandard || 'pdf-x-preferred',
    pageCountMode: rules.pageCountMode || 'flexible',
    minPages: String(rules.minPages ?? ''),
    maxPages: String(rules.maxPages ?? ''),
    allowManualOverride: rules.allowManualOverride === false ? 'no' : 'yes',
    blockCheckoutOnFail: rules.blockCheckoutOnFail === false ? 'no' : 'yes',
    customerMessage: artwork.customerMessage || 'Please upload print-ready artwork. We will check bleed, resolution, colour mode and file format before production.',
    artworkGuidance: Array.isArray(artwork.guidance) ? artwork.guidance.join('\n') : 'Keep important text inside the safe area.\nUse CMYK colours where possible.\nExport as high-resolution PDF for best results.',
    machineRows: machines.map((m: any) => `${m.id}|${m.name}|${m.maxWidthMm || ''}|${m.maxHeightMm || ''}|${m.maxRollWidthMm || ''}|${m.enabled === false ? 'disabled' : 'enabled'}`).join('\n') || 'ricoh-c5400|Ricoh Pro C5400S|330|487||enabled\nlarge-format|Large Format Printer|||1200|enabled',
    materialRows: materials.map((m: any) => `${m.id}|${m.name}|${m.type || ''}|${m.compatibleMachines?.join(',') || ''}|${m.enabled === false ? 'disabled' : 'enabled'}`).join('\n') || '350-silk|350gsm Silk|sheet|ricoh-c5400|enabled\npvc-banner|PVC Banner|roll|large-format|enabled',
    finishingRows: finishing.map((f: any) => `${f.option}|${f.allowedMaterials?.join(',') || ''}|${f.blockedMaterials?.join(',') || ''}|${f.message || ''}`).join('\n') || 'lamination|350-silk,450-silk||Lamination is only available on selected coated stocks.\nrounded-corners|350-silk,450-silk||Rounded corners are available on business card stocks.',
    supplierRows: suppliers.map((s: any) => `${s.supplier}|${s.blockedOptions?.join(',') || ''}|${s.blockedMaterials?.join(',') || ''}|${s.message || ''}`).join('\n') || 'trade-supplier-a|same-day|custom-material|Supplier cannot fulfil same-day jobs for this material.',
    sizeLimitMode: constraints.sizeLimitMode || 'machine-width',
    maxWidthMm: String(constraints.maxWidthMm ?? ''),
    maxHeightMm: String(constraints.maxHeightMm ?? ''),
    maxRollWidthMm: String(constraints.maxRollWidthMm ?? 1200),
    allowPanelJoin: constraints.allowPanelJoin === false ? 'no' : 'yes',
    panelJoinMessage: constraints.panelJoinMessage || 'This size may need to be printed in panels and joined. The join seam may be visible.',
  };
}
function buildMetadata(product: Product, form: ArtworkForm) {
  const existing = product.metadataJson || {};
  return {
    ...existing,
    artworkRequired: form.artworkRequired === 'yes',
    artwork: {
      ...(existing.artwork || {}),
      acceptedFiles: csv(form.acceptedFileTypes),
      maxFileSizeMb: numberValue(form.maxFileSizeMb, 250),
      bleedMm: numberValue(form.bleedMm, 3),
      customerMessage: form.customerMessage,
      guidance: lines(form.artworkGuidance),
    },
    artworkRules: {
      ...(existing.artworkRules || {}),
      fileTypes: csv(form.acceptedFileTypes),
      maxFileSizeMb: numberValue(form.maxFileSizeMb, 250),
      bleedMm: numberValue(form.bleedMm, 3),
      safeAreaMm: numberValue(form.safeAreaMm, 3),
      minDpi: numberValue(form.minDpi, 300),
      colourMode: form.colourMode,
      pdfStandard: form.pdfStandard,
      pageCountMode: form.pageCountMode,
      minPages: form.minPages ? numberValue(form.minPages) : null,
      maxPages: form.maxPages ? numberValue(form.maxPages) : null,
      allowManualOverride: form.allowManualOverride === 'yes',
      blockCheckoutOnFail: form.blockCheckoutOnFail === 'yes',
    },
    productionConstraints: {
      ...(existing.productionConstraints || {}),
      sizeLimitMode: form.sizeLimitMode,
      maxWidthMm: form.maxWidthMm ? numberValue(form.maxWidthMm) : null,
      maxHeightMm: form.maxHeightMm ? numberValue(form.maxHeightMm) : null,
      maxRollWidthMm: numberValue(form.maxRollWidthMm, 1200),
      allowPanelJoin: form.allowPanelJoin === 'yes',
      panelJoinMessage: form.panelJoinMessage,
      machines: parseRows(form.machineRows, ['id', 'name', 'maxWidthMm', 'maxHeightMm', 'maxRollWidthMm', 'status']).map((row) => ({ ...row, maxWidthMm: row.maxWidthMm ? Number(row.maxWidthMm) : null, maxHeightMm: row.maxHeightMm ? Number(row.maxHeightMm) : null, maxRollWidthMm: row.maxRollWidthMm ? Number(row.maxRollWidthMm) : null, enabled: row.status !== 'disabled' })),
      materials: parseRows(form.materialRows, ['id', 'name', 'type', 'compatibleMachines', 'status']).map((row) => ({ ...row, compatibleMachines: csv(row.compatibleMachines), enabled: row.status !== 'disabled' })),
      finishingCompatibility: parseRows(form.finishingRows, ['option', 'allowedMaterials', 'blockedMaterials', 'message']).map((row) => ({ ...row, allowedMaterials: csv(row.allowedMaterials), blockedMaterials: csv(row.blockedMaterials) })),
      supplierRestrictions: parseRows(form.supplierRows, ['supplier', 'blockedOptions', 'blockedMaterials', 'message']).map((row) => ({ ...row, blockedOptions: csv(row.blockedOptions), blockedMaterials: csv(row.blockedMaterials) })),
    },
    preflightVersion: 'v364-unified',
    builderVersion: 'v364',
  };
}
function localCheck(form: ArtworkForm) {
  const warnings: string[] = [];
  if (form.artworkRequired === 'yes' && !csv(form.acceptedFileTypes).length) warnings.push('Artwork is required but no accepted file types are configured.');
  if (numberValue(form.bleedMm, 0) < 3) warnings.push('Bleed is below the common 3mm print default.');
  if (numberValue(form.minDpi, 0) < 150) warnings.push('Minimum DPI is very low for print.');
  if (form.sizeLimitMode === 'machine-width' && numberValue(form.maxRollWidthMm, 0) <= 0) warnings.push('Machine-width size limit needs a roll width.');
  if (form.allowPanelJoin === 'yes' && !form.panelJoinMessage.trim()) warnings.push('Panel join is allowed but no customer warning message is set.');
  return warnings;
}

export default function ProductBuilderArtworkPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<ArtworkForm>(formFromProduct(null));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedProduct = useMemo(() => products.find((p) => p.id === selectedId) || products[0] || null, [products, selectedId]);
  const warnings = useMemo(() => localCheck(form), [form]);

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/internal/catalog/products?limit=300', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Products failed to load.');
      const items = Array.isArray(json.data?.items) ? json.data.items : [];
      setProducts(items);
      const next = selectedId ? items.find((item: Product) => item.id === selectedId) : items[0];
      if (next) selectProduct(next.id, items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Artwork builder failed to load.'); }
    finally { setLoading(false); }
  }
  function selectProduct(id: string, source = products) {
    const product = source.find((item) => item.id === id) || null;
    setSelectedId(id);
    setForm(formFromProduct(product));
    setMessage(''); setError('');
  }
  useEffect(() => { load(); }, []);
  const patch = (value: Partial<ArtworkForm>) => setForm((prev) => ({ ...prev, ...value }));

  async function save() {
    if (!selectedProduct) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const metadataJson = buildMetadata(selectedProduct, form);
      const res = await fetch('/api/internal/catalog/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedProduct.id, name: selectedProduct.name, slug: selectedProduct.slug, categoryId: selectedProduct.categoryId ?? null, priceFromMinor: selectedProduct.priceFromMinor ?? 0, currency: selectedProduct.currency || 'GBP', isActive: selectedProduct.isActive ?? false, productType: selectedProduct.productType, metadataJson }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Artwork/preflight save failed.');
      setMessage('Artwork, preflight and production constraints saved.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Artwork/preflight save failed.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <PageHeader title="Unified Artwork + Preflight + Production Constraints" subtitle="Configure artwork rules, file checks, machine/material compatibility, finishing restrictions, supplier constraints and production-safe customer messages." />
    <Card className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v364 production safety</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Artwork and production checks are now product-owned</h2><p className="mt-1 text-sm text-textMuted">Saves to metadataJson.artwork, artworkRules and productionConstraints for storefront, preflight, pricing and production flows.</p></div><button onClick={save} disabled={!selectedProduct || saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save constraints</button></div></Card>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[300px_1fr_380px]">
      <Card><h3 className="text-sm font-semibold text-white">Products</h3><div className="mt-4 space-y-2">{products.map((product) => <button key={product.id} onClick={() => selectProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedProduct?.id === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}><p className="text-sm font-semibold text-white">{product.name}</p><p className="mt-1 text-xs text-textMuted">/{product.slug}</p><p className="mt-2 text-xs text-textMuted">{product.metadataJson?.preflightVersion || 'No preflight version'}</p></button>)}{!products.length && !loading ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No products found.</p> : null}</div></Card>
      <div className="space-y-4">
        <Card><h3 className="font-semibold text-white">Artwork preflight rules</h3><div className="mt-4 grid gap-4 md:grid-cols-4"><label className="space-y-2"><span className="text-sm font-medium">Artwork required</span><Select value={form.artworkRequired} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} onChange={(e) => patch({ artworkRequired: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Accepted files</span><Input value={form.acceptedFileTypes} onChange={(e) => patch({ acceptedFileTypes: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Max file MB</span><Input type="number" value={form.maxFileSizeMb} onChange={(e) => patch({ maxFileSizeMb: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Min DPI</span><Input type="number" value={form.minDpi} onChange={(e) => patch({ minDpi: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Bleed mm</span><Input type="number" value={form.bleedMm} onChange={(e) => patch({ bleedMm: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Safe area mm</span><Input type="number" value={form.safeAreaMm} onChange={(e) => patch({ safeAreaMm: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Colour mode</span><Select value={form.colourMode} options={[{ value: 'cmyk-required', label: 'CMYK required' }, { value: 'cmyk-preferred', label: 'CMYK preferred' }, { value: 'rgb-allowed', label: 'RGB allowed' }]} onChange={(e) => patch({ colourMode: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">PDF standard</span><Select value={form.pdfStandard} options={[{ value: 'pdf-x-required', label: 'PDF/X required' }, { value: 'pdf-x-preferred', label: 'PDF/X preferred' }, { value: 'any-pdf', label: 'Any PDF' }]} onChange={(e) => patch({ pdfStandard: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Page count mode</span><Select value={form.pageCountMode} options={[{ value: 'flexible', label: 'Flexible' }, { value: 'exact', label: 'Exact' }, { value: 'range', label: 'Range' }, { value: 'multiple-of-4', label: 'Multiple of 4' }]} onChange={(e) => patch({ pageCountMode: e.target.value })}/></label><Input type="number" placeholder="Min pages" value={form.minPages} onChange={(e) => patch({ minPages: e.target.value })}/><Input type="number" placeholder="Max pages" value={form.maxPages} onChange={(e) => patch({ maxPages: e.target.value })}/><label className="space-y-2"><span className="text-sm font-medium">Block checkout on fail</span><Select value={form.blockCheckoutOnFail} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No, warn only' }]} onChange={(e) => patch({ blockCheckoutOnFail: e.target.value })}/></label></div><label className="mt-4 block space-y-2"><span className="text-sm font-medium">Customer upload message</span><Input value={form.customerMessage} onChange={(e) => patch({ customerMessage: e.target.value })}/></label><label className="mt-4 block space-y-2"><span className="text-sm font-medium">Artwork guidance, one line each</span><textarea value={form.artworkGuidance} onChange={(e) => patch({ artworkGuidance: e.target.value })} className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label></Card>
        <Card><h3 className="font-semibold text-white">Machine and size constraints</h3><div className="mt-4 grid gap-4 md:grid-cols-4"><label className="space-y-2"><span className="text-sm font-medium">Size limit mode</span><Select value={form.sizeLimitMode} options={[{ value: 'none', label: 'No limit' }, { value: 'fixed-size', label: 'Fixed max W/H' }, { value: 'machine-width', label: 'Machine / roll width' }]} onChange={(e) => patch({ sizeLimitMode: e.target.value })}/></label><Input type="number" placeholder="Max width mm" value={form.maxWidthMm} onChange={(e) => patch({ maxWidthMm: e.target.value })}/><Input type="number" placeholder="Max height mm" value={form.maxHeightMm} onChange={(e) => patch({ maxHeightMm: e.target.value })}/><Input type="number" placeholder="Max roll width mm" value={form.maxRollWidthMm} onChange={(e) => patch({ maxRollWidthMm: e.target.value })}/><label className="space-y-2"><span className="text-sm font-medium">Allow panel joins</span><Select value={form.allowPanelJoin} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} onChange={(e) => patch({ allowPanelJoin: e.target.value })}/></label><label className="space-y-2 md:col-span-3"><span className="text-sm font-medium">Panel join message</span><Input value={form.panelJoinMessage} onChange={(e) => patch({ panelJoinMessage: e.target.value })}/></label></div><label className="mt-4 block space-y-2"><span className="text-sm font-medium">Machines: id|name|maxWidth|maxHeight|maxRollWidth|enabled</span><textarea value={form.machineRows} onChange={(e) => patch({ machineRows: e.target.value })} className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label></Card>
        <Card><h3 className="font-semibold text-white">Materials, finishing and supplier restrictions</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="text-sm font-medium">Materials: id|name|type|compatibleMachines|enabled</span><textarea value={form.materialRows} onChange={(e) => patch({ materialRows: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label><label className="space-y-2"><span className="text-sm font-medium">Finishing compatibility: option|allowedMaterials|blockedMaterials|message</span><textarea value={form.finishingRows} onChange={(e) => patch({ finishingRows: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label><label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">Supplier restrictions: supplier|blockedOptions|blockedMaterials|message</span><textarea value={form.supplierRows} onChange={(e) => patch({ supplierRows: e.target.value })} className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label></div></Card>
      </div>
      <div className="space-y-4"><Card><div className="flex items-center gap-2 text-white"><ShieldCheck size={17}/><h3 className="font-semibold">Local checks</h3></div><div className="mt-4 space-y-2">{warnings.length ? warnings.map((warning) => <div key={warning} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">{warning}</div>) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">No local warnings detected.</div>}</div></Card><Card><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Saved metadata preview</p><pre className="mt-4 max-h-[620px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{selectedProduct ? JSON.stringify(buildMetadata(selectedProduct, form), null, 2) : 'No product selected.'}</pre></Card></div>
    </div>
  </div>;
}
