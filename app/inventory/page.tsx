'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type StockStatus = 'Healthy' | 'Low' | 'Critical' | 'Inbound';
type LocationType = 'Warehouse' | 'Plant' | 'Materials';
type DbStatus = 'loading' | 'connected' | 'saving' | 'local' | 'error';
type JobTicket = { id: string; orderNumber: string; productName: string; quantity: number; status: string; machine?: string; material?: string; dueDate?: string; finishing?: string[]; warnings?: string[] };
type ConsumptionPlan = { ticketId: string; orderNumber: string; productName: string; materialSku: string; quantity: number; consumeUnits: number; wasteUnits: number; totalUnits: number; status: string; dueDate?: string };

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
  materialType?: 'sheet' | 'roll' | 'board' | 'consumable';
  unit?: 'sheets' | 'meters' | 'boards' | 'units';
  linkedMaterialIds?: string[];
  wastePercent?: number;
};

const storageKey = 'inventory-control-v54';
const inventoryEndpoint = `/api/internal/config/${encodeURIComponent(storageKey)}`;
const inventoryItemsEndpoint = `${inventoryEndpoint}/items`;
const jobTicketsEndpoint = '/api/internal/config/production-job-tickets/items';

const seedInventory: InventoryItem[] = [
  { id: 'inv-001', sku: '350-SILK', title: '350gsm Silk SRA3 Sheets', location: 'Main Store', locationType: 'Materials', onHand: 1240, reserved: 320, reorderPoint: 500, incoming: 0, leadDays: 2, status: 'Healthy', notes: 'Primary stock for cards and flyers.', materialType: 'sheet', unit: 'sheets', linkedMaterialIds: ['350-silk', '350gsm-silk', 'card-silk-350'], wastePercent: 5 },
  { id: 'inv-002', sku: '170-SILK', title: '170gsm Silk SRA3 Sheets', location: 'Main Store', locationType: 'Materials', onHand: 180, reserved: 140, reorderPoint: 250, incoming: 400, leadDays: 4, status: 'Low', notes: 'Shared stock for brochure and flyer jobs.', materialType: 'sheet', unit: 'sheets', linkedMaterialIds: ['170-silk', '170gsm-silk'], wastePercent: 5 },
  { id: 'inv-003', sku: 'PVC-BANNER-1200', title: 'PVC Banner Roll 1200mm', location: 'Large Format Area', locationType: 'Materials', onHand: 52, reserved: 28, reorderPoint: 90, incoming: 180, leadDays: 7, status: 'Critical', notes: 'Roll stock for banners and signage.', materialType: 'roll', unit: 'meters', linkedMaterialIds: ['pvc-banner', 'banner', 'vinyl'], wastePercent: 8 },
  { id: 'inv-004', sku: 'LAM-MATT', title: 'Matt Lamination Film', location: 'Finishing Bench', locationType: 'Plant', onHand: 420, reserved: 90, reorderPoint: 200, incoming: 250, leadDays: 3, status: 'Inbound', notes: 'Finishing consumable for laminated jobs.', materialType: 'consumable', unit: 'meters', linkedMaterialIds: ['matt', 'lamination', 'matt-lamination'], wastePercent: 3 }
];

const emptyDraft: Omit<InventoryItem, 'id' | 'status'> = { sku: '', title: '', location: '', locationType: 'Warehouse', onHand: 0, reserved: 0, reorderPoint: 0, incoming: 0, leadDays: 3, notes: '', materialType: 'sheet', unit: 'sheets', linkedMaterialIds: [], wastePercent: 5 };

