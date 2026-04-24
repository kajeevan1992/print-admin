
export type OwnerWebhookStatus = 'active' | 'paused' | 'failed';
export type OwnerWebhookScope = 'tenant' | 'platform' | 'integration';

export type OwnerWebhookRecord = {
  id: string;
  label: string;
  endpoint: string;
  tenant: string;
  scope: OwnerWebhookScope;
  status: OwnerWebhookStatus;
  lastDeliveryAt: string;
  events: string;
  owner: string;
  notes: string;
};

export const ownerWebhookSeed: OwnerWebhookRecord[] = [
  {
    id: 'hook-1',
    label: 'Northstar order sync',
    endpoint: 'https://hooks.northstarprint.co.uk/orders',
    tenant: 'Northstar Print',
    scope: 'tenant',
    status: 'active',
    lastDeliveryAt: '2026-04-12 09:15',
    events: 'order.created, order.updated',
    owner: 'Platform Admin',
    notes: 'Primary webhook for order and status sync.'
  },
  {
    id: 'hook-2',
    label: 'Owner billing alerts',
    endpoint: 'https://ops.printadmin.app/billing-alerts',
    tenant: 'All tenants',
    scope: 'platform',
    status: 'paused',
    lastDeliveryAt: '2026-04-11 16:30',
    events: 'billing.risk.flagged, payout.failed',
    owner: 'Finance Admin',
    notes: 'Paused while alert routing is being reviewed.'
  },
  {
    id: 'hook-3',
    label: 'Demo upload callback',
    endpoint: 'https://bluepeakmailers.io/demo-upload',
    tenant: 'BluePeak Mailers',
    scope: 'integration',
    status: 'failed',
    lastDeliveryAt: '2026-04-10 14:05',
    events: 'demo.uploaded',
    owner: 'Support Admin',
    notes: 'Needs endpoint validation before re-enabling.'
  }
];
