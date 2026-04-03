'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { DataTable } from '@/components/data-table/data-table';
import { LineChartCard } from '@/components/charts/line-chart-card';
import { PieChartCard } from '@/components/charts/pie-chart-card';
import { dashboardService, type DashboardPayload } from '@/services/dashboard.service';
import { EmptyState } from '@/components/ui/empty-state';
import { StoreSwitcher } from '@/modules/dashboard/components/store-switcher';
import { PlanSummaryCard } from '@/modules/dashboard/components/plan-summary-card';
import { DashboardKpiGrid } from '@/modules/dashboard/components/dashboard-kpi-grid';

export function DashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dashboardService.getDashboardMetrics();
      setPayload(response.data);

      if (!selectedStoreId && response.data.stores.length > 0) {
        setSelectedStoreId(response.data.stores[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const selectedStore = useMemo(() => {
    if (!payload) return null;
    return (
      payload.stores.find((store) => store.id === selectedStoreId) ??
      payload.stores[0] ??
      null
    );
  }, [payload, selectedStoreId]);

  if (loading) return <Card>Loading dashboard metrics...</Card>;
  if (error) return <Card className="text-red-300">{error}</Card>;
  if (!payload) {
    return <EmptyState title="No dashboard data" description="Try refreshing to load metrics." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your print SaaS control center across stores, billing, operations, and performance."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StoreSwitcher
              stores={payload.stores}
              selectedStoreId={selectedStoreId}
              onChange={setSelectedStoreId}
            />
            <Button>Last 30 Days</Button>
            <Button onClick={() => void loadDashboard()}>Refresh</Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
        <PlanSummaryCard
          planName={payload.organization.planName}
          billingCycle={payload.organization.billingCycle}
          subscriptionStatus={payload.organization.subscriptionStatus}
          supportTier={payload.organization.supportTier}
          nextPaymentDate={payload.organization.nextPaymentDate}
          storesUsed={payload.organization.storesUsed}
          storesAllowed={payload.organization.storesAllowed}
          apiUsageUsed={payload.organization.apiUsageUsed}
          apiUsageLimit={payload.organization.apiUsageLimit}
        />

        <Card className="p-5">
          <p className="text-xs uppercase text-textMuted">Store Overview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            {selectedStore?.name ?? '—'}
          </h2>
          <p className="mt-1 text-sm text-textMuted">{selectedStore?.domain ?? '—'}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Organization</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedStore?.organization ?? '—'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Status</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedStore?.status ?? '—'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Theme</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedStore?.theme ?? '—'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Plan</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedStore?.plan ?? '—'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Locale</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedStore?.locale ?? '—'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Currency</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedStore?.currency ?? '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <DashboardKpiGrid kpis={payload.kpis} />

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
        <LineChartCard title="Sales Trend" data={payload.salesSeries} />
        <PieChartCard title="API Usage Split" data={payload.apiUsage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
        <LineChartCard title="Orders Trend" data={payload.ordersSeries} />

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-textMuted">Alerts</p>
              <h3 className="mt-1 text-3xl font-semibold tracking-tight">Action Center</h3>
            </div>
            <Button>View All</Button>
          </div>

          <div className="space-y-3">
            {payload.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${
                  alert.tone === 'warning'
                    ? 'border-amber-700/60 bg-amber-500/10'
                    : 'border-cyan-700/60 bg-cyan-500/10'
                }`}
              >
                <p className="text-xl font-semibold">{alert.title}</p>
                <p className="mt-2 text-sm text-textMuted">{alert.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]">
        <Card className="p-5">
          <p className="text-xs uppercase text-textMuted">Quick Actions</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight">Common Tasks</h3>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {payload.quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-xl border border-border bg-panelMuted px-4 py-5 text-lg font-medium hover:border-slate-600"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase text-textMuted">Business Health</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight">System Status</h3>

          <div className="mt-5 space-y-3">
            {payload.health.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-border bg-panelMuted px-4 py-4"
              >
                <span className="text-xl">{item.label}</span>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase text-textMuted">Store Usage Snapshot</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight">Usage</h3>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-border bg-panelMuted px-4 py-4 text-lg">
              Site name: <span className="font-semibold">{payload.organization.siteName}</span>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted px-4 py-4 text-lg">
              Stores used: <span className="font-semibold">{payload.organization.storesUsed}</span>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted px-4 py-4 text-lg">
              Stores allowed: <span className="font-semibold">{payload.organization.storesAllowed}</span>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted px-4 py-4 text-lg">
              Next payment date:{' '}
              <span className="font-semibold">{payload.organization.nextPaymentDate}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <p className="text-xs uppercase text-textMuted">Recent Activity</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight">Updates</h3>

          <div className="mt-5 space-y-3">
            {payload.activity.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-panelMuted px-4 py-4 text-lg"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <DataTable
            columns={[
              { key: 'source', header: 'Source', render: (row) => row.source },
              {
                key: 'sessions',
                header: 'Sessions',
                render: (row) => row.sessions.toLocaleString()
              },
              { key: 'conversion', header: 'Conversion', render: (row) => row.conversion }
            ]}
            rows={payload.referrers}
            rowKey={(row) => row.source}
          />
        </Card>
      </div>
    </div>
  );
}
