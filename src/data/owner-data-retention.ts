
export type OwnerRetentionStatus = 'active' | 'review' | 'expired';
export type OwnerRetentionScope = 'tenant' | 'platform' | 'compliance';

export type OwnerRetentionRecord = {
  id: string;
  tenant: string;
  category: string;
  scope: OwnerRetentionScope;
  status: OwnerRetentionStatus;
  retentionPeriod: string;
  nextReviewDate: string;
  owner: string;
  summary: string;
};

export const ownerRetentionSeed: OwnerRetentionRecord[] = [
  {
    id: 'retention-1',
    tenant: 'Northstar Print',
    category: 'Order history',
    scope: 'tenant',
    status: 'active',
    retentionPeriod: '24 months',
    nextReviewDate: '2026-05-01',
    owner: 'Owner Ops',
    summary: 'Tenant order history retained for audit and reprint support.'
  },
  {
    id: 'retention-2',
    tenant: 'All tenants',
    category: 'Platform audit logs',
    scope: 'platform',
    status: 'review',
    retentionPeriod: '36 months',
    nextReviewDate: '2026-04-25',
    owner: 'Platform Admin',
    summary: 'Audit-log retention under review before export and archive policy change.'
  },
  {
    id: 'retention-3',
    tenant: 'BluePeak Mailers',
    category: 'Demo upload archives',
    scope: 'compliance',
    status: 'expired',
    retentionPeriod: '90 days',
    nextReviewDate: '2026-04-10',
    owner: 'Support Admin',
    summary: 'Demo content archive retention exceeded and awaits owner action.'
  }
];
