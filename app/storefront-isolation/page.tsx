'use client';

import { useEffect } from 'react';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { StorefrontIsolationShell } from '@/components/storefront/storefront-isolation-shell';
import { StorefrontProvider, useStorefront } from '@/providers/storefront-provider';
import { useTenantTheme } from '@/providers/theme-provider';

function InnerPage() {
  const { tenant } = useStorefront();
  const { setTenantThemeConfig } = useTenantTheme();

  useEffect(() => {
    setTenantThemeConfig({ themeKey: tenant.themeKey, tenantName: tenant.tenantName });
  }, [tenant, setTenantThemeConfig]);

  return (
    <PublicStorefrontLayout announcement="v123 storefront isolation layer is now live and ready for tenant/subdomain/custom-domain rendering later.">
      <StorefrontSection
        eyebrow="Architecture"
        title="Storefront isolation layer"
        body="This is the first step toward treating the customer storefront as a standalone tenant-facing frontend, even while it still lives in the same codebase during development."
      >
        <StorefrontIsolationShell>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
              <p className="text-sm font-semibold">What is isolated now</p>
              <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• host-aware tenant resolution</p>
                <p>• storefront-specific provider</p>
                <p>• tenant theme selection hook</p>
                <p>• subdomain/custom-domain model</p>
              </div>
            </div>
            <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
              <p className="text-sm font-semibold">What comes next</p>
              <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• upload artwork flow</p>
                <p>• template flows</p>
                <p>• storefront routing refinement</p>
                <p>• real tenant/domain API wiring</p>
              </div>
            </div>
            <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
              <p className="text-sm font-semibold">Production direction</p>
              <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• printcore.com for SaaS</p>
                <p>• printcore.com/dashboard for clients</p>
                <p>• printcore.com/superadmin for platform control</p>
                <p>• userX.printcore.com || custom domains for storefronts</p>
              </div>
            </div>
          </div>
        </StorefrontIsolationShell>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}

export default function StorefrontIsolationPage() {
  return (
    <StorefrontProvider hostname="user1.printcore.com">
      <InnerPage />
    </StorefrontProvider>
  );
}
