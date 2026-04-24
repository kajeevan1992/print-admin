
export type OwnerBillingPlanStatus = 'draft' | 'active' | 'retired';
export type OwnerBillingPlanTier = 'starter' | 'growth' | 'enterprise';

export type OwnerBillingPlanRecord = {
  id: string;
  name: string;
  tier: OwnerBillingPlanTier;
  status: OwnerBillingPlanStatus;
  monthlyPrice: number;
  annualPrice: number;
  seatLimit: number;
  storefrontLimit: number;
  apiLimit: number;
  owner: string;
  notes: string;
};

export const ownerBillingPlanSeed: OwnerBillingPlanRecord[] = [
  {
    id: 'plan-1',
    name: 'Starter',
    tier: 'starter',
    status: 'active',
    monthlyPrice: 79,
    annualPrice: 790,
    seatLimit: 10,
    storefrontLimit: 2,
    apiLimit: 50000,
    owner: 'Finance Admin',
    notes: 'Entry plan for smaller print teams and pilot stores.'
  },
  {
    id: 'plan-2',
    name: 'Growth',
    tier: 'growth',
    status: 'active',
    monthlyPrice: 249,
    annualPrice: 2490,
    seatLimit: 30,
    storefrontLimit: 5,
    apiLimit: 150000,
    owner: 'Owner Ops',
    notes: 'Mainline plan for scaling print businesses.'
  },
  {
    id: 'plan-3',
    name: 'Enterprise Custom',
    tier: 'enterprise',
    status: 'draft',
    monthlyPrice: 0,
    annualPrice: 0,
    seatLimit: 999,
    storefrontLimit: 999,
    apiLimit: 999999,
    owner: 'Platform Admin',
    notes: 'Custom commercial packaging handled through direct contracts.'
  }
];
