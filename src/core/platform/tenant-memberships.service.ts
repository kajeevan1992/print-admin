import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';
import { runFreshAivenDbSetup } from '@/core/launch/fresh-aiven-db-setup.service';

export type MembershipRole = 'TENANT_OWNER' | 'TENANT_ADMIN' | 'TENANT_STAFF';
export type MembershipInput = { tenantId?: string; tenantSlug?: string; userId?: string; email?: string; name?: string; role: MembershipRole; status?: string; permissions?: Record<string, boolean> };
const ROLES: MembershipRole[] = ['TENANT_OWNER', 'TENANT_ADMIN', 'TENANT_STAFF'];
const PERMISSIONS = ['catalog:read','catalog:write','orders:read','orders:write','pricing:read','pricing:write','settings:read','settings:write','users:read','users:write','seo:read','seo:write','reports:read','launch:read'] as const;
const DEFAULTS: Record<MembershipRole, Record<string, boolean>> = {
  TENANT_OWNER: Object.fromEntries(PERMISSIONS.map((key) => [key, true])),
  TENANT_ADMIN: Object.fromEntries(PERMISSIONS.map((key) => [key, !['users:write'].includes(key)])),
  TENANT_STAFF: Object.fromEntries(PERMISSIONS.map((key) => [key, ['catalog:read','orders:read','orders:write','pricing:read','reports:read'].includes(key)])),
};
function cleanEmail(value: string) { return value.trim().toLowerCase(); }
function asRole(value: string): MembershipRole { return ROLES.includes(value as MembershipRole) ? value as MembershipRole : 'TENANT_STAFF'; }
function mergePermissions(role: MembershipRole, overrides?: Record<string, boolean>) { return { ...DEFAULTS[role], ...(overrides || {}) }; }
async function ensureReady() { await runFreshAivenDbSetup('apply'); }
async function ensureAccess() { await requireSuperAdmin(); }
async function tenantWhere(input: MembershipInput) { const prisma = platformPrisma as any; if (input.tenantId) return prisma.tenant.findUnique({ where: { id: input.tenantId } }); if (input.tenantSlug) return prisma.tenant.findUnique({ where: { slug: input.tenantSlug } }); return null; }

export function defaultPermissionMatrix() { return { permissions: PERMISSIONS, roles: ROLES, defaults: DEFAULTS }; }

export async function listTenantMemberships() {
  await ensureAccess();
  await ensureReady();
  const prisma = platformPrisma as any;
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  const memberships = await prisma.tenantMembership.findMany({ orderBy: { createdAt: 'desc' }, include: { tenant: true, user: true } });
  return { ...defaultPermissionMatrix(), tenants: tenants.map((tenant: any) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status })), memberships: memberships.map((item: any) => ({ id: item.id, tenantId: item.tenantId, tenantName: item.tenant?.name || '', tenantSlug: item.tenant?.slug || '', userId: item.userId, email: item.user?.email || '', name: item.user?.name || item.user?.email || '', role: item.role, status: item.status, permissions: item.permissions || mergePermissions(item.role), updatedAt: item.updatedAt })) };
}

export async function upsertTenantMembership(input: MembershipInput) {
  await ensureAccess();
  await ensureReady();
  const prisma = platformPrisma as any;
  const role = asRole(input.role);
  const tenant = await tenantWhere(input);
  if (!tenant) throw new Error('Tenant was not found.');
  let user = input.userId ? await prisma.user.findUnique({ where: { id: input.userId } }) : null;
  const email = cleanEmail(input.email || '');
  if (!user && email) user = await prisma.user.findUnique({ where: { email } });
  if (!user && email) user = await prisma.user.create({ data: { id: `user-${crypto.randomUUID()}`, email, name: input.name || email, role, tenantId: tenant.id, isActive: true, sessionVersion: 1 } });
  if (!user) throw new Error('User or email is required.');
  await prisma.user.update({ where: { id: user.id }, data: { tenantId: tenant.id, role, name: input.name || user.name || user.email } });
  const permissions = mergePermissions(role, input.permissions);
  await prisma.tenantMembership.upsert({ where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } }, update: { role, status: input.status || 'ACTIVE', permissions }, create: { id: `member-${crypto.randomUUID()}`, tenantId: tenant.id, userId: user.id, role, status: input.status || 'ACTIVE', permissions } });
  return { ok: true, ...(await listTenantMemberships()) };
}

export async function removeTenantMembership(id: string) {
  await ensureAccess();
  await ensureReady();
  const prisma = platformPrisma as any;
  await prisma.tenantMembership.delete({ where: { id } });
  return { ok: true, ...(await listTenantMemberships()) };
}
