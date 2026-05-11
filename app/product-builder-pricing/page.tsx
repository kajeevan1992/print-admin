'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Save, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };
type OptionGroup = { id: string; label?: string; selector?: string; values?: any[] };

type PricingForm = {
  pricingMode: string;
  vatRate: string;
  markupPercent: string;
  minCharge: string;
  setupCost: string;
  runCost: string;
  wastagePercent: string;
  quantityBreaks: string;
  matrixRows: string;
  sheetSize: string;
  parentSheetSize: string;
  productWidthMm: string;
  productHeightMm: string;
  bleedMm: string;
  gutterMm: string;
  upsPerSheet: string;
  setupSheets: string;
  clickCost: string;
  materialCost: string;
  rollWidthMm: string;
  rollLengthM: string;
  areaRate: string;
  panelJoinCost: string;
  finishingRows: string;
  supplierMode: string;
  supplierMarkupPercent: string;
};

const pricingModes = [
  { value: 'fixed', label: 'Fixed/base price' },
  { value: 'matrix', label: 'Matrix pricing' },
  { value: 'sheet-cost', label: 'Sheet cost / SRA3 maths' },
  { value: 'booklet', label: 'Booklet maths' },
  { value: 'area', label: 'Area / large format' },
  { value: 'supplier-api', label: 'Supplier API + markup' },
];

function moneyMinor(value: string | number | undefined) { return Math.round(Number(value || 0) * 100); }
function pounds(value?: number) { return String(Number(value || 0) / 100); }
function numberValue(value: string | number | undefined, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? next : fallback; }
function lines(value: string) { return value.split('\n').map((line) => line.trim()).filter(Boolean); }
function csv(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function money(minor?: number, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format((Number(minor || 0)) / 100); }
function parseMatrixRows(value: string) { return lines(value).map((line) => { const [key, price, cost] = line.split('|'); return { key: (key || '').trim(), priceMinor: moneyMinor(price), costMinor: moneyMinor(cost) }; }).filter((row) => row.key); }
function parseQuantityBreaks(value: string) { return csv(value).map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0); }
function parseFinishingRows(value: string) { return lines(value).map((line, index) => { const [id, label, setup, run, vatRate] = line.split('|'); return { id: (id || `finish-${index + 1}`).trim(), label: (label || id || 'Finishing').trim(), setupCostMinor: moneyMinor(setup), runCostMinor: moneyMinor(run), vatRate: (vatRate || 'standard').trim() }; }).filter((row) => row.label); }
function optionGroups(product: Product | null): OptionGroup[] { const meta = product?.metadataJson || {}; const groups = Array.isArray(meta.optionGroups) ? meta.optionGroups : Array.isArray(meta.options) ? meta.options : []; return groups.map((group: any) => ({ id: group.id, label: group.label || group.name || group.id, selector: group.selector || group.type || 'dropdown', values: Array.isArray(group.values) ? group.values : [] })).filter((group: OptionGroup) => group.id); }

