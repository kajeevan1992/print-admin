import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
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
function roleFromDb(role: string): AdminAuthSession['role'] {
  if (role === 'SUPERADMIN') return 'super_admin';
  if (role === 'TENANT_STAFF') return 'ops_manager';
  return 'tenant_admin';
}
function defaultRoute(role: AdminAuthSession['role']) { return role === 'super_admin' ? '/super-admin' : '/workspace'; }
function getIp() {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '';
}
function getUserAgent() { return headers().get('user-agent') || ''; }

async function ensureSessionTable() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "roleSnapshot" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AdminSession_userId_idx" ON "AdminSession"("userId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AdminSession_tenantId_idx" ON "AdminSession"("tenantId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt")');
}

export async function createAdminServerSession(user: { id: string; tenantId: string | null; role: string; sessionVersion?: number | null }) {
  await ensureSessionTable();
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await platformPrisma.$executeRawUnsafe('INSERT INTO "AdminSession" (id, "userId", "tenantId", "tokenHash", "roleSnapshot", "sessionVersion", "ipAddress", "userAgent", "expiresAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', `sess-${crypto.randomUUID()}`, user.id, user.tenantId, tokenHash(token), user.role, user.sessionVersion || 1, getIp(), getUserAgent(), expiresAt);
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
  await ensureSessionTable();
  const rows = await platformPrisma.$queryRawUnsafe<SessionRow[]>(`SELECT s.id, s."userId", s."tenantId", s."roleSnapshot", s."sessionVersion", s."expiresAt", s."revokedAt", u.email AS "userEmail", u.name AS "userName", u.role::text AS "userRole", u."isActive" AS "userActive", u."sessionVersion" AS "userSessionVersion", t.name AS "tenantName", t.slug AS "tenantSlug" FROM "AdminSession" s JOIN "User" u ON u.id = s."userId" LEFT JOIN "Tenant" t ON t.id = s."tenantId" WHERE s."tokenHash"=$1 LIMIT 1`, tokenHash(token));
  const row = rows[0];
  if (!row) return null;
  if (row.revokedAt) return null;
  if (new Date(row.expiresAt).getTime() <= Date.now()) return null;
  if (!row.userActive) return null;
  if ((row.sessionVersion || 1) !== (row.userSessionVersion || 1)) return null;
  const role = roleFromDb(row.userRole);
  return { id: row.userId, name: row.userName || row.userEmail, email: row.userEmail, role, company: row.tenantName || (role === 'super_admin' ? 'Print Admin SaaS' : 'Print Admin'), tenantId: row.tenantSlug || row.tenantId || 'holo-print', defaultRoute: defaultRoute(role) } satisfies AdminAuthSession;
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

export async function requireTenantSession(expectedTenantId?: string) {
  const session = await requireAdminSession();
  if (session.role !== 'super_admin' && expectedTenantId && session.tenantId !== expectedTenantId) throw new Error('Tenant access denied.');
  return session;
}

export async function revokeCurrentAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;
  await ensureSessionTable();
  await platformPrisma.$executeRawUnsafe('UPDATE "AdminSession" SET "revokedAt"=NOW(), "updatedAt"=NOW() WHERE "tokenHash"=$1', tokenHash(token));
}

export function authErrorResponse(message = 'Admin session required.', status = 401) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
