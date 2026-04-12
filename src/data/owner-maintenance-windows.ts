
export type OwnerMaintenanceStatus = 'scheduled' | 'active' | 'completed';
export type OwnerMaintenanceScope = 'tenant' | 'platform' | 'environment';

export type OwnerMaintenanceRecord = {
  id: string;
  tenant: string;
  title: string;
  scope: OwnerMaintenanceScope;
  status: OwnerMaintenanceStatus;
  startAt: string;
  endAt: string;
  impact: string;
  owner: string;
  notes: string;
};

export const ownerMaintenanceSeed: OwnerMaintenanceRecord[] = [
  {
    id: 'mw-1',
    tenant: 'Northstar Print',
    title: 'Northstar production patch window',
    scope: 'tenant',
    status: 'scheduled',
    startAt: '2026-04-14 01:00 UTC',
    endAt: '2026-04-14 02:30 UTC',
    impact: 'Brief admin slowdown during rollout',
    owner: 'Platform Admin',
    notes: 'Patch release for production stability and print queue performance.'
  },
  {
    id: 'mw-2',
    tenant: 'All tenants',
    title: 'Platform certificate rotation',
    scope: 'platform',
    status: 'active',
    startAt: '2026-04-12 23:00 UTC',
    endAt: '2026-04-13 00:00 UTC',
    impact: 'Short-lived reconnects for dashboard sessions',
    owner: 'Owner Ops',
    notes: 'Platform-wide maintenance for cert rotation and edge refresh.'
  },
  {
    id: 'mw-3',
    tenant: 'BluePeak Mailers Demo',
    title: 'Demo environment refresh',
    scope: 'environment',
    status: 'completed',
    startAt: '2026-04-11 03:00 UTC',
    endAt: '2026-04-11 04:00 UTC',
    impact: 'Demo environment unavailable during reset',
    owner: 'Support Admin',
    notes: 'Completed demo content refresh and sample order cleanup.'
  }
];
