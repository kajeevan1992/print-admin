'use client';

import { useMemo, useState } from 'react';
import { superadminTenantDomainSeed } from '@/data/superadmin-tenant-domains';
import { TenantDomainBadge } from './tenant-domain-badge';

export function TenantDomainControlBoard() {
  const [filter, setFilter] = useState('all');

  const rows = useMemo(
    () => superadminTenantDomainSeed.filter((row) => filter === 'all' || row.status === filter),
    [filter]
  );

  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Tenant & domain control board</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Manage default subdomains, custom domains, verification, SSL, and primary-domain assignment.
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
          <option value="setup-required">Setup required</option>
          <option value="attention-needed">Attention needed</option>
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
                  {row.tenantId} · {row.plan}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TenantDomainBadge value={row.status} />
                <TenantDomainBadge value={row.domainVerification} />
                <TenantDomainBadge value={row.sslStatus} />
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Default subdomain</p>
                <p className="font-medium">{row.defaultSubdomain}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Custom domain</p>
                <p className="font-medium">{row.customDomain || 'Not connected yet'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Primary domain</p>
                <p className="font-medium">{row.primaryDomain}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Next action</p>
                <p className="font-medium">
                  {row.domainVerification === 'pending'
                    ? 'Verify DNS'
                    : row.sslStatus === 'pending'
                    ? 'Wait for SSL'
                    : row.customDomain
                    ? 'Manage mapping'
                    : 'Add custom domain'}
                </p>
              </div>
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
                Manage domain
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                Set primary
              </button>
            </div>
          </div>
        ))}

        {!rows.length ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            No tenants match the selected filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
