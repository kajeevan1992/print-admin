'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type StockStatus = 'Healthy' | 'Low' | 'Critical' | 'Inbound';
type LocationType = 'Warehouse' | 'Plant' | 'Materials';

type InventoryItem = {
  id: string;
  sku: string;
  title: string;
  location: string;
  locationType: LocationType;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  incoming: number;
  leadDays: number;
  status: StockStatus;
  notes: string;
};

const storageKey = 'inventory-control-v54';

const seedInventory: InventoryItem[] = [
  {
    id: 'inv-001',
    sku: 'CARD-SILK-350',
    title: 'Silk 350gsm Cards',
    location: 'Nevada DC',
    locationType: 'Warehouse',
    onHand: 1240,
    reserved: 320,
    reorderPoint: 500,
    incoming: 0,
    leadDays: 2,
    status: 'Healthy',
    notes: 'Primary stock for trade card orders.'
  },
  {
    id: 'inv-002',
    sku: 'BROCH-GLOSS-A4',
    title: 'Gloss Brochure Sheets A4',
    location: 'New Jersey Hub',
    locationType: 'Plant',
    onHand: 180,
    reserved: 140,
    reorderPoint: 250,
    incoming: 400,
    leadDays: 4,
    status: 'Low',
    notes: 'Shared stock for brochure and flyer jobs.'
  },
  {
    id: 'inv-003',
    sku: 'BOARD-KRAFT-2MM',
    title: 'Kraft Packaging Board 2mm',
    location: 'Texas Plant',
    locationType: 'Materials',
    onHand: 52,
    reserved: 28,
    reorderPoint: 90,
    incoming: 180,
    leadDays: 7,
    status: 'Critical',
    notes: 'Packaging line waiting on vendor confirmation.'
  },
  {
    id: 'inv-004',
    sku: 'ENV-C5-PREM',
    title: 'Premium C5 Envelopes',
    location: 'Nevada DC',
    locationType: 'Warehouse',
    onHand: 420,
    reserved: 90,
    reorderPoint: 200,
    incoming: 250,
    leadDays: 3,
    status: 'Inbound',
    notes: 'Inbound pallet due tomorrow morning.'
  }
];

const emptyDraft: Omit<InventoryItem, 'id' | 'status'> = {
  sku: '',
  title: '',
  location: '',
  locationType: 'Warehouse',
  onHand: 0,
  reserved: 0,
  reorderPoint: 0,
  incoming: 0,
  leadDays: 3,
  notes: ''
};

function computeStatus(item: Pick<InventoryItem, 'onHand' | 'reserved' | 'reorderPoint' | 'incoming'>): StockStatus {
  const available = Math.max(item.onHand - item.reserved, 0);
  if (available <= Math.max(1, Math.round(item.reorderPoint * 0.4))) return 'Critical';
  if (available <= item.reorderPoint) return 'Low';
  if (item.incoming > 0) return 'Inbound';
  return 'Healthy';
}

