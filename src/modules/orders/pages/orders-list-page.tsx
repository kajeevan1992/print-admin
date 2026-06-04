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
type WorkflowFilter = 'all' | 'quote-review' | 'payment-needed' | 'artwork-production' | 'dispatch';

const workflowOptions: Array<{ value: WorkflowFilter; label: string }> = [
  { value: 'all', label: 'All workflows' },
  { value: 'quote-review', label: 'Quote review' },
  { value: 'payment-needed', label: 'Payment needed' },
  { value: 'artwork-production', label: 'Artwork / production' },
  { value: 'dispatch', label: 'Dispatch / collection' },
];

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
function needsQuoteReview(order: Order) {
  return order.status === 'pending' && order.paymentStatus === 'unpaid' && !order.stripeCheckoutSessionId;
}
function needsPayment(order: Order) {
  return ['unpaid', 'failed', 'authorized'].includes(order.paymentStatus) && !['cancelled', 'completed'].includes(order.status);
}
function needsArtworkOrProduction(order: Order) {
  return ['paid', 'authorized'].includes(order.paymentStatus) && ['pending', 'approved'].includes(order.status);
}
function needsDispatch(order: Order) {
  return ['in-production', 'shipped'].includes(order.status) || ['finishing', 'dispatch'].includes(order.productionStage);
}
function workflowFor(order: Order) {
  if (needsQuoteReview(order)) return { label: 'Review quote', tone: 'amber', helper: 'Approve and send payment link' };
  if (needsPayment(order)) return { label: order.paymentStatus === 'authorized' ? 'Payment link sent' : 'Payment needed', tone: 'red', helper: 'Send/retry payment link' };
  if (needsArtworkOrProduction(order)) return { label: 'Artwork / production', tone: 'blue', helper: 'Check artwork then produce' };
  if (needsDispatch(order)) return { label: 'Dispatch / collection', tone: 'green', helper: 'Pack, dispatch or mark complete' };
  if (order.status === 'completed') return { label: 'Completed', tone: 'green', helper: 'Finished order' };
  if (order.status === 'cancelled') return { label: 'Cancelled', tone: 'red', helper: 'No action' };
  return { label: 'Monitor', tone: 'blue', helper: 'Open order for details' };
}
function matchesWorkflow(order: Order, workflow: WorkflowFilter) {
  if (workflow === 'all') return true;
  if (workflow === 'quote-review') return needsQuoteReview(order);
  if (workflow === 'payment-needed') return needsPayment(order);
  if (workflow === 'artwork-production') return needsArtworkOrProduction(order);
  if (workflow === 'dispatch') return needsDispatch(order);
  return true;
}
function formatMoney(value: number) {
  return `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const [workflow, setWorkflow] = useState<WorkflowFilter>('all');
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

  const visibleOrders = useMemo(() => orders.filter((order) => matchesWorkflow(order, workflow)), [orders, workflow]);

  const stats = useMemo(() => ({
    total: visibleOrders.length,
    quoteReview: visibleOrders.filter(needsQuoteReview).length,
    paymentNeeded: visibleOrders.filter(needsPayment).length,
    artworkProduction: visibleOrders.filter(needsArtworkOrProduction).length,
    dispatch: visibleOrders.filter(needsDispatch).length,
    value: visibleOrders.reduce((sum, item) => sum + item.total, 0),
    automatable: visibleOrders.filter(orderCanAutomate).length
  }), [visibleOrders]);

  const urgentOrders = useMemo(() => visibleOrders.filter((order) => daysUntil(dueDate(order)) <= 1 && order.status !== 'completed' && order.status !== 'cancelled').slice(0, 5), [visibleOrders]);

  async function automateProductionTickets() {
    setAutomating(true);
    setAutomationMessage('');
    setError(null);
    try {
      const [products, existingTickets] = await Promise.all([loadProducts(), loadTickets()]);
      const existingIds = new Set(existingTickets.map((ticket) => ticket.id));
      const productById = new Map(products.map((product) => [product.id, product]));
      const created: JobTicket[] = [];
      for (const order of visibleOrders) {
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
      setAutomationMessage(created.length ? `${created.length} production ticket(s) created from visible paid/approved orders.` : 'No new tickets needed. Existing tickets are already up to date.');
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
        subtitle="Daily Holo Print order board for quote approval, payment collection, artwork checks, production and dispatch."
        actions={<><Button onClick={() => void load()}>Refresh</Button><Button>Export</Button><Button onClick={automateProductionTickets} disabled={automating}>{automating ? 'Creating tickets…' : 'Auto-create production tickets'}</Button><Link href="/production" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/[0.05]">Production Board</Link></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Visible Orders" value={String(stats.total)} />
        <MetricCard label="Quote Review" value={String(stats.quoteReview)} tone={stats.quoteReview ? 'amber' : 'default'} />
        <MetricCard label="Payment Needed" value={String(stats.paymentNeeded)} tone={stats.paymentNeeded ? 'red' : 'default'} />
        <MetricCard label="Artwork / Production" value={String(stats.artworkProduction)} tone={stats.artworkProduction ? 'blue' : 'default'} />
        <MetricCard label="Dispatch" value={String(stats.dispatch)} tone={stats.dispatch ? 'green' : 'default'} />
        <MetricCard label="Order Value" value={formatMoney(stats.value)} />
      </div>

      {automationMessage ? <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{automationMessage}</div> : null}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Shop workflow</p>
            <p className="mt-1 text-xs text-textMuted">Use this board first each morning: approve quote orders, create/send payment links, check paid artwork, then move jobs into production and dispatch.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <StatusPill value={`${stats.automatable} production ready`} subtle />
            <StatusPill value={`${urgentOrders.length} due soon`} subtle />
          </div>
        </div>
        {urgentOrders.length ? <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">{urgentOrders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted hover:bg-white/[0.06]"><span className="block font-semibold text-white">{order.orderNumber}</span><span>{workflowFor(order).label}</span><span className="mt-1 block">Due {dueDate(order)}</span></Link>)}</div> : null}
      </Card>

      <div className="mb-4 grid gap-2 md:grid-cols-[1.5fr_220px_240px]">
        <Input placeholder="Search by order number, customer, organisation or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={statusOptions.map((item) => ({ value: item, label: item === 'all' ? 'All statuses' : item }))} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')} />
        <Select options={workflowOptions} value={workflow} onChange={(e) => setWorkflow(e.target.value as WorkflowFilter)} />
      </div>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading orders...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}
      {!loading && !error && visibleOrders.length === 0 ? <EmptyModuleState title="No orders found" description="Adjust filters or wait for new storefront orders to arrive." /> : null}

      {!loading && !error && visibleOrders.length > 0 ? (
        <DataTable
          columns={[
            { key: 'number', header: 'Order', render: (row) => <div><div className="font-medium">{row.orderNumber}</div><div className="text-xs text-textMuted">{new Date(row.createdAt).toLocaleString()}</div></div> },
            { key: 'customer', header: 'Customer', render: (row) => <div><div>{row.customerName}</div><div className="text-xs text-textMuted">{row.customerEmail || row.organizationName || 'No email shown'}</div></div> },
            { key: 'workflow', header: 'Workflow', render: (row) => <WorkflowBadge order={row} /> },
            { key: 'status', header: 'Status', render: (row) => <div className="flex flex-col gap-1"><StatusPill value={row.status} /><StatusPill value={row.productionStage} subtle /></div> },
            { key: 'payment', header: 'Payment', render: (row) => <div className="flex flex-col gap-1"><StatusPill value={row.paymentStatus} subtle />{row.stripeCheckoutSessionId ? <span className="text-[11px] text-textMuted">Stripe link created</span> : null}</div> },
            { key: 'items', header: 'Items', render: (row) => <div><div>{row.itemCount} item(s)</div><div className="text-xs text-textMuted">{row.items?.[0]?.productName || row.storeName}</div></div> },
            { key: 'total', header: 'Total', render: (row) => `${row.currency} ${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { key: 'action', header: 'Action', render: (row) => <div className="flex flex-col gap-1"><Link href={`/orders/${row.id}`} className="text-accent">Open order</Link><span className="text-[11px] text-textMuted">{workflowFor(row).helper}</span></div> }
          ]}
          rows={visibleOrders}
          rowKey={(row) => row.id}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'amber' | 'red' | 'green' | 'blue' }) {
  const toneClass = tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : '';
  return (
    <Card className={toneClass}>
      <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function WorkflowBadge({ order }: { order: Order }) {
  const workflow = workflowFor(order);
  return <div className="space-y-1"><StatusPill value={workflow.label} tone={workflow.tone as any} /><p className="text-xs text-textMuted">{workflow.helper}</p></div>;
}

function StatusPill({ value, subtle = false, tone }: { value: string; subtle?: boolean; tone?: 'amber' | 'red' | 'green' | 'blue' }) {
  const normalised = String(value || '').toLowerCase();
  const resolvedTone = tone || (normalised.includes('paid') || normalised.includes('completed') || normalised.includes('shipped') || normalised.includes('dispatch') || normalised.includes('ready') || normalised.includes('production ready')
    ? 'green'
    : normalised.includes('cancel') || normalised.includes('refund') || normalised.includes('waiting') || normalised.includes('needed') || normalised.includes('failed')
      ? 'red'
      : normalised.includes('quote') || normalised.includes('pending') || normalised.includes('review')
        ? 'amber'
        : 'blue');
  const toneClass = resolvedTone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : resolvedTone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-200' : resolvedTone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-sky-500/30 bg-sky-500/10 text-sky-200';

  return <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs capitalize ${subtle ? toneClass : toneClass}`}>{value.replace(/-/g, ' ')}</span>;
}
