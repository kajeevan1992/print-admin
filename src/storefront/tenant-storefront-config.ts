export type StorefrontDomainConfig = {
  hostname: string;
  isPrimary?: boolean;
  verified?: boolean;
  type: 'platform-subdomain' | 'custom-domain';
};

export type StorefrontTenantConfig = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  defaultSubdomain: string;
  primaryHostname: string;
  domains: StorefrontDomainConfig[];
  themeKey: 'base' | 'business' | 'minimal' | 'luxury';
  storefrontTitle: string;
  storefrontDescription: string;
  supportEmail: string;
};

export const demoStorefrontTenants: StorefrontTenantConfig[] = [
  {
    tenantId: 'tenant-user1',
    tenantName: 'User 1 Print',
    tenantSlug: 'user1',
    defaultSubdomain: 'user1.printcore.com',
    primaryHostname: 'www.user1.com',
    domains: [
      { hostname: 'user1.printcore.com', isPrimary: false, verified: true, type: 'platform-subdomain' },
      { hostname: 'www.user1.com', isPrimary: true, verified: true, type: 'custom-domain' }
    ],
    themeKey: 'business',
    storefrontTitle: 'User 1 Print Storefront',
    storefrontDescription: 'White-label storefront preview using tenant-aware config.',
    supportEmail: 'support@user1.com'
  },
  {
    tenantId: 'tenant-demo',
    tenantName: 'Printcore Demo Store',
    tenantSlug: 'demo',
    defaultSubdomain: 'demo.printcore.com',
    primaryHostname: 'demo.printcore.com',
    domains: [
      { hostname: 'demo.printcore.com', isPrimary: true, verified: true, type: 'platform-subdomain' }
    ],
    themeKey: 'base',
    storefrontTitle: 'Printcore Demo Storefront',
    storefrontDescription: 'Default storefront tenant for internal testing.',
    supportEmail: 'support@printcore.com'
  }
];

export function resolveStorefrontTenantByHostname(hostname?: string | null) {
  const normalized = (hostname ?? '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  if (!normalized) {
    return demoStorefrontTenants.find((tenant) => tenant.tenantSlug === 'demo') ?? demoStorefrontTenants[0];
  }

  const exact = demoStorefrontTenants.find((tenant) =>
    tenant.domains.some((domain) => domain.hostname.toLowerCase() === normalized)
  );

  if (exact) return exact;

  const bySlug = demoStorefrontTenants.find((tenant) => normalized.startsWith(`${tenant.tenantSlug}.`));
  return bySlug ?? demoStorefrontTenants.find((tenant) => tenant.tenantSlug === 'demo') ?? demoStorefrontTenants[0];
}
