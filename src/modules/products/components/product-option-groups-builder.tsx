'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductSectionCard } from './product-section-card';
import type { Product, ProductOptionDisplayType, ProductOptionGroup, ProductOptionSource, ProductOptionValue } from '@/modules/products/types';

type LibraryItem = { id: string; name?: string; title?: string; slug?: string; description?: string; gsm?: string };
type LibraryState = { materials: LibraryItem[]; finishes: LibraryItem[]; optionSets: LibraryItem[] };

const displayTypes: ProductOptionDisplayType[] = ['dropdown', 'radio', 'image-cards', 'checkboxes', 'swatches', 'quantity-grid', 'custom-size'];
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
    return { id: makeId('group'), name: 'Material', key: 'material', source, displayType: 'image-cards', required: true, values: library.materials.slice(0, 6).map(libraryValue) };
  }
  if (source === 'finish') {
    return { id: makeId('group'), name: 'Finish', key: 'finish', source, displayType: 'checkboxes', required: false, allowMultiple: true, values: library.finishes.slice(0, 6).map(libraryValue) };
  }
  if (source === 'size') {
    return {
      id: makeId('group'), name: 'Size', key: 'size', source, displayType: 'image-cards', required: true, allowCustomSize: false, unit: 'mm',
      values: [
        { id: makeId('size'), label: '85 × 55 mm', width: 85, height: 55, unit: 'mm', description: 'UK standard business card' },
        { id: makeId('size'), label: '55 × 55 mm', width: 55, height: 55, unit: 'mm', description: 'Square format' },
      ],
    };
  }
  if (source === 'quantity') {
    return { id: makeId('group'), name: 'Quantity', key: 'quantity', source, displayType: 'quantity-grid', required: true, values: [25, 50, 100, 250, 500, 1000].map((qty) => ({ id: `qty-${qty}`, label: String(qty), quantity: qty })) };
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

export function ProductOptionGroupsBuilder({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  const [library, setLibrary] = useState<LibraryState>({ materials: [], finishes: [], optionSets: [] });
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const groups = product.optionGroups || [];

  useEffect(() => {
    Promise.all([loadLibrary('materials'), loadLibrary('finishes'), loadLibrary('option-sets')])
      .then(([materials, finishes, optionSets]) => setLibrary({ materials, finishes, optionSets }))
      .catch((error) => setLibraryError(error instanceof Error ? error.message : 'Failed to load option libraries'));
  }, []);

  const libraryBySource = useMemo(() => ({ material: library.materials, finish: library.finishes, custom: library.optionSets }), [library]);

  const setGroups = (next: ProductOptionGroup[]) => onUpdate({ optionGroups: next });

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Product Option Groups">
        <p className="text-sm leading-6 text-textMuted">
          Build the choices a customer sees on the storefront. Materials and finishes must come from their libraries so the pricing engine can use the same IDs later.
        </p>
        {libraryError && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{libraryError}</div>}
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
              {group.values.map((value) => (
                <div key={value.id} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input value={value.label} placeholder="Label" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { label: e.target.value })))} />
                  <Input value={value.description || ''} placeholder="Short description" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { description: e.target.value })))} />
                  <Input value={value.imageUrl || ''} placeholder="Image URL / icon URL" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { imageUrl: e.target.value })))} />
                  <Button className="text-red-300" onClick={() => setGroups(updateGroup(groups, group.id, { values: group.values.filter((item) => item.id !== value.id) }))}>Remove</Button>
                  {group.source === 'size' && <><Input type="number" value={String(value.width || '')} placeholder="Width" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { width: Number(e.target.value) || undefined })))} /><Input type="number" value={String(value.height || '')} placeholder="Height" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { height: Number(e.target.value) || undefined })))} /></>}
                  {group.source === 'quantity' && <Input type="number" value={String(value.quantity || '')} placeholder="Quantity" onChange={(e) => setGroups(updateGroup(groups, group.id, updateValue(group, value.id, { quantity: Number(e.target.value) || undefined, label: e.target.value })))} />}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end"><Button className="text-red-300" onClick={() => setGroups(groups.filter((item) => item.id !== group.id))}>Delete group</Button></div>
          </ProductSectionCard>
        );
      })}
    </div>
  );
}
