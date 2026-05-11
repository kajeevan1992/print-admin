'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };
type JobTicket = {
  id: string;
  orderNumber: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  dueDate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'queued' | 'artwork-check' | 'proofing' | 'ready-to-print' | 'printing' | 'finishing' | 'packing' | 'dispatched' | 'blocked';
  artworkStatus: 'not-uploaded' | 'uploaded' | 'preflight-pass' | 'preflight-warning' | 'preflight-fail' | 'approved';
  machine: string;
  material: string;
  route: string[];
  finishing: string[];
  supplier: string;
  notes: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
};

const ticketStatuses = ['queued', 'artwork-check', 'proofing', 'ready-to-print', 'printing', 'finishing', 'packing', 'dispatched', 'blocked'];
const artworkStatuses = ['not-uploaded', 'uploaded', 'preflight-pass', 'preflight-warning', 'preflight-fail', 'approved'];
const priorities = ['low', 'normal', 'high', 'urgent'];

function todayPlus(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function csv(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function metadata(product?: Product | null) { return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {}; }
function machines(product?: Product | null) { return Array.isArray(metadata(product).productionConstraints?.machines) ? metadata(product).productionConstraints.machines : []; }
function materials(product?: Product | null) { return Array.isArray(metadata(product).productionConstraints?.materials) ? metadata(product).productionConstraints.materials : []; }
function finishing(product?: Product | null) { return Array.isArray(metadata(product).finishing) ? metadata(product).finishing : []; }
function constraints(product?: Product | null) { return metadata(product).productionConstraints || {}; }
function artworkRules(product?: Product | null) { return metadata(product).artworkRules || {}; }
function defaultTicket(product: Product | null): JobTicket {
  const machine = machines(product).find((m: any) => m.enabled !== false) || machines(product)[0];
  const material = materials(product).find((m: any) => m.enabled !== false) || materials(product)[0];
  const finish = finishing(product).map((f: any) => f.id || f.label).filter(Boolean);
  const now = new Date().toISOString();
  return {
    id: `job-${Date.now()}`,
    orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
    customerName: '',
    productId: product?.id || '',
    productName: product?.name || '',
    quantity: 100,
    dueDate: todayPlus(3),
    priority: 'normal',
    status: metadata(product).artworkRequired === false ? 'ready-to-print' : 'artwork-check',
    artworkStatus: metadata(product).artworkRequired === false ? 'approved' : 'not-uploaded',
    machine: machine?.id || machine?.name || '',
    material: material?.id || material?.name || '',
    route: ['artwork-check', 'print', ...(finish.length ? ['finishing'] : []), 'pack', 'dispatch'],
    finishing: finish,
    supplier: metadata(product).supplierPricing?.mode === 'api' ? 'supplier-api' : 'internal',
    notes: '',
    warnings: buildWarnings(product, '', ''),
    createdAt: now,
    updatedAt: now,
  };
}
function buildWarnings(product: Product | null, machineId: string, materialId: string) {
  const output: string[] = [];
  const meta = metadata(product);
  const c = constraints(product);
  const art = artworkRules(product);
  if (meta.artworkRequired !== false && !Array.isArray(art.fileTypes)) output.push('Artwork file types are not configured.');
  if (c.sizeLimitMode === 'machine-width' && !Number(c.maxRollWidthMm || 0)) output.push('Roll-width constraint is missing.');
  if (c.allowPanelJoin && !c.panelJoinMessage) output.push('Panel join is allowed but no customer warning message is configured.');
  const selectedMachine = machines(product).find((m: any) => (m.id || m.name) === machineId);
  const selectedMaterial = materials(product).find((m: any) => (m.id || m.name) === materialId);
  if (selectedMachine?.enabled === false) output.push('Selected machine is disabled for this product.');
  if (selectedMaterial?.enabled === false) output.push('Selected material is disabled for this product.');
  if (selectedMaterial?.compatibleMachines?.length && machineId && !selectedMaterial.compatibleMachines.includes(machineId)) output.push('Selected material is not compatible with the selected machine.');
  return output;
}

async function readTickets(): Promise<JobTicket[]> {
  const res = await fetch('/api/internal/config/production-job-tickets/items', { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) return [];
  const items = Array.isArray(json.data?.items) ? json.data.items : [];
  return items as JobTicket[];
}
async function writeTickets(items: JobTicket[]) {
  await fetch('/api/internal/config/production-job-tickets/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'production-job-tickets', title: 'Production Job Tickets', description: 'Manufacturing job tickets generated from products/orders', items, values: { count: String(items.length) } }),
  });
}

export default function ProductionJobTicketsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tickets, setTickets] = useState<JobTicket[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editing, setEditing] = useState<JobTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) || products[0] || null, [products, selectedProductId]);
  const rows = useMemo(() => tickets.filter((ticket) => statusFilter === 'all' || ticket.status === statusFilter), [tickets, statusFilter]);
  const currentProduct = useMemo(() => products.find((product) => product.id === editing?.productId) || selectedProduct, [products, editing?.productId, selectedProduct]);

  async function load() {
    setLoading(true); setError('');
    try {
      const productsRes = await fetch('/api/internal/catalog/products?limit=300', { cache: 'no-store' });
      const productsJson = await productsRes.json().catch(() => ({}));
      const productItems = Array.isArray(productsJson.data?.items) ? productsJson.data.items : [];
      const ticketItems = await readTickets();
      setProducts(productItems);
      setSelectedProductId((current) => current || productItems[0]?.id || '');
      setTickets(ticketItems);
    } catch (err) { setError(err instanceof Error ? err.message : 'Job tickets failed to load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startNewTicket() { setEditing(defaultTicket(selectedProduct)); }
  function patch(ticket: Partial<JobTicket>) { setEditing((prev) => prev ? { ...prev, ...ticket, warnings: buildWarnings(products.find((p) => p.id === (ticket.productId || prev.productId)) || null, ticket.machine ?? prev.machine, ticket.material ?? prev.material), updatedAt: new Date().toISOString() } : prev); }
  async function saveTicket() {
    if (!editing) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const product = products.find((item) => item.id === editing.productId) || null;
      const nextTicket = { ...editing, productName: product?.name || editing.productName, warnings: buildWarnings(product, editing.machine, editing.material), updatedAt: new Date().toISOString() };
      const next = tickets.some((item) => item.id === nextTicket.id) ? tickets.map((item) => item.id === nextTicket.id ? nextTicket : item) : [nextTicket, ...tickets];
      await writeTickets(next);
      setTickets(next); setEditing(null); setMessage('Production job ticket saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Job ticket save failed.'); }
    finally { setSaving(false); }
  }
  async function deleteTicket(id: string) {
    const next = tickets.filter((item) => item.id !== id);
    await writeTickets(next); setTickets(next); setMessage('Production job ticket deleted.');
  }

  return <div className="space-y-6">
    <PageHeader title="Production Workflow + Job Ticket Engine" subtitle="Create production-ready job tickets from product configuration, artwork rules, pricing, machine/material constraints and finishing route logic." />
    <Card className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v367 production bridge</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Product setup now becomes production work</h2><p className="mt-1 text-sm text-textMuted">Job tickets include artwork state, machine, material, finishing route, supplier handoff, warnings and operator notes.</p></div><div className="flex flex-wrap gap-2"><button onClick={startNewTicket} disabled={!selectedProduct} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Plus size={16}/>New ticket</button></div></div></Card>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    <div className="grid gap-4 md:grid-cols-4"><Card><p className="text-xs text-textMuted">Tickets</p><p className="mt-2 text-2xl font-semibold text-white">{tickets.length}</p></Card><Card><p className="text-xs text-textMuted">Active</p><p className="mt-2 text-2xl font-semibold text-white">{tickets.filter((t) => !['dispatched','blocked'].includes(t.status)).length}</p></Card><Card><p className="text-xs text-textMuted">Artwork blocked</p><p className="mt-2 text-2xl font-semibold text-white">{tickets.filter((t) => t.artworkStatus === 'preflight-fail' || t.artworkStatus === 'not-uploaded').length}</p></Card><Card><p className="text-xs text-textMuted">Warnings</p><p className="mt-2 text-2xl font-semibold text-white">{tickets.reduce((sum, t) => sum + t.warnings.length, 0)}</p></Card></div>
    <div className="grid gap-4 xl:grid-cols-[330px_1fr]">
      <Card><h3 className="font-semibold text-white">Create from product</h3><label className="mt-4 block space-y-2"><span className="text-sm font-medium">Product</span><Select value={selectedProduct?.id || selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} options={products.length ? products.map((p) => ({ value: p.id, label: `${p.name} /${p.slug}` })) : [{ value: '', label: loading ? 'Loading...' : 'No products' }]}/></label>{selectedProduct ? <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs text-textMuted"><p className="text-sm font-semibold text-white">{selectedProduct.name}</p><p className="mt-2">Machines: {machines(selectedProduct).length}</p><p>Materials: {materials(selectedProduct).length}</p><p>Finishing: {finishing(selectedProduct).length}</p><p>Preflight: {metadata(selectedProduct).preflightVersion || 'not configured'}</p></div> : null}<label className="mt-4 block space-y-2"><span className="text-sm font-medium">Filter status</span><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: 'all', label: 'All statuses' }, ...ticketStatuses.map((s) => ({ value: s, label: s }))]}/></label></Card>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.16em] text-textMuted"><tr><th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Product</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Artwork</th><th className="py-2 pr-4">Machine</th><th className="py-2 pr-4">Material</th><th className="py-2 pr-4">Due</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody className="divide-y divide-white/8">{rows.map((ticket) => <tr key={ticket.id} className="text-textMuted"><td className="py-3 pr-4 text-white">{ticket.orderNumber}</td><td className="py-3 pr-4">{ticket.productName}</td><td className="py-3 pr-4">{ticket.status}</td><td className="py-3 pr-4">{ticket.artworkStatus}</td><td className="py-3 pr-4">{ticket.machine || '—'}</td><td className="py-3 pr-4">{ticket.material || '—'}</td><td className="py-3 pr-4">{ticket.dueDate}</td><td className="py-3 pr-4"><div className="flex gap-2"><button onClick={() => setEditing(ticket)} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white">Edit</button><button onClick={() => deleteTicket(ticket.id)} className="rounded-lg border border-rose-400/20 px-3 py-1 text-xs text-rose-100"><Trash2 size={13}/></button></div></td></tr>)}{!rows.length ? <tr><td colSpan={8} className="py-5 text-textMuted">No job tickets yet.</td></tr> : null}</tbody></table></div></Card>
    </div>
    {editing ? <Card className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-white"><FileText size={18}/><h3 className="text-lg font-semibold">Job ticket</h3></div><p className="mt-1 text-xs text-textMuted">Route: {editing.route.join(' → ')}</p></div><button onClick={saveTicket} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save ticket</button></div><div className="mt-5 grid gap-4 md:grid-cols-4"><Input value={editing.orderNumber} placeholder="Order number" onChange={(e) => patch({ orderNumber: e.target.value })}/><Input value={editing.customerName} placeholder="Customer" onChange={(e) => patch({ customerName: e.target.value })}/><Select value={editing.productId} options={products.map((p) => ({ value: p.id, label: p.name }))} onChange={(e) => { const product = products.find((p) => p.id === e.target.value) || null; setEditing(defaultTicket(product)); }}/><Input type="number" value={String(editing.quantity)} placeholder="Quantity" onChange={(e) => patch({ quantity: Number(e.target.value) })}/><Input type="date" value={editing.dueDate} onChange={(e) => patch({ dueDate: e.target.value })}/><Select value={editing.priority} options={priorities.map((s) => ({ value: s, label: s }))} onChange={(e) => patch({ priority: e.target.value as JobTicket['priority'] })}/><Select value={editing.status} options={ticketStatuses.map((s) => ({ value: s, label: s }))} onChange={(e) => patch({ status: e.target.value as JobTicket['status'] })}/><Select value={editing.artworkStatus} options={artworkStatuses.map((s) => ({ value: s, label: s }))} onChange={(e) => patch({ artworkStatus: e.target.value as JobTicket['artworkStatus'] })}/><Select value={editing.machine} options={[{ value: '', label: 'Choose machine' }, ...machines(currentProduct).map((m: any) => ({ value: m.id || m.name, label: `${m.name || m.id}${m.enabled === false ? ' (disabled)' : ''}` }))]} onChange={(e) => patch({ machine: e.target.value })}/><Select value={editing.material} options={[{ value: '', label: 'Choose material' }, ...materials(currentProduct).map((m: any) => ({ value: m.id || m.name, label: `${m.name || m.id}${m.enabled === false ? ' (disabled)' : ''}` }))]} onChange={(e) => patch({ material: e.target.value })}/><Input value={editing.supplier} placeholder="Supplier/internal" onChange={(e) => patch({ supplier: e.target.value })}/><Input value={editing.finishing.join(',')} placeholder="Finishing route" onChange={(e) => patch({ finishing: csv(e.target.value) })}/></div><label className="mt-4 block space-y-2"><span className="text-sm font-medium">Operator notes</span><textarea value={editing.notes} onChange={(e) => patch({ notes: e.target.value })} className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none"/></label>{editing.warnings.length ? <div className="mt-4 space-y-2">{editing.warnings.map((warning) => <div key={warning} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">{warning}</div>)}</div> : <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">No production warnings for this ticket.</div>}</Card> : null}
  </div>;
}
