'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/buttons';
import { reportsService } from '@/services/reports.service';

type RevenuePoint = Awaited<ReturnType<typeof reportsService.getRevenueSeries>>[number];
type ChannelPerformance = Awaited<ReturnType<typeof reportsService.getChannelPerformance>>[number];
type ProductPerformance = Awaited<ReturnType<typeof reportsService.getProductPerformance>>[number];

const dateRanges = ['Last 7 days', 'Last 30 days', 'This month', 'Quarter to date'];

export function ReportsPage() {
  const [range, setRange] = useState(dateRanges[0]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportsService.getRevenueSeries(),
      reportsService.getChannelPerformance(),
      reportsService.getProductPerformance()
    ]).then(([revenueData, channelData, productData]) => {
      setRevenue(revenueData);
      setChannels(channelData);
      setProducts(productData);
      setLoading(false);
    });
  }, []);

  const totals = useMemo(() => {
    const revenueTotal = revenue.reduce((sum, item) => sum + item.revenue, 0);
    const ordersTotal = revenue.reduce((sum, item) => sum + item.orders, 0);
    return {
      revenueTotal,
      ordersTotal,
      avgOrderValue: ordersTotal ? revenueTotal / ordersTotal : 0
    };
  }, [revenue]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Track commercial performance, channel contribution, and top-selling products."
        actions={
          <>
            <Button>Export CSV</Button>
            <Button>Schedule Report</Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {dateRanges.map((item) => (
          <button
            key={item}
            onClick={() => setRange(item)}
            className={`rounded-lg border px-3 py-2 text-sm ${range === item ? 'border-accent bg-panelMuted text-text' : 'border-border text-textMuted'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? <Card>Loading reports...</Card> : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-xs uppercase text-textMuted">Revenue</p>
              <p className="mt-2 text-2xl font-semibold">£{totals.revenueTotal.toLocaleString()}</p>
              <p className="mt-1 text-sm text-textMuted">{range}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-textMuted">Orders</p>
              <p className="mt-2 text-2xl font-semibold">{totals.ordersTotal.toLocaleString()}</p>
              <p className="mt-1 text-sm text-textMuted">Completed + in production</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-textMuted">Average order value</p>
              <p className="mt-2 text-2xl font-semibold">£{Math.round(totals.avgOrderValue).toLocaleString()}</p>
              <p className="mt-1 text-sm text-textMuted">Across active channels</p>
            </Card>
          </div>

          <Card className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Revenue trend</h3>
                <p className="text-sm text-textMuted">Simple weekly snapshot of orders and sales.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-7">
              {revenue.map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-panelMuted p-3">
                  <p className="text-xs uppercase text-textMuted">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">£{item.revenue.toLocaleString()}</p>
                  <p className="text-sm text-textMuted">{item.orders} orders</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Channel performance</h3>
              <DataTable
                columns={[
                  { key: 'channel', header: 'Channel', render: (row) => row.channel },
                  { key: 'orders', header: 'Orders', render: (row) => row.orders.toLocaleString() },
                  { key: 'revenue', header: 'Revenue', render: (row) => `£${row.revenue.toLocaleString()}` },
                  { key: 'conversion', header: 'Conversion', render: (row) => row.conversion },
                  { key: 'aov', header: 'AOV', render: (row) => row.aov }
                ]}
                rows={channels}
                rowKey={(row) => row.id}
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Top products</h3>
              <DataTable
                columns={[
                  { key: 'product', header: 'Product', render: (row) => row.product },
                  { key: 'category', header: 'Category', render: (row) => row.category },
                  { key: 'orders', header: 'Orders', render: (row) => row.orders.toLocaleString() },
                  { key: 'revenue', header: 'Revenue', render: (row) => `£${row.revenue.toLocaleString()}` },
                  { key: 'margin', header: 'Margin', render: (row) => row.margin }
                ]}
                rows={products}
                rowKey={(row) => row.id}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}