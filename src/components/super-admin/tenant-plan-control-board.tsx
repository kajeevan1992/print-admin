'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { superadminPlanLimitSeed } from '@/data/superadmin-plan-limits';
import { TenantPlanStatusBadge } from './tenant-plan-status-badge';
import { LimitUsageBar } from './limit-usage-bar';

type LivePlanRow = {
  tenantId: string;
  tenantName: string;
  status: string;
  planName: string;
  storefrontsUsed: number;
  storefrontsLimit: number;
  adminUsersUsed: number;
  adminUsersLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
  nextBillingDate: string;
};

function normalizePlanRows(payload: any): LivePlanRow[] {
  const raw = payload?.data?.items || payload?.data || payload?.payload?.data || payload?.payload || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((tenant: any, index: number) => ({
    tenantId: tenant.id || `tenant-${index + 1}`,
    tenantName: tenant.name || tenant.slug || `Tenant ${index + 1}`,
    status: tenant.status || 'active',
    planName: tenant.planName || tenant.plan?.name || 'Starter',
    storefrontsUsed: typeof tenant.storefrontsUsed === 'number' ? tenant.storefrontsUsed : 1,
    storefrontsLimit: typeof tenant.storefrontsLimit === 'number' ? tenant.storefrontsLimit : 1,
    adminUsersUsed: typeof tenant.adminUsersUsed === 'number' ? tenant.adminUsersUsed : 1,
    adminUsersLimit: typeof tenant.adminUsersLimit === 'number' ? tenant.adminUsersLimit : 3,
    storageUsedGb: typeof tenant.storageUsedGb === 'number' ? tenant.storageUsedGb : 0,
    storageLimitGb: typeof tenant.storageLimitGb === 'number' ? tenant.storageLimitGb : 10,
    nextBillingDate: tenant.nextBillingDate || tenant.billingDate || 'Not set',
  }));
}

function nextPlan(planName: string) {
  if (planName.toLowerCase().includes('starter')) return 'Growth';
  if (planName.toLowerCase().includes('growth')) return 'Scale';
  return 'Growth';
}

function nextStatus(status: string) {
  if (status === 'pending-activation') return 'active';
  if (status === 'suspended') return 'active';
  if (status === 'trial') return 'active';
  return 'suspended';
}

export function TenantPlanControlBoard() {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState<LivePlanRow[]>(superadminPlanLimitSeed);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live tenants API...');
  const [actionMessage, setActionMessage] = useState('');
  const [source, setSource] = useState<'live' | 'seed'>('seed');
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/superadmin-tenants', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        setRows(superadminPlanLimitSeed);
        setSource('seed');
        setMessage('Live tenants API is not available yet. Showing seeded plan rows.');
        return;
      }

      const normalized = normalizePlanRows(payload);
      setRows(normalized.length ? normalized : superadminPlanLimitSeed);
      setSource(normalized.length ? 'live' : 'seed');
      setMessage(
        normalized.length
          ? 'Connected to live plan and tenant data.'
          : 'Tenants API connected but returned no rows. Showing seeded plan rows.'
      );
    } catch {
      setRows(superadminPlanLimitSeed);
      setSource('seed');
      setMessage('Could not reach the tenants API. Showing seeded plan rows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  async function handlePlanChange(tenantId: string, currentPlan: string) {
    if (pendingTenantId) return;
    const planName = nextPlan(currentPlan);
    const previousRows = rows;
    setRows((current) => current.map((row) => (row.tenantId === tenantId ? { ...row, planName } : row)));
    setPendingTenantId(tenantId);
    setActionMessage(`Attempting to change ${tenantId} plan to ${planName}...`);
    try {
      const res = await fetch('/api/proxy/superadmin-tenants/plan', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, planName }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        setRows(previousRows);
        setActionMessage('Plan endpoint failed. Reverted optimistic change.');
        return;
      }
      await loadTenants();
      setActionMessage(`Tenant ${tenantId} plan changed to ${planName} and reloaded from API.`);
    } catch {
      setRows(previousRows);
      setActionMessage('Could not reach the plan endpoint. Reverted optimistic change.');
    } finally {
      setPendingTenantId(null);
    }
  }

  async function handleStatusChange(tenantId: string, currentStatus: string) {
    if (pendingTenantId) return;
    const status = nextStatus(currentStatus);
    const previousRows = rows;
    setRows((current) => current.map((row) => (row.tenantId === tenantId ? { ...row, status } : row)));
    setPendingTenantId(tenantId);
    setActionMessage(`Attempting to change ${tenantId} status to ${status}...`);
    try {
      const res = await fetch('/api/proxy/superadmin-tenants/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, status }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        setRows(previousRows);
        setActionMessage('Tenant status endpoint failed. Reverted optimistic change.');
        return;
      }
      await loadTenants();
      setActionMessage(`Tenant ${tenantId} status changed to ${status} and reloaded from API.`);
    } catch {
      setRows(previousRows);
      setActionMessage('Could not reach the tenant status endpoint. Reverted optimistic change.');
    } finally {
      setPendingTenantId(null);
    }
  }

  const filteredRows = useMemo(
    () => rows.filter((row) => filter === 'all' || row.status === filter),
    [rows, filter]
  );

  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Tenant activation & plan limits</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Track activation state, plan tier, usage caps, and billing readiness before real billing/API wiring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
          >
            Source: {source === 'live' ? 'Live API' : 'Seeded fallback'}
          </span>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            onClick={() => {
              setLoading(true);
              setActionMessage('');
              loadTenants();
            }}
          >
            Refresh
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-2xl border px-4 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--theme-border)',
              background: 'var(--theme-surface-alt)',
              color: 'var(--theme-text)',
            }}
          >
            <option value="all">All tenants</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="pending-activation">Pending activation</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div
        className="mt-4 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {loading ? 'Loading plans...' : message}
      </div>

      {actionMessage ? (
        <div
          className="mt-3 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
        >
          {actionMessage}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {filteredRows.map((row) => (
          <div
            key={row.tenantId}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{row.tenantName}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {row.tenantId} · {row.planName} · Next billing: {row.nextBillingDate}
                </p>
              </div>
              <TenantPlanStatusBadge status={row.status} />
            </div>

            <div className="mt-4 grid gap-4">
              <LimitUsageBar label="Storefronts" used={row.storefrontsUsed} limit={row.storefrontsLimit} />
              <LimitUsageBar label="Admin users" used={row.adminUsersUsed} limit={row.adminUsersLimit} />
              <LimitUsageBar label="Storage" used={row.storageUsedGb} limit={row.storageLimitGb} suffix=" GB" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
              >
                Open tenant
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                disabled={pendingTenantId === row.tenantId}
                onClick={() => handlePlanChange(row.tenantId, row.planName)}
              >
                Change plan
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
                disabled={pendingTenantId === row.tenantId}
                onClick={() => handleStatusChange(row.tenantId, row.status)}
              >
                {row.status === 'pending-activation'
                  ? 'Activate tenant'
                  : row.status === 'suspended'
                  ? 'Restore access'
                  : row.status === 'active'
                  ? 'Suspend tenant'
                  : 'Adjust limits'}
              </button>
            </div>
          </div>
        ))}

        {!filteredRows.length ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            No tenants match the selected status filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
