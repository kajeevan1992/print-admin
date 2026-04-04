import type { AdminUser, SiteUser, UserCart, UserGroup, UserProject, UserRole } from '@/modules/users/types';

export const adminUsersMock: AdminUser[] = [
  {
    id: 'au-1',
    name: 'Alex Rivera',
    email: 'alex@printnow.test',
    roleId: 'role-admin',
    roleName: 'Super Admin',
    department: 'Operations',
    status: 'active',
    lastLogin: '2026-04-04 13:42',
    avatar: 'AR'
  },
  {
    id: 'au-2',
    name: 'Mina Chen',
    email: 'mina@printnow.test',
    roleId: 'role-production',
    roleName: 'Production Manager',
    department: 'Production',
    status: 'active',
    lastLogin: '2026-04-04 11:08',
    avatar: 'MC'
  },
  {
    id: 'au-3',
    name: 'Daniel Frost',
    email: 'daniel@printnow.test',
    roleId: 'role-support',
    roleName: 'Support Lead',
    department: 'Support',
    status: 'invited',
    lastLogin: '—',
    avatar: 'DF'
  }
];

export const siteUsersMock: SiteUser[] = [
  {
    id: 'su-1',
    name: 'Acme Marketing Team',
    email: 'marketing@acme.test',
    organization: 'Acme Corp',
    groupId: 'grp-b2b',
    groupName: 'B2B Buyers',
    status: 'active',
    ordersCount: 23,
    lifetimeValue: 18420
  },
  {
    id: 'su-2',
    name: 'Nina Cooper',
    email: 'nina@studio.test',
    organization: 'Studio Retail',
    groupId: 'grp-retail',
    groupName: 'Retail Accounts',
    status: 'active',
    ordersCount: 8,
    lifetimeValue: 2610
  },
  {
    id: 'su-3',
    name: 'Luke Martin',
    email: 'luke@startup.test',
    organization: 'North Startup',
    groupId: 'grp-pending',
    groupName: 'Pending Approval',
    status: 'pending',
    ordersCount: 0,
    lifetimeValue: 0
  }
];

export const userGroupsMock: UserGroup[] = [
  { id: 'grp-b2b', name: 'B2B Buyers', description: 'Wholesale and managed account buyers.', usersCount: 18, collectionsCount: 6 },
  { id: 'grp-retail', name: 'Retail Accounts', description: 'Retail and light-business storefront access.', usersCount: 42, collectionsCount: 4 },
  { id: 'grp-pending', name: 'Pending Approval', description: 'Users awaiting manual approval and catalog assignment.', usersCount: 7, collectionsCount: 0 }
];

export const userRolesMock: UserRole[] = [
  { id: 'role-admin', name: 'Super Admin', description: 'Full control across all stores and settings.', membersCount: 2 },
  { id: 'role-production', name: 'Production Manager', description: 'Can manage proofs, routing, and production boards.', membersCount: 5 },
  { id: 'role-support', name: 'Support Lead', description: 'Handles support tickets, user issues, and escalations.', membersCount: 3 }
];

export const userProjectsMock: UserProject[] = [
  { id: 'prj-1', name: 'Spring Mailer Rev A', ownerName: 'Acme Marketing Team', productName: 'Premium Catalog A4', status: 'in-review', updatedAt: '2026-04-04 09:20' },
  { id: 'prj-2', name: 'Trade Booth Banner', ownerName: 'Nina Cooper', productName: 'Roll-up Banner 33x80', status: 'draft', updatedAt: '2026-04-03 18:12' },
  { id: 'prj-3', name: 'Loyalty Card Reprint', ownerName: 'Luke Martin', productName: 'Matte Business Card', status: 'ordered', updatedAt: '2026-04-02 14:41' }
];

export const userCartsMock: UserCart[] = [
  { id: 'cart-1', customerName: 'Acme Marketing Team', itemCount: 6, subtotal: 1240, status: 'active', updatedAt: '2026-04-04 10:12' },
  { id: 'cart-2', customerName: 'Nina Cooper', itemCount: 2, subtotal: 118, status: 'converted', updatedAt: '2026-04-03 15:08' },
  { id: 'cart-3', customerName: 'Luke Martin', itemCount: 1, subtotal: 42, status: 'abandoned', updatedAt: '2026-04-01 08:55' }
];
