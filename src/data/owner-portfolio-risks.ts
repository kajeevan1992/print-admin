
export type OwnerPortfolioRiskStatus = 'open' | 'watching' | 'mitigated';
export type OwnerPortfolioRiskScope = 'customer' | 'revenue' | 'operations';

export type OwnerPortfolioRiskRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerPortfolioRiskScope;
  status: OwnerPortfolioRiskStatus;
  impact: string;
  owner: string;
  dueDate: string;
  mitigationPlan: string;
};

export const ownerPortfolioRiskSeed: OwnerPortfolioRiskRecord[] = [
  {
    id: 'risk-1',
    tenant: 'Northstar Print',
    title: 'Expansion proposal delay',
    scope: 'revenue',
    status: 'watching',
    impact: 'Medium',
    owner: 'Owner Ops',
    dueDate: '2026-04-24',
    mitigationPlan: 'Escalate proposal review and align commercial sign-off before QBR.'
  },
  {
    id: 'risk-2',
    tenant: 'BluePeak Mailers',
    title: 'Billing dispute follow-up',
    scope: 'customer',
    status: 'open',
    impact: 'High',
    owner: 'Finance Admin',
    dueDate: '2026-04-19',
    mitigationPlan: 'Resolve disputed invoice items and confirm renewal timeline with stakeholder.'
  },
  {
    id: 'risk-3',
    tenant: 'PixelPress Studio',
    title: 'Launch readiness blockers',
    scope: 'operations',
    status: 'mitigated',
    impact: 'Medium',
    owner: 'Support Admin',
    dueDate: '2026-04-15',
    mitigationPlan: 'Close remaining onboarding blockers and validate environment before launch.'
  }
];
