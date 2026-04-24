'use client';

import type { ReactNode } from 'react';
import { useTenantTheme } from '@/providers/theme-provider';
import { useStorefront } from '@/providers/storefront-provider';

export function StorefrontIsolationShell({ children }: { children: ReactNode }) {
  const { tenant, resolvedHostname, isCustomDomain } = useStorefront();
  const { tokens } = useTenantTheme();

  return (
    <div
      className="rounded-[2rem] border p-5"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-surface)',
        boxShadow: tokens.shadow.sm
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--theme-text-muted)' }}>
            Storefront isolation layer
          </p>
          <p className="mt-2 text-sm font-semibold">{tenant.storefrontTitle}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Host resolved to {resolvedHostname} · {isCustomDomain ? 'custom domain' : 'platform subdomain'}
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
          {tenant.themeKey} theme
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Mini label="Tenant" value={tenant.tenantName} />
        <Mini label="Default subdomain" value={tenant.defaultSubdomain} />
        <Mini label="Primary host" value={tenant.primaryHostname} />
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
