
export type OwnerStakeholderStatus = 'active' | 'watch' | 'inactive';
export type OwnerStakeholderRole = 'executive' | 'admin' | 'champion';

export type OwnerStakeholderRecord = {
  id: string;
  tenant: string;
  name: string;
  role: OwnerStakeholderRole;
  status: OwnerStakeholderStatus;
  owner: string;
  influenceLevel: string;
  lastTouchpoint: string;
  summary: string;
};

export const ownerStakeholderSeed: OwnerStakeholderRecord[] = [
  {
    id: 'stakeholder-1',
    tenant: 'Northstar Print',
    name: 'Sophie Carter',
    role: 'executive',
    status: 'active',
    owner: 'Owner Ops',
    influenceLevel: 'High',
    lastTouchpoint: '2026-04-13',
    summary: 'Primary executive sponsor supporting expansion and roadmap alignment.'
  },
  {
    id: 'stakeholder-2',
    tenant: 'BluePeak Mailers',
    name: 'Daniel Morris',
    role: 'admin',
    status: 'watch',
    owner: 'Finance Admin',
    influenceLevel: 'Medium',
    lastTouchpoint: '2026-04-11',
    summary: 'Key admin stakeholder engaged but currently focused on billing concerns.'
  },
  {
    id: 'stakeholder-3',
    tenant: 'PixelPress Studio',
    name: 'Emma Patel',
    role: 'champion',
    status: 'inactive',
    owner: 'Support Admin',
    influenceLevel: 'Medium',
    lastTouchpoint: '2026-04-08',
    summary: 'Previous internal champion who needs re-engagement after launch transition.'
  }
];
