import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';
import { runFreshAivenDbSetup } from '@/core/launch/fresh-aiven-db-setup.service';

type InviteRole = 'TENANT_OWNER' | 'TENANT_ADMIN' | 'TENANT_STAFF' | 'SUPERADMIN';
export type CreateInvitationInput = { tenantId?: string; tenantSlug?: string; email: string; name?: string; role: InviteRole; expiresInDays?: number };
export type AcceptInvitationInput = { token: string; name?: string; password: string };
const ROLES: InviteRole[] = ['TENANT_OWNER', 'TENANT_ADMIN', 'TENANT_STAFF', 'SUPERADMIN'];
function email(value: string) { return value.trim().toLowerCase(); }
function role(value: string): InviteRole { return ROLES.includes(value as InviteRole) ? value as InviteRole : 'TENANT_STAFF'; }
function tokenHash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
function passwordHash(secret: string, salt = crypto.randomBytes(16).toString('hex')) { const hash = crypto.pbkdf2Sync(secret, salt, 180000, 32, 'sha256').toString('hex'); return `pbkdf2_sha256$180000$${salt}$${hash}`; }
function appUrl() { return (process.env.NEXT_PUBLIC_APP_URL || process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL || '').replace(/\/$/, ''); }
async function tenant(input: CreateInvitationInput) { const prisma = platformPrisma as any; if (input.tenantId) return prisma.tenant.findUnique({ where: { id: input.tenantId } }); if (input.tenantSlug) return prisma.tenant.findUnique({ where: { slug: input.tenantSlug } }); return prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } }); }
async function ensureReady() { await runFreshAivenDbSetup('apply'); }
function publicInvitation(item: any, plainToken = '') { const base = appUrl(); return { id: item.id, tenantId: item.tenantId, tenantName: item.tenant?.name || '', tenantSlug: item.tenant?.slug || '', email: item.email, name: item.name || '', role: item.role, status: item.status, expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString() : null, acceptedAt: item.acceptedAt ? new Date(item.acceptedAt).toISOString() : null, revokedAt: item.revokedAt ? new Date(item.revokedAt).toISOString() : null, createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null, inviteUrl: plainToken && base ? `${base}/accept-invite?token=${plainToken}` : plainToken ? `/accept-invite?token=${plainToken}` : '' }; }

export async function listAdminInvitationSetup() {
  await requireSuperAdmin(); await ensureReady();
  const prisma = platformPrisma as any;
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  const users = await prisma.user.findMany({ where: { role: { in: ROLES } }, orderBy: { createdAt: 'desc' }, include: { tenant: true } });
  const invitations = await prisma.adminInvitation.findMany({ orderBy: { createdAt: 'desc' }, include: { tenant: true } });
  return { roles: ROLES, tenants: tenants.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })), users: users.map((u: any) => ({ id: u.id, email: u.email, name: u.name || u.email, role: u.role, isActive: u.isActive !== false, tenantName: u.tenant?.name || '', tenantSlug: u.tenant?.slug || '' })), invitations: invitations.map((i: any) => publicInvitation(i)) };
}

export async function createAdminInvitation(input: CreateInvitationInput) {
  const session = await requireSuperAdmin(); await ensureReady();
  const prisma = platformPrisma as any;
  const inviteEmail = email(input.email || '');
  if (!inviteEmail.includes('@')) throw new Error('Valid invite email is required.');
  const selectedTenant = await tenant(input);
  if (!selectedTenant) throw new Error('Tenant is required for admin invitation.');
  const plainToken = crypto.randomBytes(32).toString('base64url');
  const days = Math.max(1, Math.min(30, Number(input.expiresInDays || 7)));
  const item = await prisma.adminInvitation.create({ data: { id: `invite-${crypto.randomUUID()}`, tenantId: selectedTenant.id, email: inviteEmail, name: input.name || '', role: role(input.role), tokenHash: tokenHash(plainToken), status: 'PENDING', expiresAt: new Date(Date.now() + days * 86400000), invitedBy: session.email, metadata: { inviteUrlGenerated: Boolean(appUrl()) } }, include: { tenant: true } });
  return { ok: true, invitation: publicInvitation(item, plainToken), ...(await listAdminInvitationSetup()) };
}

export async function revokeAdminInvitation(id: string) {
  await requireSuperAdmin(); await ensureReady();
  const prisma = platformPrisma as any;
  await prisma.adminInvitation.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
  return { ok: true, ...(await listAdminInvitationSetup()) };
}

export async function acceptAdminInvitation(input: AcceptInvitationInput) {
  await ensureReady();
  const prisma = platformPrisma as any;
  const invitation = await prisma.adminInvitation.findUnique({ where: { tokenHash: tokenHash(String(input.token || '')) }, include: { tenant: true } });
  if (!invitation || invitation.status !== 'PENDING' || invitation.revokedAt) throw new Error('Invitation is not valid.');
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) throw new Error('Invitation has expired.');
  const name = String(input.name || invitation.name || invitation.email).trim();
  const secret = String(input.password || '').trim();
  if (secret.length < 8) throw new Error('Password must be at least 8 characters.');
  const user = await prisma.user.upsert({ where: { email: invitation.email }, update: { tenantId: invitation.tenantId, name, role: invitation.role, passwordHash: passwordHash(secret), isActive: true }, create: { id: `user-${crypto.randomUUID()}`, tenantId: invitation.tenantId, email: invitation.email, name, role: invitation.role, passwordHash: passwordHash(secret), isActive: true, sessionVersion: 1 } });
  await prisma.tenantMembership.upsert({ where: { tenantId_userId: { tenantId: invitation.tenantId, userId: user.id } }, update: { role: invitation.role, status: 'ACTIVE', invitedBy: invitation.invitedBy }, create: { id: `member-${crypto.randomUUID()}`, tenantId: invitation.tenantId, userId: user.id, role: invitation.role, status: 'ACTIVE', invitedBy: invitation.invitedBy } });
  await prisma.adminInvitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedUserId: user.id } });
  return { ok: true, email: invitation.email, tenantSlug: invitation.tenant.slug };
}
