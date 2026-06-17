'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { storefrontMenuService, type StorefrontMenuItem } from '@/services/storefront-menu.service';

export function StorefrontMenuBuilderPage() {
  const [items, setItems] = useState<StorefrontMenuItem[]>([]);
  const [message, setMessage] = useState('Loading menu items...');
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');

  async function load() {
    const result = await storefrontMenuService.list();
    setItems(result.items);
    setMessage(result.message);
  }

  useEffect(() => { void load(); }, []);

  async function addItem() {
    if (!label.trim() || !path.trim()) return;
    await storefrontMenuService.save({ label, path, type: 'custom', enabled: true, order: items.length * 10 + 10, column: 'Main menu' });
    setLabel('');
    setPath('');
    await load();
  }

  return (
    <div>
      <PageHeader title="Admin Menu Builder" subtitle="Build storefront menus using the existing admin-config storage and existing category/product URL rules." actions={<PrimaryButton onClick={() => void addItem()}>Add Item</PrimaryButton>} />
      <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">{message}</div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Menu label" value={label} onChange={(event) => setLabel(event.target.value)} />
        <Input placeholder="Path, e.g. /business-cards" value={path} onChange={(event) => setPath(event.target.value)} />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-panel p-3 text-sm">
            <div><div className="font-medium">{item.label}</div><div className="text-textMuted">{item.path}</div></div>
            <Button onClick={async () => { await storefrontMenuService.remove(item.id); await load(); }}>Remove</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
