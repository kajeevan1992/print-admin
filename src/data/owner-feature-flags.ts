
export type OwnerFeatureFlagStatus = 'draft' | 'enabled' | 'paused';
export type OwnerFeatureFlagScope = 'global' | 'pilot' | 'tenant';

export type OwnerFeatureFlagRecord = {
  id: string;
  key: string;
  label: string;
  scope: OwnerFeatureFlagScope;
  target: string;
  status: OwnerFeatureFlagStatus;
  rollout: number;
  owner: string;
  notes: string;
  updatedAt: string;
};

export const ownerFeatureFlagSeed: OwnerFeatureFlagRecord[] = [
  {
    id: 'flag-1',
    key: 'priority-proofing',
    label: 'Priority proofing controls',
    scope: 'pilot',
    target: 'Northstar Print',
    status: 'enabled',
    rollout: 25,
    owner: 'Owner Ops',
    notes: 'Pilot feature for premium tenant launch group.',
    updatedAt: '2026-04-11'
  },
  {
    id: 'flag-2',
    key: 'owner-billing-watchlist',
    label: 'Owner billing watchlist cards',
    scope: 'global',
    target: 'All tenants',
    status: 'enabled',
    rollout: 100,
    owner: 'Finance Admin',
    notes: 'Visible across all owner console environments.',
    updatedAt: '2026-04-10'
  },
  {
    id: 'flag-3',
    key: 'self-serve-demo-upload',
    label: 'Self-serve demo uploads',
    scope: 'tenant',
    target: 'PixelPress Studio',
    status: 'draft',
    rollout: 0,
    owner: 'Support Admin',
    notes: 'Waiting for onboarding sign-off.',
    updatedAt: '2026-04-09'
  }
];