function badgeClass(status: StockStatus) {
  if (status === 'Critical') return 'border-rose-500/20 bg-rose-500/10 text-rose-200';
  if (status === 'Low') return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  if (status === 'Inbound') return 'border-sky-500/20 bg-sky-500/10 text-sky-200';
  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function Page() {
  const [items, setItems] = useState<InventoryItem[]>(seedInventory);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | StockStatus>('All');
  const [locationFilter, setLocationFilter] = useState<'All' | LocationType>('All');
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as InventoryItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed);
        setActiveId(parsed[0].id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesText = !text || [item.sku, item.title, item.location, item.notes].join(' ').toLowerCase().includes(text);
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesLocation = locationFilter === 'All' || item.locationType === locationFilter;
      return matchesText && matchesStatus && matchesLocation;
    });
  }, [items, query, statusFilter, locationFilter]);

  const activeItem = filtered.find((item) => item.id === activeId) ?? filtered[0] ?? items[0] ?? null;

  useEffect(() => {
    if (activeItem && activeItem.id !== activeId) setActiveId(activeItem.id);
  }, [activeItem, activeId]);

  const stats = useMemo(() => {
    const critical = items.filter((item) => item.status === 'Critical').length;
    const low = items.filter((item) => item.status === 'Low').length;
    const inbound = items.reduce((sum, item) => sum + item.incoming, 0);
    const available = items.reduce((sum, item) => sum + Math.max(item.onHand - item.reserved, 0), 0);
    return [
      { label: 'Available units', value: available, note: 'Net of reserved allocations' },
      { label: 'Low / critical SKUs', value: low + critical, note: `${critical} critical right now` },
      { label: 'Inbound supply', value: inbound, note: 'Due into stock pool' }
    ];
  }, [items]);

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function saveItem() {
    if (!draft.sku.trim() || !draft.title.trim() || !draft.location.trim()) return;
    const nextBase = {
      ...draft,
      sku: draft.sku.trim().toUpperCase(),
      title: draft.title.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim()
    };
    const status = computeStatus(nextBase);
    if (editingId) {
      setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...nextBase, status } : item));
      setActiveId(editingId);
    } else {
      const created: InventoryItem = {
        id: `inv-${Math.floor(Math.random() * 9000) + 1000}`,
        ...nextBase,
        status
      };
      setItems((current) => [created, ...current]);
      setActiveId(created.id);
    }
    resetDraft();
  }

  function loadIntoForm(item: InventoryItem) {
    setEditingId(item.id);
    setDraft({
      sku: item.sku,
      title: item.title,
      location: item.location,
      locationType: item.locationType,
      onHand: item.onHand,
      reserved: item.reserved,
      reorderPoint: item.reorderPoint,
      incoming: item.incoming,
      leadDays: item.leadDays,
      notes: item.notes
    });
  }

  function patchItem(id: string, patch: Partial<InventoryItem>) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      return { ...merged, status: computeStatus(merged) };
    }));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    if (activeId === id) setActiveId('');
    if (editingId === id) resetDraft();
  }

  function duplicateItem(item: InventoryItem) {
    const copy: InventoryItem = {
      ...item,
      id: `inv-${Math.floor(Math.random() * 9000) + 1000}`,
      title: `${item.title} Copy`
    };
    setItems((current) => [copy, ...current]);
    setActiveId(copy.id);
  }

  function resetSeed() {
    setItems(seedInventory);
    setQuery('');
    setStatusFilter('All');
    setLocationFilter('All');
    setActiveId(seedInventory[0]?.id ?? '');
    resetDraft();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-control.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory Control"
        subtitle="Manage stock pools, replenishment risk, and warehouse readiness before wiring live purchasing and ERP feeds."
        actions={
          <>
            <Button onClick={resetSeed}>Reset seed</Button>
            <Button onClick={exportJson}>Export JSON</Button>
            <PrimaryButton onClick={saveItem}>{editingId ? 'Save inventory item' : 'Add inventory item'}</PrimaryButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{stat.label}</p>
            <p className="text-3xl font-semibold text-text">{stat.value}</p>
            <p className="text-sm text-textMuted">{stat.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_0.95fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search SKU, title, location" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | StockStatus)}>
              <option>All</option>
              <option>Healthy</option>
              <option>Low</option>
              <option>Critical</option>
              <option>Inbound</option>
            </select>
            <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as 'All' | LocationType)}>
              <option>All</option>
              <option>Warehouse</option>
              <option>Plant</option>
              <option>Materials</option>
            </select>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-textMuted">{filtered.length} visible items</div>
          </div>

          <div className="space-y-3">
            {filtered.map((item) => {
              const available = Math.max(item.onHand - item.reserved, 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${activeItem?.id === item.id ? 'border-accent/40 bg-accent/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{item.sku} · {item.title}</p>
                      <p className="mt-1 text-sm text-textMuted">{item.location} · {item.locationType}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-textMuted sm:grid-cols-4">
                    <span>On hand: <span className="text-text">{item.onHand}</span></span>
                    <span>Reserved: <span className="text-text">{item.reserved}</span></span>
                    <span>Available: <span className="text-text">{available}</span></span>
                    <span>Inbound: <span className="text-text">{item.incoming}</span></span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Item editor</p>
            <Input placeholder="SKU" value={draft.sku} onChange={(e) => setDraft((current) => ({ ...current, sku: e.target.value }))} />
            <Input placeholder="Item title" value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} />
            <Input placeholder="Location" value={draft.location} onChange={(e) => setDraft((current) => ({ ...current, location: e.target.value }))} />
            <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={draft.locationType} onChange={(e) => setDraft((current) => ({ ...current, locationType: e.target.value as LocationType }))}>
              <option>Warehouse</option>
              <option>Plant</option>
              <option>Materials</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="On hand" value={String(draft.onHand)} onChange={(e) => setDraft((current) => ({ ...current, onHand: toNumber(e.target.value) }))} />
              <Input type="number" placeholder="Reserved" value={String(draft.reserved)} onChange={(e) => setDraft((current) => ({ ...current, reserved: toNumber(e.target.value) }))} />
              <Input type="number" placeholder="Reorder point" value={String(draft.reorderPoint)} onChange={(e) => setDraft((current) => ({ ...current, reorderPoint: toNumber(e.target.value) }))} />
              <Input type="number" placeholder="Inbound" value={String(draft.incoming)} onChange={(e) => setDraft((current) => ({ ...current, incoming: toNumber(e.target.value) }))} />
            </div>
            <Input type="number" placeholder="Lead days" value={String(draft.leadDays)} onChange={(e) => setDraft((current) => ({ ...current, leadDays: toNumber(e.target.value, 3) }))} />
            <textarea className="min-h-[96px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none placeholder:text-textMuted" placeholder="Operational notes, vendor context, substitution guidance..." value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} />
            <div className="flex gap-2">
              <PrimaryButton onClick={saveItem}>{editingId ? 'Save changes' : 'Add item'}</PrimaryButton>
              <Button onClick={resetDraft}>Clear</Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Inventory spotlight</p>
                <p className="mt-1 text-lg font-semibold text-text">{activeItem ? activeItem.title : 'No item selected'}</p>
              </div>
              {activeItem ? <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(activeItem.status)}`}>{activeItem.status}</span> : null}
            </div>

            {activeItem ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-textMuted">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Supply posture</p>
                    <p className="mt-2 text-text">Available {Math.max(activeItem.onHand - activeItem.reserved, 0)} / Reorder at {activeItem.reorderPoint}</p>
                    <p className="mt-1">Incoming {activeItem.incoming} · Lead time {activeItem.leadDays} days</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-textMuted">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Ops guidance</p>
                    <p className="mt-2 text-text">{activeItem.status === 'Critical' ? 'Raise PO and protect allocation immediately.' : activeItem.status === 'Low' ? 'Review open jobs and trigger replenishment today.' : activeItem.status === 'Inbound' ? 'Inbound stock is on the way — monitor receiving window.' : 'Stock pool is healthy and ready for routing.'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-textMuted">
                  <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Notes</p>
                  <p className="mt-2 leading-6 text-textMuted">{activeItem.notes || 'No operational notes recorded.'}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => patchItem(activeItem.id, { incoming: activeItem.incoming + Math.max(activeItem.reorderPoint, 50) })}>Raise replenishment</Button>
                  <Button onClick={() => patchItem(activeItem.id, { onHand: activeItem.onHand + activeItem.incoming, incoming: 0 })}>Receive inbound</Button>
                  <Button onClick={() => patchItem(activeItem.id, { reserved: Math.max(activeItem.reserved - 25, 0) })}>Release allocation</Button>
                  <Button onClick={() => patchItem(activeItem.id, { reserved: activeItem.reserved + 25 })}>Reserve stock</Button>
                  <Button onClick={() => loadIntoForm(activeItem)}>Edit item</Button>
                  <Button onClick={() => duplicateItem(activeItem)}>Duplicate item</Button>
                  <Button className="sm:col-span-2" onClick={() => removeItem(activeItem.id)}>Delete item</Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-textMuted">Select an inventory item to view replenishment actions and stock guidance.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
