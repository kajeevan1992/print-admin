'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };
type OptionValue = { id: string; label: string; description?: string; imageUrl?: string; badge?: string; helpText?: string; priceDeltaMinor?: number; recommended?: boolean; disabled?: boolean };
type OptionGroup = { id: string; label: string; selector: string; required: boolean; helpText?: string; displayOrder: number; values: OptionValue[] };

const selectorTypes = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'cards', label: 'Text cards' },
  { value: 'image-cards', label: 'Image cards' },
  { value: 'swatches', label: 'Swatches / material chips' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox / yes-no' },
  { value: 'number', label: 'Number input' },
  { value: 'custom-size', label: 'Custom size fields' },
];

const templates: Record<string, OptionGroup[]> = {
  'business-cards': [
    group('size', 'Size', 'cards', ['85x55|Standard 85 × 55mm|Most popular', '90x50|90 × 50mm|', '55x55|Square 55 × 55mm|']),
    group('paper', 'Material', 'swatches', ['350-silk|350gsm Silk|Recommended', '450-silk|450gsm Silk|Premium', '350-uncoated|350gsm Uncoated|Writable']),
    group('lamination', 'Lamination', 'cards', ['none|No lamination|', 'matt|Matt lamination|', 'soft-touch|Soft touch|Recommended']),
    group('corners', 'Corners', 'radio', ['square|Square corners|', 'rounded|Rounded corners|'])
  ],
  leaflets: [
    group('size', 'Size', 'cards', ['a5|A5|Most popular', 'a4|A4|', 'dl|DL|']),
    group('paper', 'Paper', 'dropdown', ['130-gloss|130gsm Gloss|', '170-silk|170gsm Silk|Recommended', '250-silk|250gsm Silk|Premium']),
    group('sides', 'Printed sides', 'radio', ['single|Single sided|', 'double|Double sided|Recommended']),
  ],
  booklets: [
    group('size', 'Size', 'cards', ['a5|A5 booklet|Most popular', 'a4|A4 booklet|']),
    group('pages', 'Pages', 'number', ['8|8 pages|', '16|16 pages|', '24|24 pages|', '40|40 pages|']),
    group('binding', 'Binding', 'cards', ['stapled|Stapled|', 'perfect-bound|Perfect bound|For higher page counts']),
  ],
  boards: [
    group('size', 'Size', 'custom-size', ['custom|Custom size|Enter width and height']),
    group('material', 'Board material', 'image-cards', ['foamex|Foamex|Most popular', 'dibond|Dibond|Outdoor', 'correx|Correx|Budget']),
    group('lamination', 'Finish', 'cards', ['none|No lamination|', 'matt|Matt laminate|', 'gloss|Gloss laminate|'])
  ]
};

function group(id: string, label: string, selector: string, rows: string[]): OptionGroup {
  return { id, label, selector, required: true, displayOrder: 10, values: rows.map((row, index) => { const [valueId, valueLabel, badge] = row.split('|'); return { id: valueId, label: valueLabel, badge, recommended: /recommended|popular/i.test(badge || ''), priceDeltaMinor: 0 }; }) };
}
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function moneyMinor(value: string | number | undefined) { return Math.round(Number(value || 0) * 100); }
function pounds(value?: number) { return String(Number(value || 0) / 100); }
function normaliseGroups(product: Product | null): OptionGroup[] {
  const meta = product?.metadataJson || {};
  const groups = Array.isArray(meta.optionGroups) ? meta.optionGroups : Array.isArray(meta.options) ? meta.options.map((item: any, index: number) => ({ ...item, selector: item.selector || item.type || 'dropdown', displayOrder: index * 10, values: Array.isArray(item.values) ? item.values : [] })) : [];
  return groups.map((item: any, index: number) => ({ id: item.id || `group-${index + 1}`, label: item.label || item.name || item.id || `Group ${index + 1}`, selector: item.selector || 'dropdown', required: item.required !== false, helpText: item.helpText || '', displayOrder: Number(item.displayOrder ?? index * 10), values: Array.isArray(item.values) ? item.values.map((value: any) => ({ id: value.id || slugify(value.label || 'value'), label: value.label || value.name || value.id || 'Value', description: value.description || '', imageUrl: value.imageUrl || '', badge: value.badge || '', helpText: value.helpText || '', priceDeltaMinor: Number(value.priceDeltaMinor || 0), recommended: Boolean(value.recommended), disabled: Boolean(value.disabled) })) : [] }));
}

