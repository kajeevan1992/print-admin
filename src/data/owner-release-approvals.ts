
export type OwnerReleaseApprovalStatus = 'pending' | 'approved' | 'blocked';
export type OwnerReleaseApprovalScope = 'tenant' | 'platform' | 'environment';

export type OwnerReleaseApprovalRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerReleaseApprovalScope;
  status: OwnerReleaseApprovalStatus;
  releaseWindow: string;
  approver: string;
  riskLevel: string;
  summary: string;
};

export const ownerReleaseApprovalSeed: OwnerReleaseApprovalRecord[] = [
  {
    id: 'approval-1',
    tenant: 'Northstar Print',
    title: 'Northstar storefront rollout',
    scope: 'tenant',
    status: 'pending',
    releaseWindow: '2026-04-15 22:00 UTC',
    approver: 'Owner Ops',
    riskLevel: 'Medium',
    summary: 'Awaiting final owner sign-off before storefront release and pricing sync activation.'
  },
  {
    id: 'approval-2',
    tenant: 'All tenants',
    title: 'Platform infra patch release',
    scope: 'platform',
    status: 'approved',
    releaseWindow: '2026-04-14 01:00 UTC',
    approver: 'Platform Admin',
    riskLevel: 'Low',
    summary: 'Approved platform patch for background workers and API stability improvements.'
  },
  {
    id: 'approval-3',
    tenant: 'BluePeak Mailers Demo',
    title: 'Demo environment content refresh',
    scope: 'environment',
    status: 'blocked',
    releaseWindow: '2026-04-13 03:00 UTC',
    approver: 'Support Admin',
    riskLevel: 'High',
    summary: 'Blocked until demo data validation and storage verification are completed.'
  }
];
