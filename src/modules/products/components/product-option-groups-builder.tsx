'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductSectionCard } from './product-section-card';
import type { Product, ProductOptionDisplayType, ProductOptionGroup, ProductOptionSource, ProductOptionValue } from '@/modules/products/types';
import { productConfigurationReadinessLabel, validateProductConfiguration } from '@/modules/products/lib/product-configuration-readiness';

type LibraryItem = { id: string; name?: string; title?: string; slug?: string; description?: string; gsm?: string; maxWidth?: number; maxPrintableWidth?: number };
type LibraryState = { materials: LibraryItem[]; finishes: LibraryItem[]; optionSets: LibraryItem[] };

const displayTypes: ProductOptionDisplayType[] = ['dropdown', 'radio', 'image-cards', 'checkboxes', 'swatches', 'quantity-grid', 'custom-size', 'info-cards'];
const sourceLabels: Record<ProductOptionSource, string> = {
  size: 'Sizes / dimensions',
  material: 'Materials library',
  finish: 'Finishes library',
  quantity: 'Quantities',
  turnaround: 'Turnaround',
  custom: 'Custom option',
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'option';
}

async function loadLibrary(resource: string): Promise<LibraryItem[]> {
  const response = await fetch(`/api/internal/catalog/${resource}?limit=200`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `Failed to load ${resource}`);
  return payload.data?.items || [];
}

function itemLabel(item: LibraryItem) {
  return item.name || item.title || item.slug || item.id;
}

function libraryValue(item: LibraryItem): ProductOptionValue {
  return {
    id: item.id,
    sourceId: item.id,
    label: itemLabel(item),
    description: item.description || item.gsm || '',
  };
}

function templateGroup(source: ProductOptionSource, library: LibraryState): ProductOptionGroup {
  if (source === 'material') {
    return { id: makeId('group'), name: 'Material', key: 'material', source, displayType: 'image-cards', required: true, values: library.materials.slice(0, 6).map(libraryValue), pricingKey: 'material' };
  }
  if (source === 'finish') {
    return { id: makeId('group'), name: 'Finish', key: 'finish', source, displayType: 'checkboxes', required: false, allowMultiple: true, values: library.finishes.slice(0, 6).map(libraryValue), pricingKey: 'finish' };
  }
  if (source === 'size') {
    return {
      id: makeId('group'), name: 'Size', key: 'size', source, displayType: 'image-cards', required: true, allowCustomSize: false, dimensionMode: 'preset-only', unit: 'mm',
      pricingKey: 'size', sheetFitMode: 'sra3', sourceSheetWidth: 320, sourceSheetHeight: 450, helpText: 'Use preset sizes and enable custom size only where this product supports it.',
      values: [
        { id: makeId('size'), label: '85 × 55 mm', width: 85, height: 55, unit: 'mm', description: 'UK standard business card' },
        { id: makeId('size'), label: '55 × 55 mm', width: 55, height: 55, unit: 'mm', description: 'Square format' },
      ],
    };
  }
  if (source === 'quantity') {
    return { id: makeId('group'), name: 'Quantity', key: 'quantity', source, displayType: 'quantity-grid', required: true, quantityMode: 'fixed-list', values: [25, 50, 100, 250, 500, 1000].map((qty) => ({ id: `qty-${qty}`, label: String(qty), quantity: qty, productionCode: `qty-${qty}` })) };
  }
  if (source === 'turnaround') {
    return { id: makeId('group'), name: 'Turnaround', key: 'turnaround', source, displayType: 'radio', required: true, values: [{ id: 'standard', label: 'Standard', leadTimeDays: 5 }, { id: 'priority', label: 'Priority', leadTimeDays: 3 }, { id: 'rush', label: 'Rush', leadTimeDays: 1 }] };
  }
  return { id: makeId('group'), name: 'Custom option', key: 'custom-option', source, displayType: 'dropdown', required: false, values: [{ id: makeId('value'), label: 'Option value' }] };
}

function updateGroup(groups: ProductOptionGroup[], id: string, patch: Partial<ProductOptionGroup>) {
  return groups.map((group) => group.id === id ? { ...group, ...patch } : group);
}

