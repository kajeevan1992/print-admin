
export type OwnerComplianceStatus = 'compliant' | 'review' | 'overdue';
export type OwnerComplianceScope = 'tenant' | 'platform' | 'security';

export type OwnerComplianceRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerComplianceScope;
  status: OwnerComplianceStatus;
  dueDate: string;
  owner: string;
  evidence: string;
  summary: string;
};

export const ownerComplianceSeed: OwnerComplianceRecord[] = [
  {
    id: 'compliance-1',
    tenant: 'Northstar Print',
    title: 'Quarterly access review',
    scope: 'tenant',
    status: 'review',
    dueDate: '2026-04-20',
    owner: 'Owner Ops',
    evidence: 'Pending approver sign-off',
    summary: 'Review privileged access and storefront admin assignments before quarter close.'
  },
  {
    id: 'compliance-2',
    tenant: 'All tenants',
    title: 'Platform backup verification',
    scope: 'platform',
    status: 'compliant',
    dueDate: '2026-04-30',
    owner: 'Platform Admin',
    evidence: 'Restore drill completed',
    summary: 'Validated backup recovery workflow and retention policy across platform services.'
  },
  {
    id: 'compliance-3',
    tenant: 'BluePeak Mailers',
    title: 'SSO configuration validation',
    scope: 'security',
    status: 'overdue',
    dueDate: '2026-04-10',
    owner: 'Support Admin',
    evidence: 'Metadata refresh missing',
    summary: 'Customer SSO setup requires renewed validation and updated certificate checks.'
  }
];
