export type CoreRole = 'owner' | 'super_admin' | 'tenant_admin' | 'staff' | 'customer';

export type AuthContext = {
  userId: string;
  tenantId?: string;
  roles: CoreRole[];
};

export function hasRole(ctx: AuthContext | null | undefined, role: CoreRole) {
  return Boolean(ctx?.roles?.includes(role));
}

export function isSuperAdmin(ctx: AuthContext | null | undefined) {
  return hasRole(ctx, 'owner') || hasRole(ctx, 'super_admin');
}

export function requireSuperAdmin(ctx: AuthContext | null | undefined) {
  if (!isSuperAdmin(ctx)) {
    throw new Error('SUPER_ADMIN_REQUIRED');
  }
}