function computeStatus(item: Pick<InventoryItem, 'onHand' | 'reserved' | 'reorderPoint' | 'incoming'>): StockStatus {
  const available = Math.max(item.onHand - item.reserved, 0);
  if (available <= Math.max(1, Math.round(item.reorderPoint * 0.4))) return 'Critical';
  if (available <= item.reorderPoint) return 'Low';
  if (item.incoming > 0) return 'Inbound';
  return 'Healthy';
}
function badgeClass(status: StockStatus) { if (status === 'Critical') return 'border-rose-500/20 bg-rose-500/10 text-rose-200'; if (status === 'Low') return 'border-amber-500/20 bg-amber-500/10 text-amber-200'; if (status === 'Inbound') return 'border-sky-500/20 bg-sky-500/10 text-sky-200'; return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'; }
function toNumber(value: string, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function csv(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function csvJoin(value?: string[]) { return Array.isArray(value) ? value.join(', ') : ''; }
function materialMatches(item: InventoryItem, material?: string) { const haystack = [item.sku, item.title, ...(item.linkedMaterialIds || [])].join(' ').toLowerCase(); return Boolean(material && haystack.includes(material.toLowerCase())); }
function estimateConsumption(item: InventoryItem, ticket: JobTicket) {
  const qty = Math.max(1, Number(ticket.quantity || 1));
  if (item.materialType === 'roll') return Math.max(1, Math.ceil(qty / 10));
  if (item.materialType === 'board') return Math.max(1, Math.ceil(qty / 2));
  if (item.materialType === 'consumable') return Math.max(1, Math.ceil(qty / 15));
  return Math.max(1, Math.ceil(qty / 20));
}
async function readTickets(): Promise<JobTicket[]> { try { const response = await fetch(jobTicketsEndpoint, { cache: 'no-store' }); const payload = await response.json().catch(() => ({})); return Array.isArray(payload.data?.items) ? payload.data.items : []; } catch { return []; } }
function buildConsumption(items: InventoryItem[], tickets: JobTicket[]): ConsumptionPlan[] {
  return tickets.filter((ticket) => !['dispatched', 'blocked'].includes(ticket.status)).flatMap((ticket) => {
    const matched = items.filter((item) => materialMatches(item, ticket.material));
    return matched.map((item) => { const consumeUnits = estimateConsumption(item, ticket); const wasteUnits = Math.ceil(consumeUnits * Number(item.wastePercent || 0) / 100); return { ticketId: ticket.id, orderNumber: ticket.orderNumber, productName: ticket.productName, materialSku: item.sku, quantity: Number(ticket.quantity || 1), consumeUnits, wasteUnits, totalUnits: consumeUnits + wasteUnits, status: ticket.status, dueDate: ticket.dueDate }; });
  });
}

export default function Page() {
  const [items, setItems] = useState<InventoryItem[]>(seedInventory);
  const [tickets, setTickets] = useState<JobTicket[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | StockStatus>('All');
  const [locationFilter, setLocationFilter] = useState<'All' | LocationType>('All');
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus>('loading');
  const [dbMessage, setDbMessage] = useState('Loading inventory from internal API...');

  useEffect(() => { void loadInventory(); }, []);
  async function loadInventory() {
    setDbStatus('loading'); setDbMessage('Loading inventory and production demand...');
    try {
      const [response, ticketRows] = await Promise.all([fetch(inventoryItemsEndpoint, { cache: 'no-store' }), readTickets()]);
      const payload = await response.json().catch(() => ({}));
      const saved = payload?.data?.items;
      const next = Array.isArray(saved) && saved.length > 0 ? saved.map((item) => ({ ...item, status: computeStatus(item) })) as InventoryItem[] : seedInventory;
      setItems(next); setTickets(ticketRows); setActiveId(next[0]?.id ?? ''); setDbStatus('connected'); setDbMessage(Array.isArray(saved) && saved.length > 0 ? 'Connected. Inventory and production demand loaded.' : 'Connected. Showing starter inventory until you save changes.');
    } catch (error) {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) { try { const parsed = JSON.parse(raw) as InventoryItem[]; if (Array.isArray(parsed) && parsed.length > 0) { setItems(parsed); setTickets(await readTickets()); setActiveId(parsed[0]?.id ?? ''); setDbStatus('local'); setDbMessage(`Inventory API unavailable, showing browser fallback: ${error instanceof Error ? error.message : 'unknown error'}`); return; } } catch {} }
      setItems(seedInventory); setTickets(await readTickets()); setActiveId(seedInventory[0]?.id ?? ''); setDbStatus('error'); setDbMessage(error instanceof Error ? error.message : 'Inventory could not be loaded.');
    }
  }
  async function persistInventory(next: InventoryItem[], message = 'Saving inventory through internal API...') {
    setDbStatus('saving'); setDbMessage(message);
    try { const response = await fetch(inventoryEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Inventory Control', description: 'Inventory stock pool records with v372 material consumption planning', items: next, values: { count: String(next.length), version: 'v372' } }) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Inventory save failed.'); window.localStorage.setItem(storageKey, JSON.stringify(next)); setDbStatus('connected'); setDbMessage('Saved to database through internal API.'); } catch (error) { window.localStorage.setItem(storageKey, JSON.stringify(next)); setDbStatus('local'); setDbMessage(`Database save failed, kept browser fallback copy: ${error instanceof Error ? error.message : 'unknown error'}`); }
  }
  function setItemsAndPersist(next: InventoryItem[], message?: string) { setItems(next); void persistInventory(next, message); }

  const consumption = useMemo(() => buildConsumption(items, tickets), [items, tickets]);
  const consumptionBySku = useMemo(() => consumption.reduce((acc, row) => ({ ...acc, [row.materialSku]: (acc[row.materialSku] || 0) + row.totalUnits }), {} as Record<string, number>), [consumption]);
  const enhancedItems = useMemo(() => items.map((item) => ({ ...item, reserved: Math.max(item.reserved, consumptionBySku[item.sku] || 0), status: computeStatus({ ...item, reserved: Math.max(item.reserved, consumptionBySku[item.sku] || 0) }) })), [items, consumptionBySku]);
  const filtered = useMemo(() => { const text = query.trim().toLowerCase(); return enhancedItems.filter((item) => { const matchesText = !text || [item.sku, item.title, item.location, item.notes, csvJoin(item.linkedMaterialIds)].join(' ').toLowerCase().includes(text); return matchesText && (statusFilter === 'All' || item.status === statusFilter) && (locationFilter === 'All' || item.locationType === locationFilter); }); }, [enhancedItems, query, statusFilter, locationFilter]);
  const activeItem = filtered.find((item) => item.id === activeId) ?? filtered[0] ?? enhancedItems[0] ?? null;
  useEffect(() => { if (activeItem && activeItem.id !== activeId) setActiveId(activeItem.id); }, [activeItem, activeId]);
  const stats = useMemo(() => { const critical = enhancedItems.filter((item) => item.status === 'Critical').length; const low = enhancedItems.filter((item) => item.status === 'Low').length; const inbound = enhancedItems.reduce((sum, item) => sum + item.incoming, 0); const available = enhancedItems.reduce((sum, item) => sum + Math.max(item.onHand - item.reserved, 0), 0); const reservedByJobs = consumption.reduce((sum, row) => sum + row.totalUnits, 0); return [{ label: 'Available units', value: available, note: 'Net of job reservations' }, { label: 'Low / critical SKUs', value: low + critical, note: `${critical} critical right now` }, { label: 'Reserved by jobs', value: reservedByJobs, note: `${consumption.length} material allocations` }, { label: 'Inbound supply', value: inbound, note: 'Due into stock pool' }]; }, [enhancedItems, consumption]);

  function resetDraft() { setDraft(emptyDraft); setEditingId(null); }
  function saveItem() { if (!draft.sku.trim() || !draft.title.trim() || !draft.location.trim()) return; const nextBase = { ...draft, sku: draft.sku.trim().toUpperCase(), title: draft.title.trim(), location: draft.location.trim(), notes: draft.notes.trim(), linkedMaterialIds: draft.linkedMaterialIds || [], wastePercent: Number(draft.wastePercent || 0) }; const status = computeStatus(nextBase); if (editingId) { const next = items.map((item) => item.id === editingId ? { ...item, ...nextBase, status } : item); setItemsAndPersist(next, 'Saving inventory item through internal API...'); setActiveId(editingId); } else { const created: InventoryItem = { id: `inv-${Date.now()}`, ...nextBase, status }; const next = [created, ...items]; setItemsAndPersist(next, 'Creating inventory item through internal API...'); setActiveId(created.id); } resetDraft(); }
  function loadIntoForm(item: InventoryItem) { setEditingId(item.id); setDraft({ sku: item.sku, title: item.title, location: item.location, locationType: item.locationType, onHand: item.onHand, reserved: item.reserved, reorderPoint: item.reorderPoint, incoming: item.incoming, leadDays: item.leadDays, notes: item.notes, materialType: item.materialType || 'sheet', unit: item.unit || 'sheets', linkedMaterialIds: item.linkedMaterialIds || [], wastePercent: item.wastePercent || 0 }); }
  function patchItem(id: string, patch: Partial<InventoryItem>) { const next = items.map((item) => { if (item.id !== id) return item; const merged = { ...item, ...patch }; return { ...merged, status: computeStatus(merged) }; }); setItemsAndPersist(next, 'Saving inventory action through internal API...'); }
  function removeItem(id: string) { const next = items.filter((item) => item.id !== id); setItemsAndPersist(next, 'Deleting inventory item through internal API...'); if (activeId === id) setActiveId(next[0]?.id ?? ''); if (editingId === id) resetDraft(); }
  function reserveFromProduction() { const next = items.map((item) => { const reserved = consumptionBySku[item.sku] || item.reserved; const merged = { ...item, reserved: Math.max(item.reserved, reserved) }; return { ...merged, status: computeStatus(merged) }; }); setItemsAndPersist(next, 'Reserving materials from production tickets...'); }
  function consumeCompleted() { const dispatched = consumption.filter((row) => row.status === 'dispatched'); if (!dispatched.length) return; const usedBySku = dispatched.reduce((acc, row) => ({ ...acc, [row.materialSku]: (acc[row.materialSku] || 0) + row.totalUnits }), {} as Record<string, number>); const next = items.map((item) => { const used = usedBySku[item.sku] || 0; const merged = { ...item, onHand: Math.max(0, item.onHand - used), reserved: Math.max(0, item.reserved - used) }; return { ...merged, status: computeStatus(merged) }; }); setItemsAndPersist(next, 'Consuming materials from dispatched production tickets...'); }
  function resetSeed() { setItemsAndPersist(seedInventory, 'Resetting inventory records in database...'); setQuery(''); setStatusFilter('All'); setLocationFilter('All'); setActiveId(seedInventory[0]?.id ?? ''); resetDraft(); }
  function exportJson() { const blob = new Blob([JSON.stringify({ items: enhancedItems, consumption, tickets }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'inventory-material-consumption-v372.json'; link.click(); URL.revokeObjectURL(url); }

  return <div className="space-y-5">
    <PageHeader title="Inventory + Material Consumption" subtitle="Manage stock pools, job reservations, material consumption, low-stock risk and replenishment using live production tickets." actions={<><Button onClick={loadInventory}>Refresh</Button><Button onClick={reserveFromProduction}>Reserve from jobs</Button><Button onClick={consumeCompleted}>Consume dispatched</Button><Button onClick={resetSeed}>Reset seed</Button><Button onClick={exportJson}>Export JSON</Button><PrimaryButton onClick={saveItem}>{editingId ? 'Save inventory item' : 'Add inventory item'}</PrimaryButton></>} />
    <div className="rounded-xl border border-border bg-panel px-4 py-3 text-sm"><span className={dbStatus === 'connected' ? 'text-emerald-300' : dbStatus === 'error' ? 'text-red-300' : dbStatus === 'saving' ? 'text-amber-300' : dbStatus === 'local' ? 'text-amber-300' : 'text-textMuted'}>{dbStatus === 'connected' ? 'Database connected' : dbStatus === 'error' ? 'Database issue' : dbStatus === 'saving' ? 'Saving to database' : dbStatus === 'local' ? 'Local fallback' : 'Checking database'}</span><span className="ml-2 text-textMuted">{dbMessage}</span></div>
    <div className="grid gap-4 md:grid-cols-4">{stats.map((stat) => <Card key={stat.label} className="space-y-2"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{stat.label}</p><p className="text-3xl font-semibold text-text">{stat.value}</p><p className="text-sm text-textMuted">{stat.note}</p></Card>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><Input placeholder="Search SKU, title, material id" value={query} onChange={(e) => setQuery(e.target.value)} /><select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | StockStatus)}><option>All</option><option>Healthy</option><option>Low</option><option>Critical</option><option>Inbound</option></select><select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as 'All' | LocationType)}><option>All</option><option>Warehouse</option><option>Plant</option><option>Materials</option></select><div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-textMuted">{filtered.length} visible items</div></div><div className="space-y-3">{filtered.map((item) => { const available = Math.max(item.onHand - item.reserved, 0); const jobReserved = consumptionBySku[item.sku] || 0; return <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${activeItem?.id === item.id ? 'border-accent/40 bg-accent/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-text">{item.sku} · {item.title}</p><p className="mt-1 text-sm text-textMuted">{item.location} · {item.materialType || 'sheet'} · {item.unit || 'units'}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(item.status)}`}>{item.status}</span></div><div className="mt-3 grid gap-2 text-xs text-textMuted sm:grid-cols-5"><span>On hand: <span className="text-text">{item.onHand}</span></span><span>Reserved: <span className="text-text">{item.reserved}</span></span><span>Job demand: <span className="text-text">{jobReserved}</span></span><span>Available: <span className="text-text">{available}</span></span><span>Inbound: <span className="text-text">{item.incoming}</span></span></div></button>; })}</div></Card>
      <div className="space-y-5"><Card className="space-y-3"><p className="text-xs uppercase tracking-[0.2em] text-textMuted">Item editor</p><Input placeholder="SKU" value={draft.sku} onChange={(e) => setDraft((c) => ({ ...c, sku: e.target.value }))} /><Input placeholder="Item title" value={draft.title} onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))} /><Input placeholder="Location" value={draft.location} onChange={(e) => setDraft((c) => ({ ...c, location: e.target.value }))} /><select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={draft.locationType} onChange={(e) => setDraft((c) => ({ ...c, locationType: e.target.value as LocationType }))}><option>Warehouse</option><option>Plant</option><option>Materials</option></select><div className="grid grid-cols-2 gap-3"><Input type="number" placeholder="On hand" value={String(draft.onHand)} onChange={(e) => setDraft((c) => ({ ...c, onHand: toNumber(e.target.value) }))} /><Input type="number" placeholder="Reserved" value={String(draft.reserved)} onChange={(e) => setDraft((c) => ({ ...c, reserved: toNumber(e.target.value) }))} /><Input type="number" placeholder="Reorder point" value={String(draft.reorderPoint)} onChange={(e) => setDraft((c) => ({ ...c, reorderPoint: toNumber(e.target.value) }))} /><Input type="number" placeholder="Inbound" value={String(draft.incoming)} onChange={(e) => setDraft((c) => ({ ...c, incoming: toNumber(e.target.value) }))} /><Input type="number" placeholder="Lead days" value={String(draft.leadDays)} onChange={(e) => setDraft((c) => ({ ...c, leadDays: toNumber(e.target.value, 3) }))} /><Input type="number" placeholder="Waste %" value={String(draft.wastePercent || 0)} onChange={(e) => setDraft((c) => ({ ...c, wastePercent: toNumber(e.target.value) }))} /></div><div className="grid grid-cols-2 gap-3"><select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={draft.materialType} onChange={(e) => setDraft((c) => ({ ...c, materialType: e.target.value as InventoryItem['materialType'] }))}><option>sheet</option><option>roll</option><option>board</option><option>consumable</option></select><select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={draft.unit} onChange={(e) => setDraft((c) => ({ ...c, unit: e.target.value as InventoryItem['unit'] }))}><option>sheets</option><option>meters</option><option>boards</option><option>units</option></select></div><Input placeholder="Linked material IDs, comma separated" value={csvJoin(draft.linkedMaterialIds)} onChange={(e) => setDraft((c) => ({ ...c, linkedMaterialIds: csv(e.target.value) }))} /><textarea className="min-h-[80px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none placeholder:text-textMuted" placeholder="Operational notes, vendor context, substitution guidance..." value={draft.notes} onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))} /><div className="flex gap-2"><PrimaryButton onClick={saveItem}>{editingId ? 'Save changes' : 'Add item'}</PrimaryButton><Button onClick={resetDraft}>Clear</Button></div></Card>
      <Card className="space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-textMuted">Inventory spotlight</p><p className="mt-1 text-lg font-semibold text-text">{activeItem ? activeItem.title : 'No item selected'}</p></div>{activeItem ? <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(activeItem.status)}`}>{activeItem.status}</span> : null}</div>{activeItem ? <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-textMuted"><p className="text-xs uppercase tracking-[0.18em] text-textMuted">Supply posture</p><p className="mt-2 text-text">Available {Math.max(activeItem.onHand - activeItem.reserved, 0)} / Reorder at {activeItem.reorderPoint}</p><p className="mt-1">Incoming {activeItem.incoming} · Lead time {activeItem.leadDays} days</p></div><div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-textMuted"><p className="text-xs uppercase tracking-[0.18em] text-textMuted">Job demand</p><p className="mt-2 text-text">Reserved by live jobs: {consumptionBySku[activeItem.sku] || 0}</p><p className="mt-1">Waste factor: {activeItem.wastePercent || 0}%</p></div></div><div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-textMuted"><p className="text-xs uppercase tracking-[0.18em] text-textMuted">Notes</p><p className="mt-2 leading-6 text-textMuted">{activeItem.notes || 'No operational notes recorded.'}</p></div><div className="grid gap-2 sm:grid-cols-2"><Button onClick={() => patchItem(activeItem.id, { incoming: activeItem.incoming + Math.max(activeItem.reorderPoint, 50) })}>Raise replenishment</Button><Button onClick={() => patchItem(activeItem.id, { onHand: activeItem.onHand + activeItem.incoming, incoming: 0 })}>Receive inbound</Button><Button onClick={() => patchItem(activeItem.id, { reserved: Math.max(activeItem.reserved - 25, 0) })}>Release allocation</Button><Button onClick={() => patchItem(activeItem.id, { reserved: activeItem.reserved + 25 })}>Reserve stock</Button><Button onClick={() => loadIntoForm(activeItem)}>Edit item</Button><Button className="sm:col-span-2" onClick={() => removeItem(activeItem.id)}>Delete item</Button></div></> : <p className="text-sm text-textMuted">Select an inventory item to view replenishment actions and stock guidance.</p>}</Card></div>
    </div>
    <Card><h3 className="text-lg font-semibold text-white">Production material consumption plan</h3><p className="mt-1 text-sm text-textMuted">Calculated from live production job tickets. Matching uses ticket material against SKU/title/linked material IDs.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.16em] text-textMuted"><tr><th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Product</th><th className="py-2 pr-4">Material SKU</th><th className="py-2 pr-4">Qty</th><th className="py-2 pr-4">Base use</th><th className="py-2 pr-4">Waste</th><th className="py-2 pr-4">Total reserve</th><th className="py-2 pr-4">Status</th></tr></thead><tbody className="divide-y divide-white/8">{consumption.map((row) => <tr key={`${row.ticketId}-${row.materialSku}`} className="text-textMuted"><td className="py-3 pr-4 text-white">{row.orderNumber}</td><td className="py-3 pr-4">{row.productName}</td><td className="py-3 pr-4">{row.materialSku}</td><td className="py-3 pr-4">{row.quantity}</td><td className="py-3 pr-4">{row.consumeUnits}</td><td className="py-3 pr-4">{row.wasteUnits}</td><td className="py-3 pr-4 text-white">{row.totalUnits}</td><td className="py-3 pr-4">{row.status}</td></tr>)}{!consumption.length ? <tr><td colSpan={8} className="py-5 text-textMuted">No material consumption matched yet. Link inventory material IDs to ticket materials.</td></tr> : null}</tbody></table></div></Card>
  </div>;
}
