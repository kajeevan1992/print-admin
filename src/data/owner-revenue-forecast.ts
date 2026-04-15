export type OwnerRevenueForecastStatus = 'draft' | 'review' | 'final';
export type OwnerRevenueForecastScope = 'customer' | 'portfolio' | 'renewal';

export type OwnerRevenueForecastRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerRevenueForecastScope;
  status: OwnerRevenueForecastStatus;
  owner: string;
  forecastMonth: string;
  projectedValue: string;
  summary: string;
};

export const ownerRevenueForecastSeed: OwnerRevenueForecastRecord[] = [
  {
    id: 'forecast-1',
    tenant: 'Northstar Print',
    title: 'Northstar expansion forecast',
    scope: 'customer',
    status: 'review',
    owner: 'Owner Ops',
    forecastMonth: '2026-05',
    projectedValue: '£28,000 ARR',
    summary: 'Forecast under review based on expansion pricing and expected storefront rollout.'
  },
  {
    id: 'forecast-2',
    tenant: 'All tenants',
    title: 'Portfolio monthly forecast',
    scope: 'portfolio',
    status: 'draft',
    owner: 'Finance Admin',
    forecastMonth: '2026-05',
    projectedValue: '£184,000 ARR',
    summary: 'Portfolio-level forecast combining renewals, expansions, and risk adjustments.'
  },
  {
    id: 'forecast-3',
    tenant: 'BluePeak Mailers',
    title: 'Renewal recovery forecast',
    scope: 'renewal',
    status: 'final',
    owner: 'Support Admin',
    forecastMonth: '2026-04',
    projectedValue: '£8,400 ARR',
    summary: 'Final forecast reflects approved retention discount and renewal timing.'
  }
];
