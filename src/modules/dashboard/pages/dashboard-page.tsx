'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { LineChartCard } from '@/components/charts/line-chart-card';
import { PieChartCard } from '@/components/charts/pie-chart-card';
import { dashboardService, type DashboardPayload } from '@/services/dashboard.service';
import { KpiGrid } from '@/modules/dashboard/components/kpi-grid';
import { EmptyState } from '@/components/ui/empty-state';

export function DashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService
      .getDashboardMetrics()
      .then((response) => setPayload(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card>Loading dashboard metrics...</Card>;
  if (error) return <Card className="text-red-300">{error}</Card>;
  if (!payload) return <EmptyState title="No dashboard data" description="Try refreshing to load metrics." />;

  return (
    <div>
      <PageHeader title="Welcome back, Alex" subtitle="Here is a live snapshot of platform health, conversion, and production flow." />
      <KpiGrid kpis={payload.kpis} />

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <LineChartCard title="Orders vs Quotes" data={payload.salesSeries} />
        <PieChartCard title="API Usage Split" data={payload.apiUsage} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Conversion Funnel Summary</h3>
          <ul className="space-y-2 text-sm">
            <li>Traffic → Product View: <span className="text-accentAlt">62%</span></li>
            <li>Product View → Quote Request: <span className="text-accentAlt">27%</span></li>
            <li>Quote → Paid Order: <span className="text-accentAlt">31.7%</span></li>
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Recent Activity</h3>
          <ul className="space-y-2 text-sm text-textMuted">
            {payload.activity.map((item) => (
              <li key={item} className="rounded-lg border border-border bg-panelMuted px-3 py-2">{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4">
        <DataTable
          columns={[
            { key: 'source', header: 'Source', render: (row) => row.source },
            { key: 'sessions', header: 'Sessions', render: (row) => row.sessions.toLocaleString() },
            { key: 'conversion', header: 'Conversion', render: (row) => row.conversion }
          ]}
          rows={payload.referrers}
          rowKey={(row) => row.source}
        />
      </div>
    </div>
  );
}
