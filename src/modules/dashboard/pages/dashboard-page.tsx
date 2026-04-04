'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { DataTable } from '@/components/data-table/data-table';
import { LineChartCard } from '@/components/charts/line-chart-card';
import { PieChartCard } from '@/components/charts/pie-chart-card';
import { dashboardService, type DashboardPayload } from '@/services/dashboard.service';
import { EmptyState } from '@/components/ui/empty-state';

type StoreItem = DashboardPayload['stores'][number];
type KpiItem = DashboardPayload['kpis'][number];
type RangeOption = {
  id: string;
  label: string;
  helper: string;
  granularity: 'hourly' | 'daily' | 'monthly';
};

type VisitorsMode = 'sales' | 'sessions';

const DASHBOARD_STORE_KEY = 'print-admin.dashboard.store';
const DASHBOARD_RANGE_KEY = 'print-admin.dashboard.range';
const DASHBOARD_COMPARE_KEY = 'print-admin.dashboard.compare';

const rangeOptions: RangeOption[] = [
  { id: 'today', label: 'Today', helper: 'Current day only', granularity: 'hourly' },
  { id: 'yesterday', label: 'Yesterday', helper: 'Previous day only', granularity: 'hourly' },
  { id: 'last-7-days', label: 'Last 7 Days', helper: 'Rolling 7-day window', granularity: 'daily' },
  { id: 'last-30-days', label: 'Last 30 Days', helper: 'Rolling 30-day window', granularity: 'daily' },
  { id: 'last-90-days', label: 'Last 90 Days', helper: 'Rolling 90-day window', granularity: 'daily' },
  { id: 'month-to-date', label: 'Month to Date', helper: 'From the 1st until today', granularity: 'daily' },
  { id: 'year-to-date', label: 'Year to Date', helper: 'January 1 until today', granularity: 'monthly' },
  { id: 'last-year', label: 'Last Year', helper: 'Rolling 365-day window', granularity: 'monthly' }
];

