'use client';

import { useMemo, useState } from 'react';
import { superadminPlanLimitSeed } from '@/data/superadmin-plan-limits';
import { TenantPlanStatusBadge } from './tenant-plan-status-badge';
import { LimitUsageBar } from './limit-usage-bar';

export function TenantPlanControlBoard() {
  const [filter, setFilter] = useState('all');

  const rows = useMemo(
    () => superadminPlanLimitSeed.filter((row) => filter === 'all' || row.status === filter),
    [filter]
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

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-2xl border px-4 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
        >
          <option value="all">All tenants</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="pending-activation">Pending activation</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
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
              >
                Change plan
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                {row.status === 'pending-activation' ? 'Activate tenant' : row.status === 'suspended' ? 'Restore access' : 'Adjust limits'}
              </button>
            </div>
          </div>
        ))}

        {!rows.length ? (
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