function updateValue(group: ProductOptionGroup, valueId: string, patch: Partial<ProductOptionValue>): ProductOptionGroup {
  return { ...group, values: group.values.map((value) => value.id === valueId ? { ...value, ...patch } : value) };
}

function setDefaultValue(group: ProductOptionGroup, valueId: string): ProductOptionGroup {
  return {
    ...group,
    defaultValueId: valueId,
    values: group.values.map((value) => ({ ...value, isDefault: value.id === valueId })),
  };
}

function orderedValues(group: ProductOptionGroup) {
  return [...group.values]
    .filter((value) => !value.isHidden)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

function updateDependencyRule(group: ProductOptionGroup, ruleId: string, patch: Partial<NonNullable<ProductOptionGroup['dependencyRules']>[number]>): ProductOptionGroup {
  const rules = group.dependencyRules || [];
  return { ...group, dependencyRules: rules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule) };
}

function dependencySourceValues(groups: ProductOptionGroup[], groupKey: string) {
  return groups.find((group) => group.key === groupKey || group.pricingKey === groupKey)?.values || [];
}

function toggleId(list: string[] | undefined, id: string, checked: boolean) {
  const current = new Set(list || []);
  if (checked) current.add(id); else current.delete(id);
  return Array.from(current);
}

function selectedCompatibilityIds(value: ProductOptionValue, group: ProductOptionGroup) {
  if (group.source === 'finish') return value.compatibleMaterialIds || [];
  if (group.source === 'material') return value.compatibleFinishIds || [];
  if (group.source === 'size') return value.compatiblePrinterIds || [];
  return value.compatibleMaterialIds || [];
}