function formFromProduct(product: Product | null): PricingForm {
  const meta = product?.metadataJson || {};
  const pricing = meta.pricing || {};
  const printMaths = meta.printMaths || {};
  const finishing = Array.isArray(meta.finishing) ? meta.finishing : [];
  const supplier = meta.supplierPricing || {};
  return {
    pricingMode: pricing.mode || pricing.source || 'fixed',
    vatRate: meta.vatRate || pricing.vatRate || 'standard',
    markupPercent: String(pricing.markupPercent ?? 35),
    minCharge: pounds(pricing.minChargeMinor ?? 0),
    setupCost: pounds(pricing.setupCostMinor ?? 0),
    runCost: pounds(pricing.runCostMinor ?? 0),
    wastagePercent: String(pricing.wastagePercent ?? 5),
    quantityBreaks: Array.isArray(pricing.quantityBreaks) ? pricing.quantityBreaks.join(',') : '100,250,500,1000,2500,5000',
    matrixRows: Array.isArray(pricing.matrixRows) ? pricing.matrixRows.map((row: any) => `${row.key}|${Number(row.priceMinor || 0) / 100}|${Number(row.costMinor || 0) / 100}`).join('\n') : '',
    sheetSize: printMaths.sheetSize || 'SRA3',
    parentSheetSize: printMaths.parentSheetSize || 'SRA2',
    productWidthMm: String(printMaths.productWidthMm ?? ''),
    productHeightMm: String(printMaths.productHeightMm ?? ''),
    bleedMm: String(printMaths.bleedMm ?? 3),
    gutterMm: String(printMaths.gutterMm ?? 2),
    upsPerSheet: String(printMaths.upsPerSheet ?? ''),
    setupSheets: String(printMaths.setupSheets ?? 10),
    clickCost: pounds(printMaths.clickCostMinor ?? 0),
    materialCost: pounds(printMaths.materialCostMinor ?? 0),
    rollWidthMm: String(printMaths.rollWidthMm ?? 1200),
    rollLengthM: String(printMaths.rollLengthM ?? 50),
    areaRate: pounds(printMaths.areaRateMinor ?? 0),
    panelJoinCost: pounds(printMaths.panelJoinCostMinor ?? 0),
    finishingRows: finishing.map((row: any) => `${row.id}|${row.label}|${Number(row.setupCostMinor || 0) / 100}|${Number(row.runCostMinor || 0) / 100}|${row.vatRate || 'standard'}`).join('\n') || 'trim|Trimming|5|0.01|standard\nlamination|Lamination|10|0.05|standard',
    supplierMode: supplier.mode || 'off',
    supplierMarkupPercent: String(supplier.markupPercent ?? 20),
  };
}

function buildPricingMetadata(product: Product, form: PricingForm) {
  const existing = product.metadataJson || {};
  return {
    ...existing,
    vatRate: form.vatRate,
    pricing: {
      ...(existing.pricing || {}),
      mode: form.pricingMode,
      source: form.pricingMode,
      vatRate: form.vatRate,
      markupPercent: numberValue(form.markupPercent, 35),
      minChargeMinor: moneyMinor(form.minCharge),
      setupCostMinor: moneyMinor(form.setupCost),
      runCostMinor: moneyMinor(form.runCost),
      wastagePercent: numberValue(form.wastagePercent, 5),
      quantityBreaks: parseQuantityBreaks(form.quantityBreaks),
      matrixRows: parseMatrixRows(form.matrixRows),
      priceFromMinor: existing.pricing?.priceFromMinor || product.priceFromMinor || 0,
    },
    printMaths: {
      ...(existing.printMaths || {}),
      sheetSize: form.sheetSize,
      parentSheetSize: form.parentSheetSize,
      productWidthMm: numberValue(form.productWidthMm),
      productHeightMm: numberValue(form.productHeightMm),
      bleedMm: numberValue(form.bleedMm, 3),
      gutterMm: numberValue(form.gutterMm, 2),
      upsPerSheet: numberValue(form.upsPerSheet),
      setupSheets: numberValue(form.setupSheets, 10),
      clickCostMinor: moneyMinor(form.clickCost),
      materialCostMinor: moneyMinor(form.materialCost),
      rollWidthMm: numberValue(form.rollWidthMm, 1200),
      rollLengthM: numberValue(form.rollLengthM, 50),
      areaRateMinor: moneyMinor(form.areaRate),
      panelJoinCostMinor: moneyMinor(form.panelJoinCost),
    },
    finishing: parseFinishingRows(form.finishingRows),
    supplierPricing: {
      ...(existing.supplierPricing || {}),
      mode: form.supplierMode,
      markupPercent: numberValue(form.supplierMarkupPercent, 20),
    },
    pricingEngineVersion: 'v363-unified',
    builderVersion: 'v363',
  };
}

