
export type OwnerAuditSeverity = 'info' | 'watch' | 'critical';
export type OwnerAuditDomain = 'auth' | 'tenant' | 'billing' | 'deployment';

export type OwnerAuditRecord = {
  id: string;
  actor: string;
  tenant: string;
  domain: OwnerAuditDomain;
  action: string;
  summary: string;
  severity: OwnerAuditSeverity;
  happenedAt: string;
};

export const ownerAuditSeed: OwnerAuditRecord[] = [
  {
    id: 'audit-1',
    actor: 'owner@printadmin.app',
    tenant: 'BluePeak Mailers',
    domain: 'billing',
    action: 'Marked payout risk',
    summary: 'Owner flagged payout risk after failed settlement retry.',
    severity: 'critical',
    happenedAt: '2026-04-11 10:40'
  },
  {
    id: 'audit-2',
    actor: 'ops.admin@printadmin.app',
    tenant: 'Northstar Print',
    domain: 'deployment',
    action: 'Queued deployment',
    summary: 'Deployment was queued for the evening release window.',
    severity: 'watch',
    happenedAt: '2026-04-11 09:20'
  },
  {
    id: 'audit-3',
    actor: 'support.admin@printadmin.app',
    tenant: 'PixelPress Studio',
    domain: 'tenant',
    action: 'Accepted invite',
    summary: 'Primary store admin invitation was accepted.',
    severity: 'info',
    happenedAt: '2026-04-10 16:15'
  }
];
