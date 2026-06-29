'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { storefrontMenuService, type StorefrontMenuItem } from '@/services/storefront-menu.service';

export function StorefrontMenuBuilderPage() {
  const [items, setItems] = useState<StorefrontMenuItem[]>([]);
  const [message, setMessage] = useState('Loading menu items...');
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [parentId, setParentId] = useState('');
  const [group, setGroup] = useState('Products');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const topItems = useMemo(() => items.filter((item) => !item.parentId && !item.parentSlug), [items]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, StorefrontMenuItem[]>();
    items.forEach((item) => {
      if (!item.parentId) return;
      map.set(item.parentId, [...(map.get(item.parentId) || []), item]);
    });
    return map;
  }, [items]);

  async function load() {
    const result = await storefrontMenuService.list();
    setItems(result.items);
    setMessage(result.message);
  }

  useEffect(() => { void load(); }, []);

  async function addItem() {
    if (!label.trim() || !path.trim()) return;
    const parent = items.find((item) => item.id === parentId);
    await storefrontMenuService.save({
      label,
      path,
      type: 'custom',
      enabled: true,
      order: items.length * 10 + 10,
      column: parentId ? 'Dropdown' : 'Main menu',
      group: parentId ? group || 'Products' : 'Main menu',
      parentId,
      parentSlug: parent?.slug || '',
      description,
      imageUrl,
    });
    setLabel('');
    setPath('');
    setParentId('');
    setGroup('Products');
    setDescription('');
    setImageUrl('');
    await load();
  }

  return (
    <div>
      <PageHeader title="Admin Menu Builder" subtitle="Build storefront top navigation and dropdown links. Top-level items appear in the navbar; child items appear inside that item's dropdown." actions={<PrimaryButton onClick={() => void addItem()}>Add Item</PrimaryButton>} />
      <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">{message}</div>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Input placeholder="Menu label" value={label} onChange={(event) => setLabel(event.target.value)} />
        <Input placeholder="Path, e.g. /business-cards" value={path} onChange={(event) => setPath(event.target.value)} />
        <select className="h-10 rounded-xl border border-border bg-panel px-3 text-sm text-white outline-none" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">Top-level navbar item</option>
          {topItems.map((item) => <option key={item.id} value={item.id}>Dropdown child under: {item.label}</option>)}
        </select>
        <Input placeholder="Dropdown group title, e.g. Products" value={group} onChange={(event) => setGroup(event.target.value)} />
        <Input placeholder="Description / mega menu intro" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Input placeholder="Image URL for top item feature card" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
      </div>
      <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-textMuted">
        To create dropdown links: first add a top-level item, then choose it from “Dropdown child under” and add the child link. Child links appear inside the mega-menu dropdown.
      </div>
      <div className="space-y-2">
        {topItems.map((item) => {
          const children = childrenByParent.get(item.id) || [];
          return (
            <div key={item.id} className="rounded-xl border border-border bg-panel p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div><div className="font-medium text-white">{item.label}</div><div className="text-textMuted">{item.path}</div><div className="mt-1 text-xs text-cyan-200">Top-level navbar item · {children.length} dropdown item(s)</div></div>
                <Button onClick={async () => { await storefrontMenuService.remove(item.id); await load(); }}>Remove</Button>
              </div>
              {children.length ? <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {children.map((child) => <div key={child.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2"><div><div className="font-medium text-white">↳ {child.label}</div><div className="text-xs text-textMuted">{child.group || 'Menu'} · {child.path}</div></div><Button onClick={async () => { await storefrontMenuService.remove(child.id); await load(); }}>Remove</Button></div>)}
              </div> : null}
            </div>
          );
        })}
        {items.filter((item) => item.parentId && !topItems.some((top) => top.id === item.parentId)).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div><div className="font-medium text-white">{item.label}</div><div className="text-textMuted">Missing parent · {item.path}</div></div>
            <Button onClick={async () => { await storefrontMenuService.remove(item.id); await load(); }}>Remove</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
