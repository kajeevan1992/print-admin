
export type OwnerSuccessPlanStatus = 'draft' | 'active' | 'completed';
export type OwnerSuccessPlanScope = 'adoption' | 'renewal' | 'launch';

export type OwnerSuccessPlanRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerSuccessPlanScope;
  status: OwnerSuccessPlanStatus;
  owner: string;
  targetDate: string;
  nextMilestone: string;
  summary: string;
};

export const ownerSuccessPlanSeed: OwnerSuccessPlanRecord[] = [
  {
    id: 'success-1',
    tenant: 'Northstar Print',
    title: 'Expansion adoption plan',
    scope: 'adoption',
    status: 'active',
    owner: 'Owner Ops',
    targetDate: '2026-05-08',
    nextMilestone: 'Complete advanced storefront training',
    summary: 'Plan focused on driving broader team adoption and preparing for account expansion.'
  },
  {
    id: 'success-2',
    tenant: 'BluePeak Mailers',
    title: 'Renewal recovery plan',
    scope: 'renewal',
    status: 'draft',
    owner: 'Finance Admin',
    targetDate: '2026-04-27',
    nextMilestone: 'Resolve billing concern and confirm sponsor meeting',
    summary: 'Plan created to stabilize renewal momentum and remove commercial blockers.'
  },
  {
    id: 'success-3',
    tenant: 'PixelPress Studio',
    title: 'Launch success plan',
    scope: 'launch',
    status: 'completed',
    owner: 'Support Admin',
    targetDate: '2026-04-18',
    nextMilestone: 'Post-launch health check',
    summary: 'Launch preparation plan completed with onboarding milestones and rollout checks closed.'
  }
];
