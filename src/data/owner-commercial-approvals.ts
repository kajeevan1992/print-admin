export type OwnerCommercialApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OwnerCommercialApprovalScope = 'pricing' | 'discount' | 'contract';

export type OwnerCommercialApprovalRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerCommercialApprovalScope;
  status: OwnerCommercialApprovalStatus;
  owner: string;
  approver: string;
  effectiveDate: string;
  summary: string;
};

export const ownerCommercialApprovalSeed: OwnerCommercialApprovalRecord[] = [
  {
    id: 'commercial-1',
    tenant: 'Northstar Print',
    title: 'Expansion pricing approval',
    scope: 'pricing',
    status: 'pending',
    owner: 'Owner Ops',
    approver: 'Finance Director',
    effectiveDate: '2026-04-28',
    summary: 'Pending approval for revised commercial pricing tied to the storefront expansion plan.'
  },
  {
    id: 'commercial-2',
    tenant: 'BluePeak Mailers',
    title: 'Retention discount request',
    scope: 'discount',
    status: 'approved',
    owner: 'Finance Admin',
    approver: 'Commercial Lead',
    effectiveDate: '2026-04-19',
    summary: 'Approved short-term retention discount to support renewal recovery discussions.'
  },
  {
    id: 'commercial-3',
    tenant: 'PixelPress Studio',
    title: 'Launch support contract addendum',
    scope: 'contract',
    status: 'rejected',
    owner: 'Support Admin',
    approver: 'Legal Ops',
    effectiveDate: '2026-04-17',
    summary: 'Contract addendum was rejected pending updated support scope and revised legal wording.'
  }
];
