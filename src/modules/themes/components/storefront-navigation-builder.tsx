'use client';

import { useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Menu, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/forms/input';
import { StorefrontMediaField } from '@/modules/themes/components/storefront-media-library';
import type { ThemeEditorField } from '@/modules/themes/types';

type NavigationItem = {
  id: string;
  slug: string;
  label: string;
  path: string;
  enabled: boolean;
  order: number;
  parentId: string;
  parentSlug: string;
  group: string;
  description: string;
  imageUrl: string;
};

const text = (value: unknown) => String(value ?? '').trim();
const slug = (value: unknown) => text(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const newId = (prefix = 'menu') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function normalise(value: unknown): NavigationItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw: any, index) => {
    const label = text(raw?.label || raw?.name || raw?.title || `Menu ${index + 1}`);
    const id = text(raw?.id || raw?.slug) || newId('menu');
    return {
      id,
      slug: slug(raw?.slug || label) || id,
      label,
      path: text(raw?.path || raw?.href || raw?.url || '/'),
      enabled: raw?.enabled !== false,
      order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : (index + 1) * 10,
      parentId: text(raw?.parentId || raw?.parent || ''),
      parentSlug: slug(raw?.parentSlug || raw?.parentLabel || ''),
      group: text(raw?.group || raw?.column || 'Menu'),
      description: text(raw?.description || raw?.featureBody || ''),
      imageUrl: text(raw?.imageUrl || raw?.image || ''),
    };
  }).sort((a, b) => a.order - b.order);
}

function resequence(items: NavigationItem[]) {
  const top = items.filter((item) => !item.parentId && !item.parentSlug);
  const output: NavigationItem[] = [];
  top.forEach((parent, parentIndex) => {
    const nextParent = { ...parent, order: (parentIndex + 1) * 100 };
    output.push(nextParent);
    items
      .filter((item) => item.parentId === parent.id || item.parentSlug === parent.slug)
      .sort((a, b) => a.order - b.order)
      .forEach((child, childIndex) => output.push({ ...child, parentId: parent.id, parentSlug: parent.slug, order: (childIndex + 1) * 10 }));
  });
  return output;
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-textMuted transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35">{children}</button>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[11px] font-medium text-textMuted">{children}</label>;
}

