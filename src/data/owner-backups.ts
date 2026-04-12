
export type OwnerBackupStatus = 'healthy' | 'warning' | 'failed';
export type OwnerBackupScope = 'tenant' | 'platform' | 'database';

export type OwnerBackupRecord = {
  id: string;
  tenant: string;
  label: string;
  scope: OwnerBackupScope;
  status: OwnerBackupStatus;
  frequency: string;
  lastRunAt: string;
  retention: string;
  owner: string;
  notes: string;
};

export const ownerBackupSeed: OwnerBackupRecord[] = [
  {
    id: 'backup-1',
    tenant: 'Northstar Print',
    label: 'Northstar daily snapshot',
    scope: 'tenant',
    status: 'healthy',
    frequency: 'Daily 02:00 UTC',
    lastRunAt: '2026-04-12 02:01',
    retention: '30 days',
    owner: 'Platform Admin',
    notes: 'Primary tenant snapshot job for storefront and admin data.'
  },
  {
    id: 'backup-2',
    tenant: 'All tenants',
    label: 'Platform weekly recovery set',
    scope: 'platform',
    status: 'warning',
    frequency: 'Weekly Sunday 01:00 UTC',
    lastRunAt: '2026-04-11 01:08',
    retention: '90 days',
    owner: 'Owner Ops',
    notes: 'Last job completed with delayed upload confirmation.'
  },
  {
    id: 'backup-3',
    tenant: 'BluePeak Mailers',
    label: 'BluePeak database archive',
    scope: 'database',
    status: 'failed',
    frequency: 'Daily 03:00 UTC',
    lastRunAt: '2026-04-11 03:00',
    retention: '14 days',
    owner: 'Support Admin',
    notes: 'Database archive retry required after storage timeout.'
  }
];
