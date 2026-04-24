import type { Id } from '@/types/common';

export type AdminUserStatus = 'active' | 'invited' | 'suspended';
export type SiteUserStatus = 'active' | 'pending' | 'disabled';
export type ProjectStatus = 'draft' | 'in-review' | 'ordered';
export type CartStatus = 'active' | 'abandoned' | 'converted';

export type AdminUser = {
  id: Id;
  name: string;
  email: string;
  roleId: Id;
  roleName: string;
  department: string;
  status: AdminUserStatus;
  lastLogin: string;
  avatar: string;
};

export type SiteUser = {
  id: Id;
  name: string;
  email: string;
  organization: string;
  groupId: Id;
  groupName: string;
  status: SiteUserStatus;
  ordersCount: number;
  lifetimeValue: number;
};

export type UserGroup = {
  id: Id;
  name: string;
  description: string;
  usersCount: number;
  collectionsCount: number;
};

export type UserRole = {
  id: Id;
  name: string;
  description: string;
  membersCount: number;
};

export type UserProject = {
  id: Id;
  name: string;
  ownerName: string;
  productName: string;
  status: ProjectStatus;
  updatedAt: string;
};

export type UserCart = {
  id: Id;
  customerName: string;
  itemCount: number;
  subtotal: number;
  status: CartStatus;
  updatedAt: string;
};
