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

export function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
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
    value: orders.reduce((sum, item) => sum + item.total, 0)
  }), [orders]);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Track storefront orders from payment approval through prepress, production, and dispatch."
        actions={<><Button>Export</Button><Button>Production Board</Button></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard label="Visible Orders" value={String(stats.total)} />
        <MetricCard label="In Production" value={String(stats.production)} />
        <MetricCard label="In Shipping" value={String(stats.shipping)} />
        <MetricCard label="Order Value" value={`$${stats.value.toLocaleString()}`} />
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-[1.5fr_220px]">
        <Input placeholder="Search by order number, customer, organisation or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={statusOptions.map((item) => ({ value: item, label: item === 'all' ? 'All statuses' : item }))} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')} />
      </div>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading orders...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}
      {!loading && !error && orders.length === 0 ? <EmptyModuleState title="No orders found" description="Adjust filters or wait for new storefront orders to arrive." /> : null}

      {!loading && !error && orders.length > 0 ? (
        <DataTable
          columns={[
            { key: 'number', header: 'Order', render: (row) => <div><div className="font-medium">{row.orderNumber}</div><div className="text-xs text-textMuted">{row.createdAt}</div></div> },
            { key: 'customer', header: 'Customer', render: (row) => <div><div>{row.customerName}</div><div className="text-xs text-textMuted">{row.organizationName}</div></div> },
            { key: 'store', header: 'Store', render: (row) => row.storeName },
            { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
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
  const tone = value.includes('paid') || value.includes('completed') || value.includes('shipped') || value.includes('dispatch')
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : value.includes('cancel') || value.includes('refund')
      ? 'border-red-500/30 bg-red-500/10 text-red-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${subtle ? tone : tone}`}>{value.replace(/-/g, ' ')}</span>;
}