function estimateLocal(form: PricingForm, quantity: number) {
  const setupMinor = moneyMinor(form.setupCost);
  const runMinor = moneyMinor(form.runCost) * quantity;
  const materialMinor = moneyMinor(form.materialCost) * Math.max(1, Math.ceil(quantity / Math.max(1, numberValue(form.upsPerSheet, 1))));
  const finishingMinor = parseFinishingRows(form.finishingRows).reduce((sum, row) => sum + row.setupCostMinor + row.runCostMinor * quantity, 0);
  const areaSqm = Math.max(0, (numberValue(form.productWidthMm) / 1000) * (numberValue(form.productHeightMm) / 1000));
  const areaMinor = form.pricingMode === 'area' ? Math.round(areaSqm * quantity * moneyMinor(form.areaRate)) : 0;
  const costMinor = setupMinor + runMinor + materialMinor + finishingMinor + areaMinor;
  const withWaste = Math.round(costMinor * (1 + numberValue(form.wastagePercent, 0) / 100));
  const sellMinor = Math.max(moneyMinor(form.minCharge), Math.round(withWaste * (1 + numberValue(form.markupPercent, 0) / 100)));
  const rollWidth = numberValue(form.rollWidthMm, 1200);
  const widerSide = Math.max(numberValue(form.productWidthMm), numberValue(form.productHeightMm));
  const panelPieces = widerSide > rollWidth ? Math.ceil(widerSide / rollWidth) : 1;
  return { costMinor: withWaste, sellMinor, unitMinor: quantity ? Math.round(sellMinor / quantity) : sellMinor, areaSqm, panelPieces };
}

