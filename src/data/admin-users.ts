export type AdminRole = 'super_admin' | 'ops_admin' | 'finance_admin' | 'support_admin';
export type AdminStatus = 'active' | 'invited' | 'suspended';

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  scope: string;
  twoFactor: boolean;
  lastActive: string;
  environments: string[];
  risk: 'healthy' | 'watch' | 'critical';
  notes: string;
};

export const adminUsersSeed: AdminUserRecord[] = [
  {
    id: 'owner-1',
    name: 'Kajeevan Owner',
    email: 'owner@printadmin.app',
    role: 'super_admin',
    status: 'active',
    scope: 'Global SaaS owner access',
    twoFactor: true,
    lastActive: 'Today, 12:10',
    environments: ['production', 'staging'],
    risk: 'healthy',
    notes: 'Primary owner account for tenant controls, billing, and deployments.'
  },
  {
    id: 'ops-1',
    name: 'Mina Chen',
    email: 'mina@printadmin.app',
    role: 'ops_admin',
    status: 'active',
    scope: 'Deployments and tenant launch readiness',
    twoFactor: true,
    lastActive: 'Today, 09:35',
    environments: ['production', 'staging'],
    risk: 'healthy',
    notes: 'Owns go-live checklists and environment promotions.'
  },
  {
    id: 'finance-1',
    name: 'Jordan Lee',
    email: 'jordan@printadmin.app',
    role: 'finance_admin',
    status: 'invited',
    scope: 'Billing risk and license renewals',
    twoFactor: false,
    lastActive: 'Invite pending',
    environments: ['production'],
    risk: 'watch',
    notes: 'Needs onboarding before invoice recovery workflow starts.'
  },
  {
    id: 'support-1',
    name: 'Ava Roberts',
    email: 'ava@printadmin.app',
    role: 'support_admin',
    status: 'suspended',
    scope: 'Escalations and tenant issue review',
    twoFactor: true,
    lastActive: '4 days ago',
    environments: ['staging'],
    risk: 'critical',
    notes: 'Suspended after repeated failed access attempts.'
  }
];