export default function ProductBuilderOptionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((item) => item.id === selectedId) || products[0] || null, [products, selectedId]);
  const selectedGroup = useMemo(() => groups.find((item) => item.id === selectedGroupId) || groups[0] || null, [groups, selectedGroupId]);

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
    } catch (err) { setError(err instanceof Error ? err.message : 'Options builder failed to load.'); }
    finally { setLoading(false); }
  }

  function selectProduct(id: string, source = products) {
    const product = source.find((item) => item.id === id);
    setSelectedId(id);
    const nextGroups = normaliseGroups(product || null);
    setGroups(nextGroups);
    setSelectedGroupId(nextGroups[0]?.id || '');
    setMessage(''); setError('');
  }

  useEffect(() => { load(); }, []);

  function patchGroup(id: string, patch: Partial<OptionGroup>) { setGroups((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  function patchValue(groupId: string, valueId: string, patch: Partial<OptionValue>) { setGroups((prev) => prev.map((group) => group.id === groupId ? { ...group, values: group.values.map((value) => value.id === valueId ? { ...value, ...patch } : value) } : group)); }
  function addGroup() { const next = { id: `option-${Date.now()}`, label: 'New option group', selector: 'dropdown', required: true, displayOrder: groups.length * 10, helpText: '', values: [] }; setGroups((prev) => [...prev, next]); setSelectedGroupId(next.id); }
  function addValue(groupId: string) { const value = { id: `value-${Date.now()}`, label: 'New value', priceDeltaMinor: 0 }; patchGroup(groupId, { values: [...(selectedGroup?.values || []), value] }); }
  function removeGroup(id: string) { const next = groups.filter((item) => item.id !== id); setGroups(next); setSelectedGroupId(next[0]?.id || ''); }
  function removeValue(groupId: string, valueId: string) { setGroups((prev) => prev.map((group) => group.id === groupId ? { ...group, values: group.values.filter((value) => value.id !== valueId) } : group)); }
  function applyTemplate() { const key = selectedProduct?.metadataJson?.template || selectedProduct?.productType || 'business-cards'; const next = templates[key] || templates['business-cards']; setGroups(JSON.parse(JSON.stringify(next))); setSelectedGroupId(next[0]?.id || ''); }

  async function save() {
    if (!selectedProduct) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const cleanGroups = groups.map((group, index) => ({ ...group, id: slugify(group.id || group.label), displayOrder: Number(group.displayOrder ?? index * 10), values: group.values.map((value) => ({ ...value, id: slugify(value.id || value.label), priceDeltaMinor: Number(value.priceDeltaMinor || 0) })) }));
      const metadataJson = { ...(selectedProduct.metadataJson || {}), optionGroups: cleanGroups, options: cleanGroups, selectorUi: { version: 'v361', layout: 'stepped-configurator', showRecommendedBadges: true, showHelpText: true, allowCustomSize: cleanGroups.some((group) => group.selector === 'custom-size') }, builderVersion: 'v361' };
      const res = await fetch('/api/internal/catalog/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedProduct.id, name: selectedProduct.name, slug: selectedProduct.slug, categoryId: selectedProduct.categoryId ?? null, priceFromMinor: selectedProduct.priceFromMinor ?? 0, currency: selectedProduct.currency || 'GBP', isActive: selectedProduct.isActive ?? false, productType: selectedProduct.productType, metadataJson }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Options save failed.');
      setMessage('Options and selector UI saved to product metadata.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Options save failed.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <PageHeader title="Unified Options + Selector UI Builder" subtitle="Design how each product option appears on the storefront: dropdowns, cards, image cards, swatches, checkboxes, custom-size fields, recommended badges and help text." />
    <Card className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v361 selector UI</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Real frontend configurator setup</h2><p className="mt-1 text-sm text-textMuted">Saves to metadataJson.optionGroups, metadataJson.options and metadataJson.selectorUi for hosted themes and rule/pricing engines.</p></div><div className="flex flex-wrap gap-2"><button onClick={applyTemplate} disabled={!selectedProduct} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05]">Apply print template</button><button onClick={save} disabled={saving || !selectedProduct} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save options</button></div></div></Card>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[320px_1fr_380px]">
      <Card><h3 className="text-sm font-semibold text-white">Products</h3><div className="mt-4 space-y-2">{products.map((product) => <button key={product.id} onClick={() => selectProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedProduct?.id === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}><p className="text-sm font-semibold text-white">{product.name}</p><p className="mt-1 text-xs text-textMuted">/{product.slug}</p><p className="mt-2 text-xs text-textMuted">{normaliseGroups(product).length} option group(s)</p></button>)}{!products.length && !loading ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No products found.</p> : null}</div></Card>
      <Card><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">Option groups</h3><p className="mt-1 text-sm text-textMuted">Each group becomes one storefront selector step.</p></div><button onClick={addGroup} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white"><Plus size={15}/>Group</button></div><div className="mt-4 space-y-3">{groups.map((group) => <button key={group.id} onClick={() => setSelectedGroupId(group.id)} className={`w-full rounded-2xl border p-3 text-left ${selectedGroupId === group.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03]'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{group.label}</p><p className="mt-1 text-xs text-textMuted">{group.selector} · {group.values.length} value(s)</p></div><Trash2 size={15} className="text-rose-200" onClick={(e) => { e.stopPropagation(); removeGroup(group.id); }}/></div></button>)}</div>{selectedGroup ? <div className="mt-5 space-y-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4"><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="text-sm font-medium">Group id</span><Input value={selectedGroup.id} onChange={(e) => patchGroup(selectedGroup.id, { id: slugify(e.target.value) })}/></label><label className="space-y-2"><span className="text-sm font-medium">Label shown to customer</span><Input value={selectedGroup.label} onChange={(e) => patchGroup(selectedGroup.id, { label: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Selector UI</span><Select value={selectedGroup.selector} options={selectorTypes} onChange={(e) => patchGroup(selectedGroup.id, { selector: e.target.value })}/></label><label className="space-y-2"><span className="text-sm font-medium">Required?</span><Select value={selectedGroup.required ? 'yes' : 'no'} options={[{ value: 'yes', label: 'Required' }, { value: 'no', label: 'Optional' }]} onChange={(e) => patchGroup(selectedGroup.id, { required: e.target.value === 'yes' })}/></label></div><label className="space-y-2 block"><span className="text-sm font-medium">Help text / tooltip</span><Input value={selectedGroup.helpText || ''} onChange={(e) => patchGroup(selectedGroup.id, { helpText: e.target.value })}/></label><div className="flex items-center justify-between"><h4 className="font-semibold text-white">Values</h4><button onClick={() => addValue(selectedGroup.id)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white">Add value</button></div><div className="space-y-3">{selectedGroup.values.map((value) => <div key={value.id} className="rounded-2xl border border-white/8 bg-black/20 p-3"><div className="grid gap-2 md:grid-cols-3"><Input value={value.id} placeholder="id" onChange={(e) => patchValue(selectedGroup.id, value.id, { id: slugify(e.target.value) })}/><Input value={value.label} placeholder="label" onChange={(e) => patchValue(selectedGroup.id, value.id, { label: e.target.value })}/><Input value={pounds(value.priceDeltaMinor)} placeholder="price +/- £" onChange={(e) => patchValue(selectedGroup.id, value.id, { priceDeltaMinor: moneyMinor(e.target.value) })}/></div><div className="mt-2 grid gap-2 md:grid-cols-3"><Input value={value.badge || ''} placeholder="badge e.g Recommended" onChange={(e) => patchValue(selectedGroup.id, value.id, { badge: e.target.value, recommended: /recommended|popular/i.test(e.target.value) })}/><Input value={value.imageUrl || ''} placeholder="image URL" onChange={(e) => patchValue(selectedGroup.id, value.id, { imageUrl: e.target.value })}/><Select value={value.disabled ? 'yes' : 'no'} options={[{ value: 'no', label: 'Enabled' }, { value: 'yes', label: 'Disabled' }]} onChange={(e) => patchValue(selectedGroup.id, value.id, { disabled: e.target.value === 'yes' })}/></div><Input className="mt-2" value={value.helpText || ''} placeholder="tooltip / help text" onChange={(e) => patchValue(selectedGroup.id, value.id, { helpText: e.target.value })}/><button onClick={() => removeValue(selectedGroup.id, value.id)} className="mt-2 text-xs text-rose-200">Remove value</button></div>)}</div></div> : <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">Create or select an option group.</p>}</Card>
      <div className="space-y-4"><Card><h3 className="font-semibold text-white">Storefront preview structure</h3><div className="mt-4 space-y-3">{groups.map((group) => <div key={group.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">{group.label}</p><p className="mt-1 text-xs text-textMuted">{group.selector} · {group.required ? 'required' : 'optional'}</p><div className="mt-3 flex flex-wrap gap-2">{group.values.slice(0, 6).map((value) => <span key={value.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-textMuted">{value.label}{value.badge ? ` · ${value.badge}` : ''}</span>)}</div></div>)}</div></Card><Card><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Saved JSON preview</p><pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{JSON.stringify({ optionGroups: groups, selectorUi: { version: 'v361', layout: 'stepped-configurator', showRecommendedBadges: true, showHelpText: true, allowCustomSize: groups.some((g) => g.selector === 'custom-size') } }, null, 2)}</pre></Card></div>
    </div>
  </div>;
}
