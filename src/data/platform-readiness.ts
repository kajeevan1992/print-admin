export type ReadinessDomain = {
  id: string;
  title: string;
  description: string;
  status: 'ready-to-design' | 'frontend-complete' | 'needs-backend';
  items: string[];
};

export type ApiModuleReadiness = {
  id: string;
  module: string;
  scope: string;
  status: 'next' | 'planned' | 'later';
};

export const readinessDomains: ReadinessDomain[] = [
  {
    id: 'tenancy',
    title: 'Tenancy & domains',
    description: 'Tenants, subdomains, custom domains, routing, verification, and primary-domain logic.',
    status: 'ready-to-design',
    items: ['tenants', 'domains', 'theme assignment', 'hostname resolution', 'redirect rules']
  },
  {
    id: 'catalog',
    title: 'Catalog & pricing',
    description: 'Products, variants, pricing, quote-led products, and storefront assignment.',
    status: 'frontend-complete',
    items: ['products', 'variants', 'pricing rules', 'category mapping', 'quote products']
  },
  {
    id: 'orders',
    title: 'Orders & lifecycle',
    description: 'Checkout output, order creation, status history, lifecycle states, and dispatch events.',
    status: 'needs-backend',
    items: ['orders', 'order items', 'status history', 'dispatch events', 'customer timeline']
  },
  {
    id: 'artwork',
    title: 'Artwork & approvals',
    description: 'Uploads, versions, attachment to orders, preflight states, and approval actions.',
    status: 'needs-backend',
    items: ['uploads', 'artwork versions', 'approval states', 'preflight checks', 'review notes']
  },
  {
    id: 'plans',
    title: 'Plans & access',
    description: 'Subscription tiers, trial/activation, limits, suspension, and usage enforcement.',
    status: 'ready-to-design',
    items: ['plans', 'limits', 'usage tracking', 'activation hooks', 'billing sync']
  }
];

export const apiReadinessModules: ApiModuleReadiness[] = [
  { id: 'api-auth', module: '/api/auth', scope: 'login, sessions, roles', status: 'next' },
  { id: 'api-tenant', module: '/api/tenant', scope: 'tenant lookup, domains, themes', status: 'next' },
  { id: 'api-products', module: '/api/products', scope: 'catalog, variants, pricing', status: 'planned' },
  { id: 'api-orders', module: '/api/orders', scope: 'checkout output, creation, lifecycle', status: 'planned' },
  { id: 'api-artwork', module: '/api/artwork', scope: 'uploads, review, approvals', status: 'planned' },
  { id: 'api-admin', module: '/api/admin', scope: 'internal order controls, QA, dispatch', status: 'later' },
  { id: 'api-superadmin', module: '/api/superadmin', scope: 'plans, domains, activation, usage', status: 'later' }
];