export function StorefrontNavigationBuilder({ field, value, onChange }: { field: ThemeEditorField; value: unknown; onChange: (value: unknown) => void }) {
  const items = useMemo(() => normalise(value), [value]);
  const topItems = items.filter((item) => !item.parentId && !item.parentSlug);
  const maxItems = field.maxItems || 60;

  const commit = (next: NavigationItem[]) => onChange(resequence(next));
  const update = (id: string, patch: Partial<NavigationItem>) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    let next = items.map((item) => item.id === id ? { ...item, ...patch } : item);
    if (!current.parentId && !current.parentSlug && patch.label !== undefined) {
      const nextSlug = slug(patch.label) || current.slug;
      next = next.map((item) => item.id === id ? { ...item, slug: nextSlug } : item.parentId === id || item.parentSlug === current.slug ? { ...item, parentId: id, parentSlug: nextSlug } : item);
    }
    commit(next);
  };
  const addTop = () => {
    if (items.length >= maxItems || topItems.length >= 10) return;
    const id = newId('menu');
    commit([...items, { id, slug: id, label: 'New menu item', path: '/', enabled: true, order: (topItems.length + 1) * 100, parentId: '', parentSlug: '', group: 'Main menu', description: '', imageUrl: '' }]);
  };
  const addChild = (parent: NavigationItem) => {
    if (items.length >= maxItems) return;
    const children = items.filter((item) => item.parentId === parent.id || item.parentSlug === parent.slug);
    if (children.length >= 12) return;
    const id = newId('link');
    commit([...items, { id, slug: id, label: 'New dropdown link', path: '/', enabled: true, order: (children.length + 1) * 10, parentId: parent.id, parentSlug: parent.slug, group: 'Menu', description: '', imageUrl: '' }]);
  };
  const remove = (item: NavigationItem) => {
    const next = item.parentId || item.parentSlug
      ? items.filter((row) => row.id !== item.id)
      : items.filter((row) => row.id !== item.id && row.parentId !== item.id && row.parentSlug !== item.slug);
    commit(next);
  };
  const duplicateTop = (item: NavigationItem) => {
    if (items.length >= maxItems || topItems.length >= 10) return;
    const id = newId('menu');
    const nextLabel = `${item.label} copy`;
    const copy = { ...item, id, slug: slug(nextLabel) || id, label: nextLabel, order: item.order + 1 };
    const children = items.filter((row) => row.parentId === item.id || row.parentSlug === item.slug).map((row, index) => ({ ...row, id: newId('link'), slug: newId('link'), parentId: id, parentSlug: copy.slug, order: (index + 1) * 10 }));
    commit([...items, copy, ...children]);
  };
  const moveTop = (item: NavigationItem, direction: -1 | 1) => {
    const ordered = [...topItems].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((row) => row.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const children = items.filter((row) => row.parentId || row.parentSlug);
    commit([...ordered, ...children]);
  };
  const moveChild = (item: NavigationItem, parent: NavigationItem, direction: -1 | 1) => {
    const siblings = items.filter((row) => row.parentId === parent.id || row.parentSlug === parent.slug).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((row) => row.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    commit(items.filter((row) => !(row.parentId === parent.id || row.parentSlug === parent.slug)).concat(siblings));
  };

  return <div id="storefront-navigation" className="space-y-4 rounded-2xl border border-white/8 bg-panelMuted/40 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Menu className="h-4 w-4 text-accent" />Header and footer navigation</div>
        <p className="mt-1 text-[11px] leading-5 text-textMuted">Top-level items appear in the desktop and mobile header. Dropdown links are grouped beneath them and also feed the footer columns.</p>
      </div>
      <button type="button" onClick={addTop} disabled={items.length >= maxItems || topItems.length >= 10} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[12px] font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add menu item</button>
    </div>

    {!topItems.length ? <div className="rounded-xl border border-dashed border-white/12 bg-black/10 p-6 text-center text-[12px] leading-6 text-textMuted">No theme-managed navigation yet. Add an item, or save the inherited legacy menu shown here when it is available.</div> : null}

    <div className="space-y-4">
      {topItems.sort((a, b) => a.order - b.order).map((item, topIndex) => {
        const children = items.filter((row) => row.parentId === item.id || row.parentSlug === item.slug).sort((a, b) => a.order - b.order);
        return <section key={item.id} className={`rounded-xl border p-4 ${item.enabled ? 'border-white/10 bg-panel' : 'border-amber-500/25 bg-amber-500/[0.05]'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-[12px] font-semibold text-white">{item.label || 'Untitled menu item'}</div><div className="mt-1 text-[10px] text-textMuted">Top-level · {children.length} dropdown link{children.length === 1 ? '' : 's'}</div></div>
            <div className="flex flex-wrap gap-1.5">
              <IconButton label={item.enabled ? 'Hide menu item' : 'Show menu item'} onClick={() => update(item.id, { enabled: !item.enabled })}>{item.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</IconButton>
              <IconButton label="Move up" disabled={topIndex === 0} onClick={() => moveTop(item, -1)}><ChevronUp className="h-4 w-4" /></IconButton>
              <IconButton label="Move down" disabled={topIndex === topItems.length - 1} onClick={() => moveTop(item, 1)}><ChevronDown className="h-4 w-4" /></IconButton>
              <IconButton label="Duplicate item" onClick={() => duplicateTop(item)}><Copy className="h-4 w-4" /></IconButton>
              <IconButton label="Delete item and dropdown links" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div><FieldLabel>Menu label</FieldLabel><Input value={item.label} onChange={(event) => update(item.id, { label: event.target.value })} /></div>
            <div><FieldLabel>Internal path</FieldLabel><Input value={item.path} placeholder="/about" onChange={(event) => update(item.id, { path: event.target.value })} /></div>
            <div className="lg:col-span-2"><FieldLabel>Mega-menu description</FieldLabel><Input value={item.description} placeholder="Brief description shown in the feature area" onChange={(event) => update(item.id, { description: event.target.value })} /></div>
            <div className="lg:col-span-2"><FieldLabel>Feature image</FieldLabel><StorefrontMediaField value={item.imageUrl} onChange={(imageUrl) => update(item.id, { imageUrl })} /></div>
          </div>

          <div className="mt-4 border-t border-white/8 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Dropdown links</div><button type="button" onClick={() => addChild(item)} disabled={items.length >= maxItems || children.length >= 12} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-text hover:text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add link</button></div>
            <div className="space-y-2">
              {children.map((child, childIndex) => <div key={child.id} className={`rounded-lg border p-3 ${child.enabled ? 'border-white/8 bg-black/10' : 'border-amber-500/20 bg-amber-500/[0.04]'}`}>
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-end">
                  <div><FieldLabel>Label</FieldLabel><Input value={child.label} onChange={(event) => update(child.id, { label: event.target.value, slug: slug(event.target.value) || child.slug })} /></div>
                  <div><FieldLabel>Path</FieldLabel><Input value={child.path} placeholder="/products" onChange={(event) => update(child.id, { path: event.target.value })} /></div>
                  <div><FieldLabel>Column title</FieldLabel><Input value={child.group} placeholder="Products" onChange={(event) => update(child.id, { group: event.target.value })} /></div>
                  <div className="flex gap-1.5">
                    <IconButton label={child.enabled ? 'Hide link' : 'Show link'} onClick={() => update(child.id, { enabled: !child.enabled })}>{child.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</IconButton>
                    <IconButton label="Move up" disabled={childIndex === 0} onClick={() => moveChild(child, item, -1)}><ChevronUp className="h-4 w-4" /></IconButton>
                    <IconButton label="Move down" disabled={childIndex === children.length - 1} onClick={() => moveChild(child, item, 1)}><ChevronDown className="h-4 w-4" /></IconButton>
                    <IconButton label="Delete link" onClick={() => remove(child)}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </div>
              </div>)}
              {!children.length ? <div className="rounded-lg border border-dashed border-white/10 px-4 py-3 text-[11px] text-textMuted">No dropdown links. The top-level item will link directly to its path.</div> : null}
            </div>
          </div>
        </section>;
      })}
    </div>
    <div className="text-[10px] leading-5 text-textMuted">Maximum 10 top-level items, 12 dropdown links per item and {maxItems} total records. Links are restricted to internal storefront paths.</div>
  </div>;
}
