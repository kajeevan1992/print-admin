import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { retryDatabaseConnection } from '@/core/db/database-errors';
import type { AdminAuthSession } from './admin-auth.service';

export const ADMIN_SESSION_COOKIE = 'print_admin_session';
const SESSION_HOURS = 12;

type SessionRow = {
  id: string;
  userId: string;
  tenantId: string | null;
  roleSnapshot: string;
  sessionVersion: number | null;
  expiresAt: Date | string;
  revokedAt: Date | string | null;
  userEmail: string;
  userName: string | null;
  userRole: string;
  userActive: boolean;
  userSessionVersion: number | null;
  tenantName: string | null;
  tenantSlug: string | null;
};

function tokenHash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
function roleFromDb(role: string): AdminAuthSession['role'] { if (role === 'SUPERADMIN') return 'super_admin'; if (role === 'TENANT_STAFF') return 'ops_manager'; return 'tenant_admin'; }
function defaultRoute(role: AdminAuthSession['role']) { return role === 'super_admin' ? '/super-admin' : '/workspace'; }
function getIp() { const h = headers(); return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || ''; }
function getUserAgent() { return headers().get('user-agent') || ''; }

async function tableExists(name: string) {
  return retryDatabaseConnection(async () => {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1) AS exists', name);
    return Boolean(rows[0]?.exists);
  }, 2);
}

export async function createAdminServerSession(user: { id: string; tenantId: string | null; role: string; sessionVersion?: number | null }) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await retryDatabaseConnection(() => platformPrisma.$executeRawUnsafe(
    'INSERT INTO "AdminSession" (id, "userId", "tenantId", "tokenHash", "roleSnapshot", "sessionVersion", "ipAddress", "userAgent", "expiresAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())',
    `sess-${crypto.randomUUID()}`,
    user.id,
    user.tenantId,
    tokenHash(token),
    user.role,
    user.sessionVersion || 1,
    getIp(),
    getUserAgent(),
    expiresAt,
  ), 3);
  return { token, expiresAt };
}

export function setAdminSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export async function readAdminSessionFromToken(token?: string | null) {
  if (!token) return null;
  return retryDatabaseConnection(async () => {
    const rows = await platformPrisma.$queryRawUnsafe<SessionRow[]>(`SELECT s.id, s."userId", s."tenantId", s."roleSnapshot", s."sessionVersion", s."expiresAt", s."revokedAt", u.email AS "userEmail", u.name AS "userName", u.role::text AS "userRole", u."isActive" AS "userActive", u."sessionVersion" AS "userSessionVersion", t.name AS "tenantName", t.slug AS "tenantSlug" FROM "AdminSession" s JOIN "User" u ON u.id = s."userId" LEFT JOIN "Tenant" t ON t.id = s."tenantId" WHERE s."tokenHash"=$1 LIMIT 1`, tokenHash(token));
    const row = rows[0];
    if (!row || row.revokedAt) return null;
    if (new Date(row.expiresAt).getTime() <= Date.now()) return null;
    if (!row.userActive) return null;
    if ((row.sessionVersion || 1) !== (row.userSessionVersion || 1)) return null;
    const role = roleFromDb(row.userRole);
    return {
      id: row.userId,
      name: row.userName || row.userEmail,
      email: row.userEmail,
      role,
      company: row.tenantName || (role === 'super_admin' ? 'Print Admin SaaS' : 'Print Admin'),
      tenantId: row.tenantSlug || row.tenantId || 'holo-print',
      defaultRoute: defaultRoute(role),
    } satisfies AdminAuthSession;
  }, 3);
}

export async function requireAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const session = await readAdminSessionFromToken(token);
  if (!session) throw new Error('Admin session required.');
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAdminSession();
  if (session.role !== 'super_admin') throw new Error('Super admin access required.');
  return session;
}

async function hasMembership(userId: string, tenantSlugOrId: string) {
  if (!(await tableExists('TenantMembership'))) return false;
  return retryDatabaseConnection(async () => {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`SELECT EXISTS (SELECT 1 FROM "TenantMembership" m JOIN "Tenant" t ON t.id=m."tenantId" WHERE m."userId"=$1 AND m.status='ACTIVE' AND (m."tenantId"=$2 OR t.slug=$2)) AS exists`, userId, tenantSlugOrId);
    return Boolean(rows[0]?.exists);
  }, 2);
}

export async function requireTenantSession(expectedTenantId?: string) {
  const session = await requireAdminSession();
  if (session.role === 'super_admin') return session;
  if (expectedTenantId && session.tenantId !== expectedTenantId && !(await hasMembership(session.id, expectedTenantId))) throw new Error('Tenant access denied.');
  return session;
}

export async function revokeCurrentAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;
  await retryDatabaseConnection(() => platformPrisma.$executeRawUnsafe('UPDATE "AdminSession" SET "revokedAt"=NOW(), "updatedAt"=NOW() WHERE "tokenHash"=$1', tokenHash(token)), 2);
}

export function authErrorResponse(message = 'Admin session required.', status = 401) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
