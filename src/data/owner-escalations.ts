export type OwnerEscalationSeverity = 'watch' | 'high' | 'critical';
export type OwnerEscalationStatus = 'open' | 'investigating' | 'blocked' | 'resolved';
export type OwnerEscalationDomain = 'billing' | 'activation' | 'deployment' | 'support';

export type OwnerEscalationRecord = {
  id: string;
  tenant: string;
  domain: OwnerEscalationDomain;
  title: string;
  summary: string;
  severity: OwnerEscalationSeverity;
  status: OwnerEscalationStatus;
  owner: string;
  updatedAt: string;
};

export const ownerEscalationSeed: OwnerEscalationRecord[] = [
  {
    id: 'esc-1',
    tenant: 'BluePeak Mailers',
    domain: 'billing',
    title: 'Payout risk hold',
    summary: 'Finance flagged the account after two failed settlement retries ahead of next release.',
    severity: 'critical',
    status: 'investigating',
    owner: 'Finance Ops',
    updatedAt: '2026-04-11'
  },
  {
    id: 'esc-2',
    tenant: 'PixelPress Studio',
    domain: 'activation',
    title: 'Launch readiness blocked',
    summary: 'Store cannot go live until demo content approval and storefront QA are signed off.',
    severity: 'high',
    status: 'blocked',
    owner: 'Owner Ops',
    updatedAt: '2026-04-10'
  },
  {
    id: 'esc-3',
    tenant: 'Northstar Print',
    domain: 'deployment',
    title: 'Release watchlist',
    summary: 'Production deployment is healthy, but owner visibility is needed before the evening window.',
    severity: 'watch',
    status: 'open',
    owner: 'Platform Ops',
    updatedAt: '2026-04-09'
  }
];
