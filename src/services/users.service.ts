import {
  adminUsersMock,
  siteUsersMock,
  userCartsMock,
  userGroupsMock,
  userProjectsMock,
  userRolesMock
} from '@/data/users';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { AdminUser, SiteUser, UserCart, UserGroup, UserProject, UserRole } from '@/modules/users/types';

const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

export const usersService = {
  listAdminUsers: async (search?: string): Promise<PaginatedResponse<AdminUser>> => {
    await wait();
    const term = search?.trim().toLowerCase();
    const items = adminUsersMock.filter((item) => !term || [item.name, item.email, item.roleName, item.department].join(' ').toLowerCase().includes(term));
    return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
  },

  getAdminUser: async (id: string): Promise<ApiResponse<AdminUser>> => {
    await wait();
    const item = adminUsersMock.find((user) => user.id === id);
    if (!item) throw new Error('Admin user not found');
    return ok(item);
  },

  listSiteUsers: async (): Promise<ApiResponse<{ items: SiteUser[] }>> => {
    await wait();
    return ok({ items: siteUsersMock });
  },

  listUserGroups: async (): Promise<ApiResponse<{ items: UserGroup[] }>> => {
    await wait();
    return ok({ items: userGroupsMock });
  },

  listUserRoles: async (): Promise<ApiResponse<{ items: UserRole[] }>> => {
    await wait();
    return ok({ items: userRolesMock });
  },

  listUserProjects: async (): Promise<ApiResponse<{ items: UserProject[] }>> => {
    await wait();
    return ok({ items: userProjectsMock });
  },

  listUserCarts: async (): Promise<ApiResponse<{ items: UserCart[] }>> => {
    await wait();
    return ok({ items: userCartsMock });
  }
};
