
export type OwnerQbrStatus = 'planned' | 'scheduled' | 'completed';
export type OwnerQbrScope = 'tenant' | 'portfolio' | 'renewal';

export type OwnerQbrRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerQbrScope;
  status: OwnerQbrStatus;
  meetingDate: string;
  owner: string;
  agenda: string;
  summary: string;
};

export const ownerQbrSeed: OwnerQbrRecord[] = [
  {
    id: 'qbr-1',
    tenant: 'Northstar Print',
    title: 'Northstar Q2 business review',
    scope: 'tenant',
    status: 'scheduled',
    meetingDate: '2026-04-22 14:00 UTC',
    owner: 'Owner Ops',
    agenda: 'Adoption, expansion seats, pricing roadmap',
    summary: 'Quarterly review focused on adoption wins and commercial expansion planning.'
  },
  {
    id: 'qbr-2',
    tenant: 'All tenants',
    title: 'Portfolio executive review',
    scope: 'portfolio',
    status: 'planned',
    meetingDate: '2026-04-29 10:00 UTC',
    owner: 'Finance Admin',
    agenda: 'Portfolio health, renewals, risk watchlist',
    summary: 'Cross-tenant executive review for revenue health and at-risk accounts.'
  },
  {
    id: 'qbr-3',
    tenant: 'BluePeak Mailers',
    title: 'Renewal readiness review',
    scope: 'renewal',
    status: 'completed',
    meetingDate: '2026-04-10 15:30 UTC',
    owner: 'Support Admin',
    agenda: 'Billing blockers, launch readiness, retention plan',
    summary: 'Completed review with actions captured for renewal follow-up.'
  }
];
