
export type OwnerAccountPlanStatus = 'draft' | 'active' | 'completed';
export type OwnerAccountPlanScope = 'growth' | 'retention' | 'launch';

export type OwnerAccountPlanRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerAccountPlanScope;
  status: OwnerAccountPlanStatus;
  owner: string;
  targetDate: string;
  keyOutcome: string;
  summary: string;
};

export const ownerAccountPlanSeed: OwnerAccountPlanRecord[] = [
  {
    id: 'account-plan-1',
    tenant: 'Northstar Print',
    title: 'Northstar growth account plan',
    scope: 'growth',
    status: 'active',
    owner: 'Owner Ops',
    targetDate: '2026-05-12',
    keyOutcome: 'Expand storefront footprint',
    summary: 'Growth plan focused on expansion, executive alignment, and deeper team adoption.'
  },
  {
    id: 'account-plan-2',
    tenant: 'BluePeak Mailers',
    title: 'BluePeak retention account plan',
    scope: 'retention',
    status: 'draft',
    owner: 'Finance Admin',
    targetDate: '2026-04-29',
    keyOutcome: 'Stabilize renewal confidence',
    summary: 'Retention plan created to reduce billing friction and protect near-term renewal.'
  },
  {
    id: 'account-plan-3',
    tenant: 'PixelPress Studio',
    title: 'PixelPress launch account plan',
    scope: 'launch',
    status: 'completed',
    owner: 'Support Admin',
    targetDate: '2026-04-21',
    keyOutcome: 'Transition into steady-state usage',
    summary: 'Launch plan completed with onboarding actions closed and first success review scheduled.'
  }
];
