export type TenantPlanStatus = 'active' | 'trial' | 'suspended' | 'pending-activation';

export type TenantPlanLimitRecord = {
  tenantId: string;
  tenantName: string;
  status: TenantPlanStatus;
  planName: string;
  storefrontsUsed: number;
  storefrontsLimit: number;
  adminUsersUsed: number;
  adminUsersLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
  nextBillingDate: string;
};

export const superadminPlanLimitSeed: TenantPlanLimitRecord[] = [
  {
    tenantId: 'tenant-001',
    tenantName: 'User 1 Print',
    status: 'active',
    planName: 'Growth',
    storefrontsUsed: 1,
    storefrontsLimit: 3,
    adminUsersUsed: 4,
    adminUsersLimit: 8,
    storageUsedGb: 12,
    storageLimitGb: 50,
    nextBillingDate: '2026-05-01'
  },
  {
    tenantId: 'tenant-002',
    tenantName: 'BluePeak Events',
    status: 'trial',
    planName: 'Starter',
    storefrontsUsed: 1,
    storefrontsLimit: 1,
    adminUsersUsed: 2,
    adminUsersLimit: 3,
    storageUsedGb: 3,
    storageLimitGb: 10,
    nextBillingDate: '2026-04-24'
  },
  {
    tenantId: 'tenant-003',
    tenantName: 'Northstar Print',
    status: 'pending-activation',
    planName: 'Pro',
    storefrontsUsed: 0,
    storefrontsLimit: 5,
    adminUsersUsed: 1,
    adminUsersLimit: 15,
    storageUsedGb: 0,
    storageLimitGb: 100,
    nextBillingDate: 'Awaiting activation'
  },
  {
    tenantId: 'tenant-004',
    tenantName: 'Studio Mail Co',
    status: 'suspended',
    planName: 'Starter',
    storefrontsUsed: 1,
    storefrontsLimit: 1,
    adminUsersUsed: 3,
    adminUsersLimit: 3,
    storageUsedGb: 9,
    storageLimitGb: 10,
    nextBillingDate: 'Past due'
  }
];