export function ProductOptionGroupsBuilder({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  const [library, setLibrary] = useState<LibraryState>({ materials: [], finishes: [], optionSets: [] });
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const groups = product.optionGroups || [];
  const readinessIssues = validateProductConfiguration(product);
  const readinessLabel = productConfigurationReadinessLabel(readinessIssues);

  useEffect(() => {
    Promise.all([loadLibrary('materials'), loadLibrary('finishes'), loadLibrary('option-sets')])
      .then(([materials, finishes, optionSets]) => setLibrary({ materials, finishes, optionSets }))
      .catch((error) => setLibraryError(error instanceof Error ? error.message : 'Failed to load option libraries'));
  }, []);

  const libraryBySource = useMemo(() => ({ material: library.materials, finish: library.finishes, custom: library.optionSets }), [library]);
  const compatibilityTargetLibrary = (group: ProductOptionGroup): LibraryItem[] => {
    if (group.source === 'finish') return library.materials;
    if (group.source === 'material') return library.finishes;
    if (group.source === 'size') return library.optionSets;
    return [];
  };

  const setGroups = (next: ProductOptionGroup[]) => onUpdate({ optionGroups: next });

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Product Option Groups">
        <p className="text-sm leading-6 text-textMuted">
          Build the choices a customer sees on the storefront. Materials and finishes must come from their libraries so the pricing engine can use the same IDs later.
        </p>
        {libraryError && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{libraryError}</div>}
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Configuration readiness</p>
              <p className="mt-1 text-sm font-medium text-white">{readinessLabel}</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-textMuted">{readinessIssues.length} check{readinessIssues.length === 1 ? '' : 's'}</span>
          </div>
          {readinessIssues.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {readinessIssues.slice(0, 6).map((issue) => (
                <div key={issue.id} className={`rounded-lg border p-2 text-sm ${issue.level === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-100' : issue.level === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-sky-500/30 bg-sky-500/10 text-sky-100'}`}>
                  <p className="font-medium">{issue.title}</p>
                  <p className="mt-1 text-xs opacity-80">{issue.message}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-emerald-200">This product has the basic option structure needed before pricing setup.</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['size', 'material', 'finish', 'quantity', 'turnaround', 'custom'] as ProductOptionSource[]).map((source) => (
            <Button key={source} onClick={() => setGroups([...groups, templateGroup(source, library)])}>Add {sourceLabels[source]}</Button>
          ))}
        </div>
      </ProductSectionCard>

      {!groups.length && (
        <ProductSectionCard title="No option groups yet">
          <p className="text-sm text-textMuted">Add size, material, finish, quantity and turnaround groups to describe how this product should be ordered.</p>
        </ProductSectionCard>
      )}

      {groups.map((group, groupIndex) => {
        const linkedLibrary = group.source === 'material' || group.source === 'finish' || group.source === 'custom' ? libraryBySource[group.source] || [] : [];
        return (
          <ProductSectionCard key={group.id} title={`${groupIndex + 1}. ${group.name || 'Option group'}`}>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm"><span className="text-textMuted">Group name</span><Input value={group.name} onChange={(e) => setGroups(updateGroup(groups, group.id, { name: e.target.value, key: slugify(e.target.value) }))} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Display on storefront</span><select value={group.displayType} onChange={(e) => setGroups(updateGroup(groups, group.id, { displayType: e.target.value as ProductOptionDisplayType }))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">{displayTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Unit / size unit</span><Input value={group.unit || ''} placeholder="mm" onChange={(e) => setGroups(updateGroup(groups, group.id, { unit: e.target.value }))} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Pricing key</span><Input value={group.pricingKey || group.key || ''} placeholder="material" onChange={(e) => setGroups(updateGroup(groups, group.id, { pricingKey: e.target.value }))} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Default value</span><select value={group.defaultValueId || ''} onChange={(e) => setGroups(updateGroup(groups, group.id, setDefaultValue(group, e.target.value)))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm"><option value="">No default</option>{group.values.map((value) => <option key={value.id} value={value.id}>{value.label || value.id}</option>)}</select></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Display columns</span><Input type="number" min={1} max={4} value={String(group.displayColumns || '')} placeholder="Auto" onChange={(e) => setGroups(updateGroup(groups, group.id, { displayColumns: Number(e.target.value) || undefined }))} /></label>
              <label className="flex items-end gap-2 pb-2 text-sm text-textMuted"><input type="checkbox" checked={!!group.hideDescriptions} onChange={(e) => setGroups(updateGroup(groups, group.id, { hideDescriptions: e.target.checked }))} /> Hide descriptions</label>
              <label className="space-y-1 text-sm md:col-span-3"><span className="text-textMuted">Customer help text</span><Input value={group.helpText || ''} placeholder="Explain this choice on the storefront" onChange={(e) => setGroups(updateGroup(groups, group.id, { helpText: e.target.value }))} /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-textMuted">
              <label className="flex items-center gap-2"><input type="checkbox" checked={group.required} onChange={(e) => setGroups(updateGroup(groups, group.id, { required: e.target.checked }))} /> Required</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!group.allowMultiple} onChange={(e) => setGroups(updateGroup(groups, group.id, { allowMultiple: e.target.checked }))} /> Allow multiple</label>
              {group.source === 'size' && <label className="flex items-center gap-2"><input type="checkbox" checked={!!group.allowCustomSize} onChange={(e) => setGroups(updateGroup(groups, group.id, { allowCustomSize: e.target.checked }))} /> Allow custom size</label>}
            </div>
            {group.allowCustomSize && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="text-textMuted">Max printable width</span><Input type="number" value={String(group.maxWidth || '')} placeholder="1200" onChange={(e) => setGroups(updateGroup(groups, group.id, { maxWidth: Number(e.target.value) || undefined }))} /></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Max printable height/length</span><Input type="number" value={String(group.maxHeight || '')} placeholder="10000" onChange={(e) => setGroups(updateGroup(groups, group.id, { maxHeight: Number(e.target.value) || undefined }))} /></label>
                <p className="text-xs leading-5 text-textMuted md:col-span-2">Use these limits for custom-size products such as banners and boards. Later pricing will compare customer width/height against material roll, sheet and printer limits.</p>
              </div>
            )}

            {group.source === 'size' && (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Print size / sheet-fit rules</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Dimension mode</span><select value={group.dimensionMode || (group.allowCustomSize ? 'preset-and-custom' : 'preset-only')} onChange={(e) => {
                    const mode = e.target.value as NonNullable<ProductOptionGroup['dimensionMode']>;
                    setGroups(updateGroup(groups, group.id, { dimensionMode: mode, allowCustomSize: mode !== 'preset-only', displayType: mode === 'custom-only' ? 'custom-size' : group.displayType }));
                  }} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                    <option value="preset-only">Preset sizes only</option>
                    <option value="preset-and-custom">Preset + custom size</option>
                    <option value="custom-only">Custom size only</option>
                  </select></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Sheet / roll mode</span><select value={group.sheetFitMode || 'none'} onChange={(e) => setGroups(updateGroup(groups, group.id, { sheetFitMode: e.target.value as NonNullable<ProductOptionGroup['sheetFitMode']> }))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                    <option value="none">No sheet-fit rule yet</option>
                    <option value="sra3">SRA3 sheet fit</option>
                    <option value="custom-sheet">Custom sheet size</option>
                    <option value="roll">Roll material</option>
                    <option value="board">Rigid board</option>
                  </select></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Limit source</span><select value={group.sourceLimitMode || 'manual'} onChange={(e) => setGroups(updateGroup(groups, group.id, { sourceLimitMode: e.target.value as 'manual' | 'material-printer' }))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                    <option value="manual">Manual limits for now</option>
                    <option value="material-printer">Material + printer limits later</option>
                  </select></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Compatibility mode</span><select value={group.compatibilityMode || 'none'} onChange={(e) => setGroups(updateGroup(groups, group.id, { compatibilityMode: e.target.value as NonNullable<ProductOptionGroup['compatibilityMode']> }))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                    <option value="none">No compatibility rule yet</option>
                    <option value="size-to-printer">Size must fit selected printer/profile</option>
                    <option value="material-to-printer">Material must fit printer/material limits</option>
                  </select></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Min width</span><Input type="number" value={String(group.minWidth || '')} placeholder="25" onChange={(e) => setGroups(updateGroup(groups, group.id, { minWidth: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Min height/length</span><Input type="number" value={String(group.minHeight || '')} placeholder="25" onChange={(e) => setGroups(updateGroup(groups, group.id, { minHeight: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Size increment</span><Input type="number" value={String(group.increment || '')} placeholder="1" onChange={(e) => setGroups(updateGroup(groups, group.id, { increment: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Source sheet/roll width</span><Input type="number" value={String(group.sourceSheetWidth || '')} placeholder="320 / 1220 / 1300" onChange={(e) => setGroups(updateGroup(groups, group.id, { sourceSheetWidth: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Source sheet/roll height</span><Input type="number" value={String(group.sourceSheetHeight || '')} placeholder="450 / 2440 / 50000" onChange={(e) => setGroups(updateGroup(groups, group.id, { sourceSheetHeight: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Max ups per sheet</span><Input type="number" value={String(group.maxUpsPerSheet || '')} placeholder="auto later" onChange={(e) => setGroups(updateGroup(groups, group.id, { maxUpsPerSheet: Number(e.target.value) || undefined }))} /></label>
                </div>
                <p className="mt-3 text-xs leading-5 text-textMuted">These fields do not calculate price yet. They store the print-shop constraints the pricing engine will need later: SRA3 sheet fit, roll width, board size and custom-size limits.</p>
              </div>
            )}

            {group.source === 'quantity' && (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Quantity rules</p>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Quantity mode</span><select value={group.quantityMode || 'fixed-list'} onChange={(e) => setGroups(updateGroup(groups, group.id, { quantityMode: e.target.value as NonNullable<ProductOptionGroup['quantityMode']> }))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                    <option value="fixed-list">Fixed list</option>
                    <option value="range-with-step">Range with step</option>
                  </select></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Min qty</span><Input type="number" value={String(group.minQuantity || '')} placeholder="25" onChange={(e) => setGroups(updateGroup(groups, group.id, { minQuantity: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Max qty</span><Input type="number" value={String(group.maxQuantity || '')} placeholder="20000" onChange={(e) => setGroups(updateGroup(groups, group.id, { maxQuantity: Number(e.target.value) || undefined }))} /></label>
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Step</span><Input type="number" value={String(group.quantityStep || '')} placeholder="25" onChange={(e) => setGroups(updateGroup(groups, group.id, { quantityStep: Number(e.target.value) || undefined }))} /></label>
                </div>
              </div>
            )}

            {(group.source === 'material' || group.source === 'finish') && (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Compatibility rules</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm"><span className="text-textMuted">Compatibility mode</span><select value={group.compatibilityMode || (group.source === 'finish' ? 'finish-to-material' : 'material-to-finish')} onChange={(e) => setGroups(updateGroup(groups, group.id, { compatibilityMode: e.target.value as NonNullable<ProductOptionGroup['compatibilityMode']> }))} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                    <option value="none">No compatibility rule</option>
                    <option value="finish-to-material">Finish only works with selected materials</option>
                    <option value="material-to-finish">Material only allows selected finishes</option>
                    <option value="material-to-printer">Material must fit printer/material limits</option>
                  </select></label>
                  <label className="space-y-1 text-sm md:col-span-2"><span className="text-textMuted">Compatibility notes</span><Input value={group.compatibilityNotes || ''} placeholder="Example: soft touch only on silk/coated cards" onChange={(e) => setGroups(updateGroup(groups, group.id, { compatibilityNotes: e.target.value }))} /></label>
                </div>
                <p className="mt-3 text-xs leading-5 text-textMuted">Use this to stop impossible customer choices before pricing: for example spot UV only after matte lamination, or a roll material only on a wide-format printer.</p>
              </div>
            )}

            {linkedLibrary.length > 0 && (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-textMuted">Link values from library</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {linkedLibrary.map((item) => {
                    const selected = group.values.some((value) => value.sourceId === item.id || value.id === item.id);
                    return <label key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm"><input type="checkbox" checked={selected} onChange={(e) => {
                      const nextGroup = e.target.checked
                        ? { ...group, values: [...group.values, libraryValue(item)] }
                        : { ...group, values: group.values.filter((value) => value.sourceId !== item.id && value.id !== item.id) };
                      setGroups(updateGroup(groups, group.id, nextGroup));
                    }} /><span><span className="block text-white">{itemLabel(item)}</span><span className="text-textMuted">{item.description || item.gsm || item.slug}</span></span></label>;
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between"><p className="text-sm font-medium text-white">Values shown to customer</p><Button onClick={() => setGroups(updateGroup(groups, group.id, { values: [...group.values, { id: makeId('value'), label: 'New value' }] }))}>Add value</Button></div>
              {orderedValues(group).map((value) => (
                <div key={value.id} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                  <Input value={value.label} placeholder="Label" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { label: e.target.value })))} />
                  <Input value={value.description || ''} placeholder="Short description" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { description: e.target.value })))} />
                  <Input value={value.imageUrl || ''} placeholder="Image URL / icon URL" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { imageUrl: e.target.value })))} />
                  <Input value={value.pricingKey || ''} placeholder="Pricing value key" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { pricingKey: e.target.value })))} />
                  <Input value={value.productionCode || ''} placeholder="Production code" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { productionCode: e.target.value })))} />
                  <Button className="text-red-300" onClick={() => setGroups(updateGroup(groups, group.id, { values: group.values.filter((item) => item.id !== value.id), defaultValueId: group.defaultValueId === value.id ? undefined : group.defaultValueId }))}>Remove</Button>
                  <Input type="number" value={String(value.sortOrder ?? '')} placeholder="Sort order" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { sortOrder: Number(e.target.value) || undefined })))} />
                  <Input value={value.swatchColor || ''} placeholder="Swatch colour e.g. #ffffff" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { swatchColor: e.target.value })))} />
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-textMuted"><input type="radio" name={`default-${group.id}`} checked={group.defaultValueId === value.id || !!value.isDefault} onChange={() => setGroups(updateGroup(groups, group.id, setDefaultValue(group, value.id)))} /> Default</label>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-textMuted"><input type="checkbox" checked={!!value.isHidden} onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { isHidden: e.target.checked })))} /> Hide</label>
                  {group.source === 'size' && <><Input type="number" value={String(value.width || '')} placeholder="Width" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { width: Number(e.target.value) || undefined })))} /><Input type="number" value={String(value.height || '')} placeholder="Height" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { height: Number(e.target.value) || undefined })))} /></>}
                  {group.source === 'quantity' && <Input type="number" value={String(value.quantity || '')} placeholder="Quantity" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { quantity: Number(e.target.value) || undefined, label: e.target.value })))} />}
                  {(group.source === 'material' || group.source === 'finish' || group.source === 'size') && compatibilityTargetLibrary(group).length > 0 && (
                    <div className="md:col-span-6 rounded-lg border border-white/8 bg-white/[0.03] p-2">
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-textMuted">Compatible {group.source === 'finish' ? 'materials' : group.source === 'material' ? 'finishes' : 'printer/profile options'}</p>
                      <div className="grid gap-2 md:grid-cols-3">
                        {compatibilityTargetLibrary(group).slice(0, 12).map((item) => {
                          const ids = selectedCompatibilityIds(value, group);
                          const checked = ids.includes(item.id);
                          return <label key={item.id} className="flex items-center gap-2 text-xs text-textMuted"><input type="checkbox" checked={checked} onChange={(e) => {
                            const patch = group.source === 'finish'
                              ? { compatibleMaterialIds: toggleId(value.compatibleMaterialIds, item.id, e.target.checked) }
                              : group.source === 'material'
                                ? { compatibleFinishIds: toggleId(value.compatibleFinishIds, item.id, e.target.checked) }
                                : { compatiblePrinterIds: toggleId(value.compatiblePrinterIds, item.id, e.target.checked) };
                            setGroups(updateGroup(groups, group.id, updateValue(group, value.id, patch)));
                          }} /> {itemLabel(item)}</label>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Dependency rules</p>
                  <p className="mt-2 text-sm text-textMuted">Show, hide or require this option based on another customer choice. Example: only show lamination when a compatible material is selected.</p>
                </div>
                <Button onClick={() => setGroups(updateGroup(groups, group.id, { dependencyRules: [...(group.dependencyRules || []), { id: makeId('rule'), whenGroupKey: groups.find((item) => item.id !== group.id)?.key || '', whenValueId: '', action: 'show', targetGroupKey: group.key }] }))}>Add rule</Button>
              </div>
              {(group.dependencyRules || []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {(group.dependencyRules || []).map((rule) => {
                    const sourceValues = dependencySourceValues(groups, rule.whenGroupKey);
                    return (
                      <div key={rule.id} className="grid gap-2 rounded-lg border border-border p-2 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                        <select value={rule.whenGroupKey} onChange={(e) => setGroups(updateGroup(groups, group.id, updateDependencyRule(group, rule.id, { whenGroupKey: e.target.value, whenValueId: '' })))} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                          <option value="">When group...</option>
                          {groups.filter((item) => item.id !== group.id).map((item) => <option key={item.id} value={item.key}>{item.name || item.key}</option>)}
                        </select>
                        <select value={rule.whenValueId} onChange={(e) => setGroups(updateGroup(groups, group.id, updateDependencyRule(group, rule.id, { whenValueId: e.target.value })))} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                          <option value="">Has value...</option>
                          {sourceValues.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
                        </select>
                        <select value={rule.action} onChange={(e) => setGroups(updateGroup(groups, group.id, updateDependencyRule(group, rule.id, { action: e.target.value as 'show' | 'hide' | 'require' })))} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                          <option value="show">Show</option>
                          <option value="hide">Hide</option>
                          <option value="require">Require</option>
                        </select>
                        <select value={rule.targetGroupKey || group.key} onChange={(e) => setGroups(updateGroup(groups, group.id, updateDependencyRule(group, rule.id, { targetGroupKey: e.target.value })))} className="rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                          {groups.map((item) => <option key={item.id} value={item.key}>{item.name || item.key}</option>)}
                        </select>
                        <Button className="text-red-300" onClick={() => setGroups(updateGroup(groups, group.id, { dependencyRules: (group.dependencyRules || []).filter((item) => item.id !== rule.id) }))}>Remove</Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end"><Button className="text-red-300" onClick={() => setGroups(groups.filter((item) => item.id !== group.id))}>Delete group</Button></div>
          </ProductSectionCard>
        );
      })}
    </div>
  );
}
