export type LicenseStatus = "active" | "trial" | "grace" | "paused";

export type LicenseRecord = {
  id: string;
  company: string;
  plan: string;
  status: LicenseStatus;
  seatsUsed: number;
  seatLimit: number;
  apiAccess: boolean;
  storesAllowed: number;
  renewalDate: string;
  overageRisk: "healthy" | "watch" | "critical";
  notes: string;
};

export const licensingSeed: LicenseRecord[] = [
  {
    id: 'license-1',
    company: 'Northstar Print',
    plan: 'Scale',
    status: 'active',
    seatsUsed: 18,
    seatLimit: 25,
    apiAccess: true,
    storesAllowed: 5,
    renewalDate: '2026-05-01',
    overageRisk: 'healthy',
    notes: 'Healthy account with API and multi-store enabled.'
  },
  {
    id: 'license-2',
    company: 'Blue Peak Labels',
    plan: 'Starter',
    status: 'trial',
    seatsUsed: 4,
    seatLimit: 5,
    apiAccess: false,
    storesAllowed: 1,
    renewalDate: '2026-04-28',
    overageRisk: 'watch',
    notes: 'Near seat ceiling while still in trial.'
  },
  {
    id: 'license-3',
    company: 'TradePrint Warehouse',
    plan: 'Enterprise',
    status: 'grace',
    seatsUsed: 32,
    seatLimit: 30,
    apiAccess: true,
    storesAllowed: 8,
    renewalDate: '2026-04-20',
    overageRisk: 'critical',
    notes: 'Needs commercial review before next rollout.'
  }
];
