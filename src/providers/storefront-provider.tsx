'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { resolveStorefrontTenantByHostname, type StorefrontTenantConfig } from '@/storefront/tenant-storefront-config';

type StorefrontContextValue = {
  tenant: StorefrontTenantConfig;
  resolvedHostname: string;
  isCustomDomain: boolean;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({
  children,
  hostname
}: {
  children: ReactNode;
  hostname?: string | null;
}) {
  const value = useMemo<StorefrontContextValue>(() => {
    const resolvedTenant = resolveStorefrontTenantByHostname(hostname);
    const resolvedHostname = hostname || resolvedTenant.primaryHostname;
    const isCustomDomain = resolvedTenant.domains.some(
      (domain) => domain.hostname === resolvedHostname && domain.type === 'custom-domain'
    );

    return {
      tenant: resolvedTenant,
      resolvedHostname,
      isCustomDomain
    };
  }, [hostname]);

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error('useStorefront must be used inside StorefrontProvider');
  }
  return context;
}
