
export type OwnerCustomerHealthStatus = 'healthy' | 'watch' | 'at-risk';
export type OwnerCustomerHealthScope = 'adoption' | 'billing' | 'operations';

export type OwnerCustomerHealthRecord = {
  id: string;
  tenant: string;
  scope: OwnerCustomerHealthScope;
  status: OwnerCustomerHealthStatus;
  score: number;
  primaryRisk: string;
  lastTouchpoint: string;
  owner: string;
  summary: string;
};

export const ownerCustomerHealthSeed: OwnerCustomerHealthRecord[] = [
  {
    id: 'health-1',
    tenant: 'Northstar Print',
    scope: 'adoption',
    status: 'healthy',
    score: 87,
    primaryRisk: 'Low training demand',
    lastTouchpoint: '2026-04-12',
    owner: 'Owner Ops',
    summary: 'Strong product adoption with regular storefront activity and stable admin usage.'
  },
  {
    id: 'health-2',
    tenant: 'BluePeak Mailers',
    scope: 'billing',
    status: 'watch',
    score: 63,
    primaryRisk: 'Pending invoice follow-up',
    lastTouchpoint: '2026-04-11',
    owner: 'Finance Admin',
    summary: 'Usage is steady but billing follow-up is needed before the next renewal cycle.'
  },
  {
    id: 'health-3',
    tenant: 'PixelPress Studio',
    scope: 'operations',
    status: 'at-risk',
    score: 42,
    primaryRisk: 'Launch blockers remain open',
    lastTouchpoint: '2026-04-10',
    owner: 'Support Admin',
    summary: 'Operational readiness is slipping due to unresolved onboarding and environment issues.'
  }
];
