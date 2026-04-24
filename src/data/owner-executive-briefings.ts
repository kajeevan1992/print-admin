
export type OwnerExecutiveBriefingStatus = 'draft' | 'scheduled' | 'delivered';
export type OwnerExecutiveBriefingScope = 'customer' | 'portfolio' | 'renewal';

export type OwnerExecutiveBriefingRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerExecutiveBriefingScope;
  status: OwnerExecutiveBriefingStatus;
  owner: string;
  briefingDate: string;
  audience: string;
  summary: string;
};

export const ownerExecutiveBriefingSeed: OwnerExecutiveBriefingRecord[] = [
  {
    id: 'briefing-1',
    tenant: 'Northstar Print',
    title: 'Northstar executive roadmap briefing',
    scope: 'customer',
    status: 'scheduled',
    owner: 'Owner Ops',
    briefingDate: '2026-04-26',
    audience: 'C-suite sponsor group',
    summary: 'Prepared briefing focused on roadmap, expansion opportunity, and success metrics.'
  },
  {
    id: 'briefing-2',
    tenant: 'All tenants',
    title: 'Portfolio health executive update',
    scope: 'portfolio',
    status: 'draft',
    owner: 'Finance Admin',
    briefingDate: '2026-04-30',
    audience: 'Internal leadership',
    summary: 'Draft portfolio briefing covering renewals, risks, adoption trends, and escalations.'
  },
  {
    id: 'briefing-3',
    tenant: 'BluePeak Mailers',
    title: 'Renewal sponsor briefing',
    scope: 'renewal',
    status: 'delivered',
    owner: 'Support Admin',
    briefingDate: '2026-04-14',
    audience: 'Commercial sponsor',
    summary: 'Delivered renewal-focused briefing with blockers, mitigations, and next commercial actions.'
  }
];
