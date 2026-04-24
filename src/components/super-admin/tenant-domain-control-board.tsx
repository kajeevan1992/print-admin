'use client';

import { useEffect, useMemo, useState } from 'react';
import { superadminTenantDomainSeed } from '@/data/superadmin-tenant-domains';
import { TenantDomainBadge } from './tenant-domain-badge';

type LiveTenantDomainRow = {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  customDomain: string;
  verificationStatus: string;
  sslStatus: string;
  status: string;
};

function normalizeTenantRows(payload: any): LiveTenantDomainRow[] {
  const raw = payload?.data?.items || payload?.data || payload?.payload?.data || payload?.payload || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((tenant: any, index: number) => {
    const domains = Array.isArray(tenant.domains) ? tenant.domains : [];
    const primaryCustom =
      domains.find((d: any) => d.type === 'CUSTOM_DOMAIN' && d.isPrimary) ||
      domains.find((d: any) => d.type === 'CUSTOM_DOMAIN') ||
      null;
    const platform =
      domains.find((d: any) => d.type === 'PLATFORM_SUBDOMAIN' && d.isPrimary) ||
      domains.find((d: any) => d.type === 'PLATFORM_SUBDOMAIN') ||
      null;

    return {
      tenantId: tenant.id || `tenant-${index + 1}`,
      tenantName: tenant.name || tenant.slug || `Tenant ${index + 1}`,
      subdomain: platform?.hostname || tenant.defaultSubdomain || `${tenant.slug || 'tenant'}.printcore.com`,
      customDomain: primaryCustom?.hostname || tenant.primaryDomain || 'Not configured',
      verificationStatus: primaryCustom?.verificationStatus || tenant.verificationStatus || 'pending',
      sslStatus: primaryCustom?.sslStatus || tenant.sslStatus || 'pending',
      status: tenant.status || 'active',
    };
  });
}

export function TenantDomainControlBoard() {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState<LiveTenantDomainRow[]>(superadminTenantDomainSeed);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Connecting to live tenants API...');

  useEffect(() => {
    let active = true;

    async function loadTenants() {
      try {
        const res = await fetch('/api/proxy/superadmin-tenants', { cache: 'no-store' });
        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.ok) {
          if (active) {
            setRows(superadminTenantDomainSeed);
            setMessage('Live tenants API is not available yet. Showing seeded tenant/domain rows.');
          }
          return;
        }

        const normalized = normalizeTenantRows(payload);
        if (active) {
          setRows(normalized.length ? normalized : superadminTenantDomainSeed);
          setMessage(
            normalized.length
              ? 'Connected to live tenant/domain data.'
              : 'Tenants API connected but returned no rows. Showing seeded tenant/domain rows.'
          );
        }
      } catch {
        if (active) {
          setRows(superadminTenantDomainSeed);
          setMessage('Could not reach the tenants API. Showing seeded tenant/domain rows.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTenants();
    return () => {
      active = false;
    };
  }, []);

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
          <p className="text-sm font-semibold">Tenant domains</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Manage platform subdomains, custom domains, verification, and SSL readiness.
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

      <div
        className="mt-4 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {loading ? 'Loading tenants...' : message}
      </div>

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
                  {row.tenantId} · Status: {row.status}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
                  Platform subdomain
                </p>
                <p className="mt-2 text-sm font-medium">{row.subdomain}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-muted)' }}>
                  Custom domain
                </p>
                <p className="mt-2 text-sm font-medium">{row.customDomain}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <TenantDomainBadge value={row.verificationStatus} />
              <TenantDomainBadge value={row.sslStatus} />
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
                Verify domain
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                Recheck SSL
              </button>
            </div>
          </div>
        ))}

        {!filteredRows.length ? (
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
