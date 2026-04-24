
export type OwnerUsageLimitStatus = 'healthy' | 'warning' | 'breached';
export type OwnerUsageLimitScope = 'tenant' | 'plan' | 'feature';

export type OwnerUsageLimitRecord = {
  id: string;
  tenant: string;
  scope: OwnerUsageLimitScope;
  metric: string;
  planName: string;
  currentUsage: number;
  limitValue: number;
  status: OwnerUsageLimitStatus;
  owner: string;
  notes: string;
};

export const ownerUsageLimitSeed: OwnerUsageLimitRecord[] = [
  {
    id: 'limit-1',
    tenant: 'Northstar Print',
    scope: 'tenant',
    metric: 'Active storefronts',
    planName: 'Growth',
    currentUsage: 4,
    limitValue: 5,
    status: 'warning',
    owner: 'Owner Ops',
    notes: 'One more storefront will trigger an upgrade review.'
  },
  {
    id: 'limit-2',
    tenant: 'BluePeak Mailers',
    scope: 'feature',
    metric: 'API requests / day',
    planName: 'Enterprise',
    currentUsage: 182000,
    limitValue: 250000,
    status: 'healthy',
    owner: 'Platform Admin',
    notes: 'Traffic remains within expected enterprise usage.'
  },
  {
    id: 'limit-3',
    tenant: 'PixelPress Studio',
    scope: 'plan',
    metric: 'Team seats',
    planName: 'Starter',
    currentUsage: 13,
    limitValue: 10,
    status: 'breached',
    owner: 'Finance Admin',
    notes: 'Seat overage should trigger billing follow-up.'
  }
];
