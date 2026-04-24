export type OwnerExpansionPipelineStatus = 'identified' | 'active' | 'won';
export type OwnerExpansionPipelineScope = 'customer' | 'portfolio' | 'renewal';

export type OwnerExpansionPipelineRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerExpansionPipelineScope;
  status: OwnerExpansionPipelineStatus;
  owner: string;
  targetCloseDate: string;
  opportunityValue: string;
  summary: string;
};

export const ownerExpansionPipelineSeed: OwnerExpansionPipelineRecord[] = [
  {
    id: 'expansion-1',
    tenant: 'Northstar Print',
    title: 'Storefront module expansion',
    scope: 'customer',
    status: 'active',
    owner: 'Owner Ops',
    targetCloseDate: '2026-05-14',
    opportunityValue: '£16,000 ARR',
    summary: 'Active expansion tied to additional storefront capabilities and broader team rollout.'
  },
  {
    id: 'expansion-2',
    tenant: 'All tenants',
    title: 'Portfolio upsell watchlist',
    scope: 'portfolio',
    status: 'identified',
    owner: 'Finance Admin',
    targetCloseDate: '2026-05-30',
    opportunityValue: '£46,000 ARR',
    summary: 'Early-stage portfolio expansion view covering highest-likelihood upsell accounts.'
  },
  {
    id: 'expansion-3',
    tenant: 'BluePeak Mailers',
    title: 'Renewal-led seat expansion',
    scope: 'renewal',
    status: 'won',
    owner: 'Support Admin',
    targetCloseDate: '2026-04-18',
    opportunityValue: '£4,800 ARR',
    summary: 'Expansion closed alongside renewal after commercial approval and adoption planning.'
  }
];
