
export type OwnerRunbookStatus = 'draft' | 'active' | 'archived';
export type OwnerRunbookScope = 'incident' | 'maintenance' | 'onboarding';

export type OwnerRunbookRecord = {
  id: string;
  title: string;
  scope: OwnerRunbookScope;
  status: OwnerRunbookStatus;
  tenant: string;
  owner: string;
  version: string;
  updatedAt: string;
  summary: string;
};

export const ownerRunbookSeed: OwnerRunbookRecord[] = [
  {
    id: 'runbook-1',
    title: 'Checkout latency mitigation',
    scope: 'incident',
    status: 'active',
    tenant: 'All tenants',
    owner: 'Platform Admin',
    version: 'v1.4',
    updatedAt: '2026-04-12',
    summary: 'Step-by-step owner response for checkout slowdown, rollback, and tenant communication.'
  },
  {
    id: 'runbook-2',
    title: 'Weekend maintenance launch prep',
    scope: 'maintenance',
    status: 'active',
    tenant: 'All tenants',
    owner: 'Owner Ops',
    version: 'v2.1',
    updatedAt: '2026-04-11',
    summary: 'Preparation checklist for maintenance windows, approvals, and post-window validation.'
  },
  {
    id: 'runbook-3',
    title: 'Enterprise tenant onboarding',
    scope: 'onboarding',
    status: 'draft',
    tenant: 'BluePeak Mailers',
    owner: 'Support Admin',
    version: 'v0.9',
    updatedAt: '2026-04-10',
    summary: 'Draft owner flow for demo uploads, first admin invite, and launch-readiness handoff.'
  }
];
