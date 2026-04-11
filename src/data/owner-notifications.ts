
export type OwnerNotificationSeverity = 'info' | 'watch' | 'critical';
export type OwnerNotificationChannel = 'email' | 'slack' | 'in-app';
export type OwnerNotificationStatus = 'draft' | 'active' | 'paused';

export type OwnerNotificationRecord = {
  id: string;
  title: string;
  audience: string;
  trigger: string;
  channel: OwnerNotificationChannel;
  severity: OwnerNotificationSeverity;
  status: OwnerNotificationStatus;
  message: string;
  updatedAt: string;
};

export const ownerNotificationSeed: OwnerNotificationRecord[] = [
  {
    id: 'owner-note-1',
    title: 'Billing risk alert',
    audience: 'Finance admins',
    trigger: 'Payout risk flagged',
    channel: 'email',
    severity: 'critical',
    status: 'active',
    message: 'Notify finance admins when payout risk is raised on any active tenant.',
    updatedAt: '2026-04-11'
  },
  {
    id: 'owner-note-2',
    title: 'Launch checklist reminder',
    audience: 'Owner ops',
    trigger: 'Launch blocked for 24h',
    channel: 'slack',
    severity: 'watch',
    status: 'active',
    message: 'Post an owner ops reminder when a launch remains blocked for more than 24 hours.',
    updatedAt: '2026-04-10'
  },
  {
    id: 'owner-note-3',
    title: 'Deployment queued notice',
    audience: 'Platform admins',
    trigger: 'Deployment queued',
    channel: 'in-app',
    severity: 'info',
    status: 'draft',
    message: 'Surface an in-app event when a new owner deployment is queued.',
    updatedAt: '2026-04-09'
  }
];
