
export type OwnerIncidentSeverity = 'minor' | 'major' | 'critical';
export type OwnerIncidentStatus = 'open' | 'mitigating' | 'resolved';

export type OwnerIncidentRecord = {
  id: string;
  tenant: string;
  title: string;
  severity: OwnerIncidentSeverity;
  status: OwnerIncidentStatus;
  startedAt: string;
  affectedArea: string;
  owner: string;
  summary: string;
};

export const ownerIncidentSeed: OwnerIncidentRecord[] = [
  {
    id: 'incident-1',
    tenant: 'Northstar Print',
    title: 'Checkout latency spike',
    severity: 'major',
    status: 'mitigating',
    startedAt: '2026-04-12 08:10 UTC',
    affectedArea: 'Storefront checkout',
    owner: 'Platform Admin',
    summary: 'Investigating elevated response times across checkout and quote generation.'
  },
  {
    id: 'incident-2',
    tenant: 'All tenants',
    title: 'Webhook retry backlog',
    severity: 'minor',
    status: 'open',
    startedAt: '2026-04-12 06:45 UTC',
    affectedArea: 'Platform integrations',
    owner: 'Owner Ops',
    summary: 'Retry queue depth increased after upstream provider throttling.'
  },
  {
    id: 'incident-3',
    tenant: 'BluePeak Mailers',
    title: 'Demo environment unavailable',
    severity: 'critical',
    status: 'resolved',
    startedAt: '2026-04-11 13:20 UTC',
    affectedArea: 'Demo environment',
    owner: 'Support Admin',
    summary: 'Recovered demo stack after storage mount issue and validation pass.'
  }
];
