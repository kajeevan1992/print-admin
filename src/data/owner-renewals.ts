
export type OwnerRenewalStatus = 'on-track' | 'at-risk' | 'renewed';
export type OwnerRenewalScope = 'tenant' | 'plan' | 'contract';

export type OwnerRenewalRecord = {
  id: string;
  tenant: string;
  scope: OwnerRenewalScope;
  status: OwnerRenewalStatus;
  renewalDate: string;
  contractValue: string;
  owner: string;
  nextAction: string;
  summary: string;
};

export const ownerRenewalSeed: OwnerRenewalRecord[] = [
  {
    id: 'renewal-1',
    tenant: 'Northstar Print',
    scope: 'contract',
    status: 'on-track',
    renewalDate: '2026-05-15',
    contractValue: '£24,000 ARR',
    owner: 'Owner Ops',
    nextAction: 'Confirm expansion seat proposal',
    summary: 'Healthy renewal path with expansion discussion already in progress.'
  },
  {
    id: 'renewal-2',
    tenant: 'BluePeak Mailers',
    scope: 'plan',
    status: 'at-risk',
    renewalDate: '2026-04-28',
    contractValue: '£8,400 ARR',
    owner: 'Finance Admin',
    nextAction: 'Resolve invoice concern before call',
    summary: 'Renewal risk increased after billing follow-up and delayed customer reply.'
  },
  {
    id: 'renewal-3',
    tenant: 'PixelPress Studio',
    scope: 'tenant',
    status: 'renewed',
    renewalDate: '2026-04-05',
    contractValue: '£3,600 ARR',
    owner: 'Support Admin',
    nextAction: 'Schedule onboarding check-in',
    summary: 'Renewal completed with a short-term success plan for launch readiness.'
  }
];
