'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button } from '@/components/ui/buttons';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { ordersService } from '@/services/orders.service';
import type { Order, OrderStatus } from '@/modules/orders/types';

const statusOptions: Array<OrderStatus | 'all'> = ['all', 'draft', 'pending', 'approved', 'in-production', 'shipped', 'completed', 'cancelled'];

type ProductRecord = { id: string; name: string; slug: string; metadataJson?: Record<string, any> };
type JobTicket = Record<string, any>;

function metadata(product?: ProductRecord | null) {
  return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
}
function machines(product?: ProductRecord | null) {
  return Array.isArray(metadata(product).productionConstraints?.machines) ? metadata(product).productionConstraints.machines : [];
}
function materials(product?: ProductRecord | null) {
  return Array.isArray(metadata(product).productionConstraints?.materials) ? metadata(product).productionConstraints.materials : [];
}
function finishing(product?: ProductRecord | null) {
  return Array.isArray(metadata(product).finishing) ? metadata(product).finishing : [];
}
function dueDate(order: Order) {
  return order.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
}
function orderCanAutomate(order: Order) {
  return ['paid', 'authorized', 'captured'].includes(order.paymentStatus) || ['approved', 'in-production'].includes(order.status);
}
async function loadProducts(): Promise<ProductRecord[]> {
  const response = await fetch('/api/internal/catalog/products?limit=500', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload.data?.items) ? payload.data.items : [];
}
async function loadTickets(): Promise<JobTicket[]> {
  const response = await fetch('/api/internal/config/production-job-tickets/items', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload.data?.items) ? payload.data.items : [];
}
async function saveTickets(items: JobTicket[]) {
  await fetch('/api/internal/config/production-job-tickets/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'production-job-tickets', title: 'Production Job Tickets', description: 'Manufacturing job tickets generated from paid storefront orders', items, values: { count: String(items.length), source: 'v369-order-automation' } })
  });
}
function buildTicket(order: Order, item: Order['items'][number], product?: ProductRecord | null): JobTicket {
  const meta = metadata(product);
  const machine = machines(product).find((row: any) => row.enabled !== false) || machines(product)[0] || {};
  const material = materials(product).find((row: any) => row.enabled !== false) || materials(product)[0] || {};
  const finish = finishing(product).map((row: any) => row.id || row.label).filter(Boolean);
  const artworkRequired = meta.artworkRequired !== false;
  const now = new Date().toISOString();
  const warnings = [] as string[];
  if (artworkRequired && !meta.artworkRules?.fileTypes?.length && !meta.artwork?.acceptedFiles?.length) warnings.push('Artwork rules/file types are missing for this product.');
  if (!machine.id && !machine.name) warnings.push('No compatible production machine configured.');
  if (!material.id && !material.name) warnings.push('No compatible material configured.');
  if (meta.productionConstraints?.allowPanelJoin && !meta.productionConstraints?.panelJoinMessage) warnings.push('Panel join allowed but warning message missing.');
  return {
    id: `job-${order.id}-${item.id}`,
    orderId: order.id,
    orderItemId: item.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    productId: item.productId,
    productName: item.productName,
    quantity: Number(item.quantity || 1),
    dueDate: dueDate(order),
    priority: daysUntil(dueDate(order)) <= 1 ? 'urgent' : 'normal',
    status: artworkRequired ? 'artwork-check' : 'ready-to-print',
    artworkStatus: artworkRequired ? 'not-uploaded' : 'approved',
    machine: machine.id || machine.name || '',
    material: material.id || material.name || '',
    route: ['artwork-check', 'print', ...(finish.length ? ['finishing'] : []), 'pack', 'dispatch'],
    finishing: finish,
    supplier: meta.supplierPricing?.mode === 'api' ? 'supplier-api' : 'internal',
    notes: `Auto-created from ${order.orderNumber} by v369 order-production automation.`,
    warnings,
    automationSource: 'v369-order-production-pipeline',
    createdAt: now,
    updatedAt: now,
  };
}
function daysUntil(date: string) {
  const due = new Date(`${date}T23:59:59`).getTime();
  return Math.ceil((due - Date.now()) / 86400000);
}

