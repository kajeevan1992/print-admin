'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { LineChartCard } from '@/components/charts/line-chart-card';
import { PieChartCard } from '@/components/charts/pie-chart-card';
import { dashboardService, type DashboardResponse } from '@/services/dashboard.service';
import { EmptyState } from '@/components/ui/empty-state';
import { StoreSwitcher } from '@/modules/dashboard/components/store-switcher';
import { PlanSummaryCard } from '@/modules/dashboard/components/plan-summary-card';
import { StoreOverviewCard } from '@/modules/dashboard/components/store-overview-card';
import { AlertsPanel } from '@/modules/dashboard/components/alerts-panel';
import { BusinessHealthCard } from '@/modules/dashboard/components/business-health-card';
import { QuickActionsPanel } from '@/modules/dashboard/components/quick-actions-panel';
import { DashboardKpiGrid } from '@/modules/dashboard/components/dashboard-kpi-grid';

const STORAGE_KEY = 'print-admin-active-store';

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('store-1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (storeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardService.getDashboardMetrics(storeId);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

    const initialStore = saved || 'store-1';
    setSelectedStoreId(initialStore);
    loadDashboard(initialStore);
  }, []);

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, storeId);
    }
    loadDashboard(storeId);
  };

  if (loading) return <Card>Loading dashboard metrics...</Card>;
  if (error) return <Card className="text-red-300">{error}</Card>;
  if (!data) return <EmptyState title="No dashboard data" description="Try refreshing to load metrics." />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle="Your print SaaS control center across stores, billing, operations, and performance."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StoreSwitcher
              stores={data.stores}
              selectedStoreId={selectedStoreId}
              onChange={handleStoreChange}
            />
            <button className="rounded-xl border border-border px-4 py-2 text-sm">
              Last 30 Days
            </button>
            <button className="rounded-xl border border-border px-4 py-2 text-sm">
              Refresh
            </button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PlanSummaryCard
            planName={data.organization.planName}
            billingCycle={data.organization.billingCycle}
            nextPaymentDate={data.organization.nextPaymentDate}
            subscriptionStatus={data.organization.subscriptionStatus}
            storesUsed={data.organization.storesUsed}
            storesAllowed={data.organization.storesAllowed}
            apiQuotaUsed={data.organization.apiQuotaUsed}
            apiQuotaLimit={data.organization.apiQuotaLimit}
            supportTier={data.organization.supportTier}
          />
        </div>

        <StoreOverviewCard
          store={data.selectedStore}
          organizationName={data.organization.name}
        />
      </div>

      <DashboardKpiGrid kpis={data.payload.kpis} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LineChartCard title="Sales Trend" data={data.payload.salesSeries} />
        </div>
        <PieChartCard title="API Usage Split" data={data.payload.apiUsage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LineChartCard title="Orders Trend" data={data.payload.orderSeries} />
        </div>
        <AlertsPanel alerts={data.payload.alerts} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <QuickActionsPanel actions={data.payload.quickActions} />
        <BusinessHealthCard items={data.payload.health} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Recent Activity</h3>
          <ul className="space-y-2 text-sm text-textMuted">
            {data.payload.activity.map((item) => (
              <li key={item} className="rounded-lg border border-border bg-panelMuted px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Store Usage Snapshot</h3>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-panelMuted p-3">
              Site name: <span className="font-medium">{data.selectedStore.name}</span>
            </div>
            <div className="rounded-lg border border-border bg-panelMuted p-3">
              Stores used: <span className="font-medium">{data.organization.storesUsed}</span>
            </div>
            <div className="rounded-lg border border-border bg-panelMuted p-3">
              Stores allowed: <span className="font-medium">{data.organization.storesAllowed}</span>
            </div>
            <div className="rounded-lg border border-border bg-panelMuted p-3">
              Next payment date: <span className="font-medium">{data.organization.nextPaymentDate}</span>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <DataTable
          columns={[
            { key: 'source', header: 'Source', render: (row) => row.source },
            { key: 'sessions', header: 'Sessions', render: (row) => row.sessions.toLocaleString() },
            { key: 'conversion', header: 'Conversion', render: (row) => row.conversion }
          ]}
          rows={data.payload.referrers}
          rowKey={(row) => row.source}
        />
      </div>
    </div>
  );
}
