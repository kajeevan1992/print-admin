import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { runFreshAivenDbSetup } from '@/core/launch/fresh-aiven-db-setup.service';

export type WebsiteOwnerRole = 'TENANT_OWNER' | 'TENANT_ADMIN' | 'TENANT_STAFF';
export type WebsiteOwnerSetupInput = {
  tenantSlug: string;
  tenantName: string;
  defaultSubdomain?: string;
  ownerName: string;
  ownerEmail: string;
  loginSecret?: string;
  role: WebsiteOwnerRole;
  isActive?: boolean;
};

const ROLES: WebsiteOwnerRole[] = ['TENANT_OWNER', 'TENANT_ADMIN', 'TENANT_STAFF'];

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tenant'; }
function cleanEmail(value: string) { return value.trim().toLowerCase(); }
function asRole(value: string): WebsiteOwnerRole { return ROLES.includes(value as WebsiteOwnerRole) ? value as WebsiteOwnerRole : 'TENANT_OWNER'; }
function makeCredential(secret: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(secret, salt, 180000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$180000$${salt}$${hash}`;
}

async function ensureReady() { await runFreshAivenDbSetup('apply'); }

export async function listWebsiteOwnerSetup() {
  await ensureReady();
  const prisma = platformPrisma as any;
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, include: { users: true } });
  const owners = await prisma.user.findMany({ where: { role: { in: ROLES } }, orderBy: { createdAt: 'desc' }, include: { tenant: true } });
  return {
    roles: ROLES,
    shops: tenants.map((tenant: any) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, defaultSubdomain: tenant.defaultSubdomain, ownerCount: tenant.users.filter((user: any) => ROLES.includes(user.role)).length })),
    owners: owners.map((user: any) => ({ id: user.id, name: user.name || user.email, email: user.email, role: user.role, isActive: user.isActive !== false, lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null, tenantId: user.tenantId, tenantName: user.tenant?.name || null, tenantSlug: user.tenant?.slug || null })),
  };
}

export async function upsertWebsiteOwner(input: WebsiteOwnerSetupInput) {
  await ensureReady();
  const prisma = platformPrisma as any;
  const tenantSlug = slugify(input.tenantSlug || 'holo-print');
  const tenantName = String(input.tenantName || tenantSlug).trim();
  const defaultSubdomain = slugify(input.defaultSubdomain || tenantSlug);
  const ownerEmail = cleanEmail(input.ownerEmail || '');
  const ownerName = String(input.ownerName || ownerEmail || 'Website Owner').trim();
  const role = asRole(input.role);
  const loginSecret = String(input.loginSecret || '').trim();
  if (!ownerEmail || !ownerEmail.includes('@')) throw new Error('Valid website owner email is required.');
  if (!tenantName) throw new Error('Tenant name is required.');
  const tenant = await prisma.tenant.upsert({ where: { slug: tenantSlug }, update: { name: tenantName, defaultSubdomain, status: 'ACTIVE' }, create: { id: `tenant-${tenantSlug}`, name: tenantName, slug: tenantSlug, defaultSubdomain, status: 'ACTIVE' } });
  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!existing && !loginSecret) throw new Error('Login password is required for a new website owner.');
  if (existing && !existing.passwordHash && !loginSecret) throw new Error('Login password is required because this website owner does not have one yet.');
  const data: any = { tenantId: tenant.id, name: ownerName, role, isActive: input.isActive !== false };
  if (loginSecret) data.passwordHash = makeCredential(loginSecret);
  await prisma.user.upsert({ where: { email: ownerEmail }, update: data, create: { id: `user-${crypto.randomUUID()}`, email: ownerEmail, ...data, sessionVersion: 1 } });
  return { ok: true, tenantSlug, ownerEmail, ...(await listWebsiteOwnerSetup()) };
}

export async function setWebsiteOwnerStatus(email: string, isActive: boolean) {
  await ensureReady();
  const prisma = platformPrisma as any;
  const ownerEmail = cleanEmail(email || '');
  const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user || !ROLES.includes(user.role)) throw new Error('Website owner was not found.');
  await prisma.user.update({ where: { email: ownerEmail }, data: { isActive } });
  return { ok: true, ...(await listWebsiteOwnerSetup()) };
}