export default function ProductBuilderPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<PricingForm>(formFromProduct(null));
  const [quantity, setQuantity] = useState('500');
  const [testSelection, setTestSelection] = useState('{}');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId) || products[0] || null, [products, selectedId]);
  const groups = useMemo(() => optionGroups(selectedProduct), [selectedProduct]);
  const localEstimate = useMemo(() => estimateLocal(form, numberValue(quantity, 1)), [form, quantity]);

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
    } catch (err) { setError(err instanceof Error ? err.message : 'Pricing builder failed to load.'); }
    finally { setLoading(false); }
  }
  function selectProduct(id: string, source = products) {
    const product = source.find((item) => item.id === id) || null;
    setSelectedId(id);
    setForm(formFromProduct(product));
    const selections: Record<string, string> = {};
    optionGroups(product).forEach((group) => { const value = group.values?.[0]; if (value) selections[group.id] = value.id || value.value || value.label; });
    setTestSelection(JSON.stringify(selections, null, 2));
    setDiagnostics(null); setMessage(''); setError('');
  }
  useEffect(() => { load(); }, []);
  const patch = (value: Partial<PricingForm>) => setForm((prev) => ({ ...prev, ...value }));

  async function save() {
    if (!selectedProduct) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const metadataJson = buildPricingMetadata(selectedProduct, form);
      const res = await fetch('/api/internal/catalog/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedProduct.id, name: selectedProduct.name, slug: selectedProduct.slug, categoryId: selectedProduct.categoryId ?? null, priceFromMinor: selectedProduct.priceFromMinor ?? 0, currency: selectedProduct.currency || 'GBP', isActive: selectedProduct.isActive ?? false, productType: selectedProduct.productType, metadataJson }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Pricing save failed.');
      setMessage('Pricing and print maths saved to product metadata.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Pricing save failed.'); }
    finally { setSaving(false); }
  }

  async function runDiagnostics() {
    if (!selectedProduct) return;
    setRunning(true); setError(''); setDiagnostics(null);
    try {
      await save();
      const selections = testSelection.trim() ? JSON.parse(testSelection) : {};
      const res = await fetch('/api/internal/catalog/pricing-diagnostics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: selectedProduct.id, quantity: numberValue(quantity, 1), selections }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || json.error?.message || 'Pricing diagnostics failed.');
      setDiagnostics(json.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Pricing diagnostics failed.'); }
    finally { setRunning(false); }
  }

  return <div className="space-y-6">
    <PageHeader title="Unified Pricing + Print Maths Engine" subtitle="Configure matrix, sheet, booklet, area, finishing, VAT and supplier pricing per product, connected to optionGroups and diagnostics." />
    <Card className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v363 pricing engine</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Product pricing is now manufacturing-aware</h2><p className="mt-1 text-sm text-textMuted">Saves to metadataJson.pricing, printMaths, finishing and supplierPricing. Existing Pricing/Print Maths labs remain as backups.</p></div><div className="flex flex-wrap gap-2"><button onClick={save} disabled={!selectedProduct || saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save pricing</button><button onClick={runDiagnostics} disabled={!selectedProduct || running} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Wand2 size={16}/>Save & test</button></div></div></Card>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[300px_1fr_380px]">
      <Card><h3 className="text-sm font-semibold text-white">Products</h3><div className="mt-4 space-y-2">{products.map((product) => <button key={product.id} onClick={() => selectProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedProduct?.id === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}><p className="text-sm font-semibold text-white">{product.name}</p><p className="mt-1 text-xs text-textMuted">/{product.slug}</p><p className="mt-2 text-xs text-textMuted">{groups.length} option group(s)</p></button>)}{!products.length && !loading ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No products found.</p> : null}</div></Card>
      <div className="space-y-4">
        <Card><h3 className="font-semibold text-white">Pricing mode</h3><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="space-y-2"><span className="text-sm font-medium">Mode</span><Select value={form.pricingMode} options={pricingModes} onChange={(e) => patch({ pricingMode: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">VAT</span><Select value={form.vatRate} options={[{ value: 'standard', label: 'Standard VAT' }, { value: 'zero', label: 'Zero VAT' }, { value: 'mixed', label: 'Mixed product/service VAT' }]} onChange={(e) => patch({ vatRate: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Markup %</span><Input type="number" value={form.markupPercent} onChange={(e) => patch({ markupPercent: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Min charge £</span><Input type="number" value={form.minCharge} onChange={(e) => patch({ minCharge: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Setup cost £</span><Input type="number" value={form.setupCost} onChange={(e) => patch({ setupCost: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Run cost £ per unit</span><Input type="number" value={form.runCost} onChange={(e) => patch({ runCost: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Wastage %</span><Input type="number" value={form.wastagePercent} onChange={(e) => patch({ wastagePercent: e.target.value })}/></label><label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">Quantity breaks</span><Input value={form.quantityBreaks} onChange={(e) => patch({ quantityBreaks: e.target.value })}/></label></div></Card>
        <Card><h3 className="font-semibold text-white">Sheet / booklet maths</h3><div className="mt-4 grid gap-4 md:grid-cols-4"><Input value={form.sheetSize} placeholder="Sheet e.g. SRA3" onChange={(e) => patch({ sheetSize: e.target.value })}/><Input value={form.parentSheetSize} placeholder="Parent e.g. SRA2" onChange={(e) => patch({ parentSheetSize: e.target.value })}/><Input type="number" value={form.productWidthMm} placeholder="Width mm" onChange={(e) => patch({ productWidthMm: e.target.value })}/><Input type="number" value={form.productHeightMm} placeholder="Height mm" onChange={(e) => patch({ productHeightMm: e.target.value })}/><Input type="number" value={form.bleedMm} placeholder="Bleed mm" onChange={(e) => patch({ bleedMm: e.target.value })}/><Input type="number" value={form.gutterMm} placeholder="Gutter mm" onChange={(e) => patch({ gutterMm: e.target.value })}/><Input type="number" value={form.upsPerSheet} placeholder="Ups per sheet" onChange={(e) => patch({ upsPerSheet: e.target.value })}/><Input type="number" value={form.setupSheets} placeholder="Setup sheets" onChange={(e) => patch({ setupSheets: e.target.value })}/><Input type="number" value={form.clickCost} placeholder="Click cost £" onChange={(e) => patch({ clickCost: e.target.value })}/><Input type="number" value={form.materialCost} placeholder="Material cost £" onChange={(e) => patch({ materialCost: e.target.value })}/></div></Card>
        <Card><h3 className="font-semibold text-white">Large format / roll media</h3><div className="mt-4 grid gap-4 md:grid-cols-4"><Input type="number" value={form.rollWidthMm} placeholder="Roll width mm" onChange={(e) => patch({ rollWidthMm: e.target.value })}/><Input type="number" value={form.rollLengthM} placeholder="Roll length m" onChange={(e) => patch({ rollLengthM: e.target.value })}/><Input type="number" value={form.areaRate} placeholder="Area rate £/sqm" onChange={(e) => patch({ areaRate: e.target.value })}/><Input type="number" value={form.panelJoinCost} placeholder="Panel join £" onChange={(e) => patch({ panelJoinCost: e.target.value })}/></div></Card>
        <Card><h3 className="font-semibold text-white">Matrix, finishing and supplier pricing</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="text-sm font-medium">Matrix rows: key|sell£|cost£</span><textarea value={form.matrixRows} onChange={(e) => patch({ matrixRows: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label><label className="space-y-2"><span className="text-sm font-medium">Finishing: id|label|setup£|run£|vat</span><textarea value={form.finishingRows} onChange={(e) => patch({ finishingRows: e.target.value })} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label><label className="space-y-2"><span className="text-sm font-medium">Supplier mode</span><Select value={form.supplierMode} options={[{ value: 'off', label: 'Off/internal only' }, { value: 'api', label: 'Supplier API' }, { value: 'matrix-upload', label: 'Supplier matrix upload' }]} onChange={(e) => patch({ supplierMode: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Supplier markup %</span><Input type="number" value={form.supplierMarkupPercent} onChange={(e) => patch({ supplierMarkupPercent: e.target.value })}/></label></div></Card>
      </div>
      <div className="space-y-4"><Card><div className="flex items-center gap-2 text-white"><Calculator size={17}/><h3 className="font-semibold">Local estimate</h3></div><label className="mt-4 block space-y-2"><span className="text-sm font-medium">Quantity</span><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}/></label><div className="mt-4 grid gap-3 text-sm"><div className="flex justify-between"><span className="text-textMuted">Estimated cost</span><span className="text-white">{money(localEstimate.costMinor)}</span></div><div className="flex justify-between"><span className="text-textMuted">Sell price</span><span className="text-white">{money(localEstimate.sellMinor)}</span></div><div className="flex justify-between"><span className="text-textMuted">Unit</span><span className="text-white">{money(localEstimate.unitMinor)}</span></div><div className="flex justify-between"><span className="text-textMuted">Area sqm</span><span className="text-white">{localEstimate.areaSqm.toFixed(3)}</span></div><div className="flex justify-between"><span className="text-textMuted">Panels</span><span className="text-white">{localEstimate.panelPieces}</span></div></div></Card><Card><h3 className="font-semibold text-white">Diagnostics test</h3><p className="mt-1 text-xs text-textMuted">Runs the existing internal pricing diagnostics endpoint after save.</p><textarea value={testSelection} onChange={(e) => setTestSelection(e.target.value)} className="mt-4 min-h-[160px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white outline-none"/><button onClick={runDiagnostics} disabled={!selectedProduct || running} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Wand2 size={16}/>Save & test pricing</button></Card><Card><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Diagnostic result</p><pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{diagnostics ? JSON.stringify(diagnostics, null, 2) : 'No test run yet.'}</pre></Card></div>
    </div>
  </div>;
}