function DashboardKpiGrid({ kpis }: { kpis: KpiItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.id} className="p-4 transition hover:border-slate-600">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-textMuted">{kpi.label}</p>
              <h3 className="mt-3 text-4xl font-semibold tracking-tight">{kpi.value}</h3>
              <p className="mt-2 text-sm text-textMuted">{kpi.hint}</p>
            </div>

            <div className="rounded-full border border-border px-3 py-2 text-sm text-text">
              {kpi.change}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StoreSwitcher({
  stores,
  selectedStoreId,
  onChange
}: {
  stores: StoreItem[];
  selectedStoreId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const active = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? stores[0],
    [stores, selectedStoreId]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-w-[280px] items-center justify-between rounded-xl border border-border bg-panel px-4 py-3 text-left"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-textMuted">
            Change Store
          </p>
          <p className="mt-1 text-sm font-medium text-text">
            {active?.name} · {active?.status} · {active?.plan}
          </p>
        </div>
        <ChevronDown size={16} className="text-textMuted" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
          {stores.map((store) => {
            const selected = store.id === selectedStoreId;

            return (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  onChange(store.id);
                  setOpen(false);
                }}
                className={`w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-panelMuted ${
                  selected ? 'bg-panelMuted' : ''
                }`}
              >
                <p className="text-sm font-medium text-text">{store.name}</p>
                <p className="mt-1 text-xs text-textMuted">
                  {store.domain} · {store.plan}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PlanSummaryCard({
  planName,
  billingCycle,
  subscriptionStatus,
  supportTier,
  nextPaymentDate,
  storesUsed,
  storesAllowed,
  apiUsageUsed,
  apiUsageLimit
}: {
  planName: string;
  billingCycle: string;
  subscriptionStatus: string;
  supportTier: string;
  nextPaymentDate: string;
  storesUsed: number;
  storesAllowed: number;
  apiUsageUsed: number;
  apiUsageLimit: number;
}) {
  const usagePercent = Math.min(
    100,
    Math.round((apiUsageUsed / Math.max(apiUsageLimit, 1)) * 100)
  );
  const storesPercent = Math.min(
    100,
    Math.round((storesUsed / Math.max(storesAllowed, 1)) * 100)
  );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-textMuted">Plan Info</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{planName}</h2>
          <p className="mt-1 text-sm text-textMuted">
            {billingCycle} · {subscriptionStatus} · Support: {supportTier}
          </p>
        </div>

        <Button>Manage Plan</Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panelMuted p-4">
          <p className="text-xs uppercase text-textMuted">Next Payment</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{nextPaymentDate}</p>
        </div>

        <div className="rounded-xl border border-border bg-panelMuted p-4">
          <p className="text-xs uppercase text-textMuted">Stores Used</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {storesUsed} / {storesAllowed}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-cyan-400"
              style={{ width: `${storesPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-panelMuted p-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs uppercase text-textMuted">API Usage</p>
          <p className="text-sm text-textMuted">
            {apiUsageUsed.toLocaleString()} / {apiUsageLimit.toLocaleString()}
          </p>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-violet-300"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

function VisitorsOverviewCard({
  title,
  mode,
  onModeChange,
  currentValue,
  currentChange,
  compareEnabled,
  compareLabel,
  series
}: {
  title: string;
  mode: VisitorsMode;
  onModeChange: (mode: VisitorsMode) => void;
  currentValue: string;
  currentChange: string;
  compareEnabled: boolean;
  compareLabel: string;
  series: Array<{ label: string; value: number }>;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-textMuted">Visitors Overview</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 text-sm text-textMuted">
            {compareEnabled ? `${currentChange} vs previous period` : compareLabel}
          </p>
        </div>

        <div className="flex rounded-xl border border-border bg-panelMuted p-1">
          <button
            type="button"
            onClick={() => onModeChange('sessions')}
            className={`rounded-lg px-3 py-2 text-sm ${mode === 'sessions' ? 'bg-panel text-text' : 'text-textMuted'}`}
          >
            User Sessions
          </button>
          <button
            type="button"
            onClick={() => onModeChange('sales')}
            className={`rounded-lg px-3 py-2 text-sm ${mode === 'sales' ? 'bg-panel text-text' : 'text-textMuted'}`}
          >
            Total Sales
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight">{currentValue}</p>
          <p className="mt-2 text-sm text-textMuted">{currentChange}</p>
        </div>
        {compareEnabled ? (
          <div className="rounded-full border border-border px-3 py-2 text-sm text-text">
            Comparing previous period
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <LineChartCard title={mode === 'sales' ? 'Revenue Trend' : 'Session Trend'} data={series} />
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedRangeId, setSelectedRangeId] = useState('last-30-days');
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [visitorsMode, setVisitorsMode] = useState<VisitorsMode>('sales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStore = window.localStorage.getItem(DASHBOARD_STORE_KEY);
    const savedRange = window.localStorage.getItem(DASHBOARD_RANGE_KEY);
    const savedCompare = window.localStorage.getItem(DASHBOARD_COMPARE_KEY);

    if (savedStore) setSelectedStoreId(savedStore);
    if (savedRange && rangeOptions.some((item) => item.id === savedRange)) {
      setSelectedRangeId(savedRange);
    }
    if (savedCompare) setCompareEnabled(savedCompare === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedStoreId) window.localStorage.setItem(DASHBOARD_STORE_KEY, selectedStoreId);
    window.localStorage.setItem(DASHBOARD_RANGE_KEY, selectedRangeId);
    window.localStorage.setItem(DASHBOARD_COMPARE_KEY, String(compareEnabled));
  }, [selectedStoreId, selectedRangeId, compareEnabled]);

  const loadDashboard = useCallback(async () => {
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
  }, [selectedStoreId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const selectedStore = useMemo(() => {
    if (!payload) return null;
    return payload.stores.find((store) => store.id === selectedStoreId) ?? payload.stores[0] ?? null;
  }, [payload, selectedStoreId]);

  const selectedRange = useMemo(
    () => rangeOptions.find((item) => item.id === selectedRangeId) ?? rangeOptions[3],
    [selectedRangeId]
  );

  const sessionsSeries = useMemo(
    () => (payload?.salesSeries ?? []).map((item, index) => ({ label: item.label, value: 1200 + index * 140 + Math.round(item.value / 30) })),
    [payload]
  );

  const visitorsValue = useMemo(() => {
    if (visitorsMode === 'sales') return '£22,910';
    return '8,642';
  }, [visitorsMode]);

  const visitorsChange = useMemo(() => {
    if (visitorsMode === 'sales') return '+6.8%';
    return '+4.2%';
  }, [visitorsMode]);

  const conversionBreakdown = useMemo(
    () => [
      { name: 'Added to Cart', value: 58 },
      { name: 'Reached Checkout', value: 31 },
      { name: 'Converted', value: 11 }
    ],
    []
  );

  if (loading) return <Card>Loading dashboard metrics...</Card>;
  if (error) return <Card className="text-red-300">{error}</Card>;
  if (!payload) return <EmptyState title="No dashboard data" description="Try refreshing to load metrics." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your print SaaS control center across stores, billing, operations, and performance."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StoreSwitcher stores={payload.stores} selectedStoreId={selectedStoreId} onChange={setSelectedStoreId} />

            <label className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-3 text-sm text-textMuted">
              <span>Date Range</span>
              <select
                value={selectedRangeId}
                onChange={(event) => setSelectedRangeId(event.target.value)}
                className="bg-transparent text-text outline-none"
              >
                {rangeOptions.map((option) => (
                  <option key={option.id} value={option.id} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-3 text-sm text-textMuted">
              <input
                type="checkbox"
                checked={compareEnabled}
                onChange={(event) => setCompareEnabled(event.target.checked)}
              />
              Compare with previous period
            </label>

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
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{selectedStore?.name ?? '—'}</h2>
          <p className="mt-1 text-sm text-textMuted">{selectedStore?.domain ?? '—'}</p>

          <div className="mt-4 rounded-xl border border-border bg-panelMuted p-4">
            <p className="text-xs uppercase text-textMuted">Applied Range</p>
            <p className="mt-2 text-xl font-semibold">{selectedRange.label}</p>
            <p className="mt-1 text-sm text-textMuted">
              {selectedRange.helper} · {selectedRange.granularity}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Organization</p>
              <p className="mt-2 text-xl font-semibold">{selectedStore?.organization ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Status</p>
              <p className="mt-2 text-xl font-semibold">{selectedStore?.status ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Theme</p>
              <p className="mt-2 text-xl font-semibold">{selectedStore?.theme ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Plan</p>
              <p className="mt-2 text-xl font-semibold">{selectedStore?.plan ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Locale</p>
              <p className="mt-2 text-xl font-semibold">{selectedStore?.locale ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-panelMuted p-4">
              <p className="text-xs text-textMuted">Currency</p>
              <p className="mt-2 text-xl font-semibold">{selectedStore?.currency ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      <DashboardKpiGrid kpis={payload.kpis} />

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
        <VisitorsOverviewCard
          title={visitorsMode === 'sales' ? 'Total Sales' : 'User Sessions'}
          mode={visitorsMode}
          onModeChange={setVisitorsMode}
          currentValue={visitorsValue}
          currentChange={visitorsChange}
          compareEnabled={compareEnabled}
          compareLabel={`${selectedRange.label} · ${selectedRange.granularity}`}
          series={visitorsMode === 'sales' ? payload.salesSeries : sessionsSeries}
        />
        <PieChartCard title="Conversion Rate Funnel" data={conversionBreakdown} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
        <LineChartCard title="Orders Trend" data={payload.ordersSeries} />
        <PieChartCard title="API Usage Split" data={payload.apiUsage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
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
              Next payment date: <span className="font-semibold">{payload.organization.nextPaymentDate}</span>
            </div>
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
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <DataTable
            columns={[
              { key: 'source', header: 'Source', render: (row) => row.source },
              { key: 'sessions', header: 'Sessions', render: (row) => row.sessions.toLocaleString() },
              { key: 'conversion', header: 'Conversion', render: (row) => row.conversion }
            ]}
            rows={payload.referrers}
            rowKey={(row) => row.source}
          />
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase text-textMuted">Dashboard Notes</p>
          <h3 className="mt-1 text-3xl font-semibold tracking-tight">What this gives you</h3>
          <ul className="mt-5 space-y-3 text-sm text-textMuted">
            <li>• One place to switch between multiple stores.</li>
            <li>• Plan visibility with next billing date and site usage.</li>
            <li>• Date filtering and comparison-ready reporting controls.</li>
            <li>• Fast access to products, quotes, orders, and user management.</li>
            <li>• Operational alerts and system health in the same view.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
