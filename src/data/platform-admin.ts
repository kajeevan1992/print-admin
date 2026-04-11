import type { ApiAccessProfile, ApiKeyRecord, MerchantAccount, OrganizationRecord } from '@/modules/settings/types';

export const apiAccessProfilesMock: ApiAccessProfile[] = [
  {
    id: 'acc-1',
    name: 'Primary Storefront Access',
    status: 'active',
    owner: 'Platform Team',
    enabled: true,
    contact: 'platform@example.com',
    reference: 'ACC-001',
    reviewCycle: 'Monthly',
    notes: 'Used for storefront integrations, webhook consumers, and reporting sync.',
    allowedScopes: ['catalog:read', 'orders:read', 'orders:write', 'customers:read'],
    environments: ['production', 'staging'],
    rateLimitPerMinute: 600,
    ipAllowList: '10.0.0.0/24, 172.16.8.14',
    webhookEnabled: true,
    lastSaved: '2026-04-05 11:42'
  },
  {
    id: 'acc-2',
    name: 'Partner Fulfillment Access',
    status: 'draft',
    owner: 'Operations',
    enabled: false,
    contact: 'ops@example.com',
    reference: 'ACC-014',
    reviewCycle: 'Quarterly',
    notes: 'Reserved for production partner callback access.',
    allowedScopes: ['orders:read', 'production:write'],
    environments: ['staging'],
    rateLimitPerMinute: 120,
    ipAllowList: '',
    webhookEnabled: false,
    lastSaved: '2026-04-02 09:18'
  }
];

export const apiKeysMock: ApiKeyRecord[] = [
  {
    id: 'key-1',
    name: 'Public Storefront Key',
    type: 'public',
    environment: 'production',
    status: 'active',
    prefix: 'pk_live_4d39',
    scopes: ['catalog:read', 'pricing:read'],
    lastUsedAt: '2026-04-05 14:22',
    expiresAt: '',
    createdAt: '2026-03-28',
    owner: 'Headless Storefront',
    notes: 'Used by the primary frontend app.'
  },
  {
    id: 'key-2',
    name: 'Fulfillment Callback Key',
    type: 'secret',
    environment: 'production',
    status: 'restricted',
    prefix: 'sk_live_9a12',
    scopes: ['orders:read', 'orders:write', 'production:write'],
    lastUsedAt: '2026-04-04 17:31',
    expiresAt: '2026-06-30',
    createdAt: '2026-03-15',
    owner: 'Vendor Ops',
    notes: 'Locked to webhook sender IPs.'
  },
  {
    id: 'key-3',
    name: 'Analytics Read-only Key',
    type: 'secret',
    environment: 'staging',
    status: 'inactive',
    prefix: 'sk_test_a4f1',
    scopes: ['analytics:read'],
    lastUsedAt: '2026-03-21 10:02',
    expiresAt: '',
    createdAt: '2026-02-10',
    owner: 'BI Team',
    notes: 'Can be reactivated if staging dashboards are re-enabled.'
  }
];

export const organizationsMock: OrganizationRecord[] = [
  {
    id: 'org-1',
    name: 'Northwind Healthcare',
    code: 'NWH',
    status: 'active',
    primaryContact: 'lucy@nwh.example',
    storefronts: ['US Main Store'],
    collections: ['Healthcare Essentials', 'Corporate Templates'],
    userGroups: ['Northwind Admins', 'Northwind Buyers'],
    billingModel: 'invoice',
    notes: 'Requires PO number at checkout.',
    createdAt: '2026-01-12'
  },
  {
    id: 'org-2',
    name: 'Acme Corporate',
    code: 'ACME',
    status: 'active',
    primaryContact: 'it@acme.example',
    storefronts: ['B2B Wholesale API'],
    collections: ['Sales Collateral'],
    userGroups: ['Acme Marketing'],
    billingModel: 'card',
    notes: 'Custom branded collection for regional teams.',
    createdAt: '2026-02-01'
  }
];

export const merchantAccountsMock: MerchantAccount[] = [
  {
    id: 'mer-1',
    name: 'Stripe Primary',
    provider: 'Stripe',
    status: 'active',
    mode: 'live',
    settlementCurrency: 'USD',
    merchantId: 'acct_1PXM0XX',
    supportedMethods: ['Card', 'Apple Pay', 'Google Pay'],
    feeProfile: '2.9% + 30c',
    payoutSchedule: 'Daily',
    owner: 'Finance',
    notes: 'Main default gateway for all direct card transactions.'
  },
  {
    id: 'mer-2',
    name: 'Invoice / BACS',
    provider: 'Offline',
    status: 'active',
    mode: 'live',
    settlementCurrency: 'GBP',
    merchantId: 'offline-bacs',
    supportedMethods: ['Invoice', 'Bank Transfer'],
    feeProfile: 'Manual',
    payoutSchedule: 'Manual settlement',
    owner: 'Accounts Receivable',
    notes: 'Used for approved organizations and large account orders.'
  }
];