export function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [automating, setAutomating] = useState(false);
  const [automationMessage, setAutomationMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ordersService.listOrders({ search: search || undefined, status });
      setOrders(response.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => ({
    total: orders.length,
    production: orders.filter((item) => item.status === 'in-production').length,
    shipping: orders.filter((item) => item.status === 'shipped').length,
    value: orders.reduce((sum, item) => sum + item.total, 0),
    automatable: orders.filter(orderCanAutomate).length
  }), [orders]);

  async function automateProductionTickets() {
    setAutomating(true);
    setAutomationMessage('');
    setError(null);
    try {
      const [products, existingTickets] = await Promise.all([loadProducts(), loadTickets()]);
      const existingIds = new Set(existingTickets.map((ticket) => ticket.id));
      const productById = new Map(products.map((product) => [product.id, product]));
      const created: JobTicket[] = [];
      for (const order of orders) {
        if (!orderCanAutomate(order)) continue;
        for (const item of order.items || []) {
          const product = productById.get(item.productId) || products.find((entry) => entry.name === item.productName || entry.slug === item.productId);
          const ticket = buildTicket(order, item, product);
          if (!existingIds.has(ticket.id)) {
            existingIds.add(ticket.id);
            created.push(ticket);
          }
        }
      }
      if (created.length) await saveTickets([...created, ...existingTickets]);
      setAutomationMessage(created.length ? `${created.length} production ticket(s) created from paid/approved orders.` : 'No new tickets needed. Existing tickets are already up to date.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Production automation failed');
    } finally {
      setAutomating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Track storefront orders from payment approval through prepress, production, and dispatch."
        actions={<><Button>Export</Button><Button onClick={automateProductionTickets} disabled={automating}>{automating ? 'Creating tickets…' : 'Auto-create production tickets'}</Button><Link href="/production" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/[0.05]">Production Board</Link></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <MetricCard label="Visible Orders" value={String(stats.total)} />
        <MetricCard label="Ready for Automation" value={String(stats.automatable)} />
        <MetricCard label="In Production" value={String(stats.production)} />
        <MetricCard label="In Shipping" value={String(stats.shipping)} />
        <MetricCard label="Order Value" value={`£${stats.value.toLocaleString()}`} />
      </div>

      {automationMessage ? <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{automationMessage}</div> : null}

      <Card className="mb-4 p-4">
        <p className="text-sm font-semibold text-white">v369 Live Order → Production Automation</p>
        <p className="mt-1 text-xs text-textMuted">Paid/approved orders can now generate v367 production job tickets. Tickets inherit product artwork rules, machine/material constraints, finishing routes, supplier mode and due-date risk.</p>
      </Card>

      <div className="mb-4 grid gap-2 md:grid-cols-[1.5fr_220px]">
        <Input placeholder="Search by order number, customer, organisation || email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={statusOptions.map((item) => ({ value: item, label: item === 'all' ? 'All statuses' : item }))} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')} />
      </div>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading orders...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}
      {!loading && !error && orders.length === 0 ? <EmptyModuleState title="No orders found" description="Adjust filters || wait for new storefront orders to arrive." /> : null}

      {!loading && !error && orders.length > 0 ? (
        <DataTable
          columns={[
            { key: 'number', header: 'Order', render: (row) => <div><div className="font-medium">{row.orderNumber}</div><div className="text-xs text-textMuted">{row.createdAt}</div></div> },
            { key: 'customer', header: 'Customer', render: (row) => <div><div>{row.customerName}</div><div className="text-xs text-textMuted">{row.organizationName}</div></div> },
            { key: 'store', header: 'Store', render: (row) => row.storeName },
            { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
            { key: 'automation', header: 'Automation', render: (row) => <StatusPill value={orderCanAutomate(row) ? 'production-ready' : 'waiting-payment'} subtle /> },
            { key: 'production', header: 'Production', render: (row) => <StatusPill value={row.productionStage} subtle /> },
            { key: 'payment', header: 'Payment', render: (row) => <StatusPill value={row.paymentStatus} subtle /> },
            { key: 'total', header: 'Total', render: (row) => `${row.currency} ${row.total.toLocaleString()}` },
            { key: 'action', header: 'Action', render: (row) => <Link href={`/orders/${row.id}`} className="text-accent">Open</Link> }
          ]}
          rows={orders}
          rowKey={(row) => row.id}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function StatusPill({ value, subtle = false }: { value: string; subtle?: boolean }) {
  const tone = value.includes('paid') || value.includes('completed') || value.includes('shipped') || value.includes('dispatch') || value.includes('ready')
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : value.includes('cancel') || value.includes('refund') || value.includes('waiting')
      ? 'border-red-500/30 bg-red-500/10 text-red-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${subtle ? tone : tone}`}>{value.replace(/-/g, ' ')}</span>;
}
