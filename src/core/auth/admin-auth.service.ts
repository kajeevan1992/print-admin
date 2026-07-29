import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { retryDatabaseConnection } from '@/core/db/database-errors';

export type AdminAuthSession = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'tenant_admin' | 'ops_manager';
  company: string;
  tenantId: string;
  defaultRoute: string;
};

export type VerifiedAdminLogin = {
  ok: boolean;
  session?: AdminAuthSession;
  dbUser?: { id: string; tenantId: string | null; role: string; sessionVersion: number | null };
  error?: string;
};

type UserRow = {
  id: string;
  tenantId: string | null;
  email: string;
  name: string | null;
  role: string;
  passwordHash: string | null;
  isActive: boolean | null;
  sessionVersion: number | null;
  tenantName: string | null;
  tenantSlug: string | null;
};

function env(name: string) { return String(process.env[name] || '').trim(); }
function sqlId(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'holo-print'; }
function pbkdf2Hash(secret: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(secret, salt, 180000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$180000$${salt}$${hash}`;
}
function verifyHash(secret: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false;
  const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'));
}
function mapRole(role: string): AdminAuthSession['role'] {
  if (role === 'SUPERADMIN') return 'super_admin';
  if (role === 'TENANT_STAFF') return 'ops_manager';
  return 'tenant_admin';
}
function defaultRoute(role: AdminAuthSession['role']) { return role === 'super_admin' ? '/super-admin' : '/workspace'; }
function runtimeBootstrapEnabled() { return env('ALLOW_RUNTIME_AUTH_BOOTSTRAP').toLowerCase() === 'true'; }

async function bootstrapOwnerIfConfigured() {
  if (!runtimeBootstrapEnabled()) return;
  const email = env('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const secret = env('BOOTSTRAP_ADMIN_PASSWORD');
  if (!email || !secret) return;
  const existing = await platformPrisma.$queryRawUnsafe<Array<{ id: string; passwordHash: string | null }>>('SELECT id, "passwordHash" FROM "User" WHERE lower(email)=lower($1) LIMIT 1', email);
  if (existing[0]?.passwordHash) return;
  const tenantSlug = sqlId(env('DEFAULT_TENANT_ID') || 'holo-print');
  const tenantId = `tenant-${tenantSlug}`;
  await platformPrisma.$executeRawUnsafe('INSERT INTO "Tenant" (id, name, slug, "defaultSubdomain", status, "updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',NOW()) ON CONFLICT (slug) DO NOTHING', tenantId, env('BOOTSTRAP_TENANT_NAME') || 'HOLO Print', tenantSlug, tenantSlug);
  const tenantRows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; name: string; slug: string }>>('SELECT id, name, slug FROM "Tenant" WHERE slug=$1 LIMIT 1', tenantSlug);
  const resolvedTenantId = tenantRows[0]?.id || tenantId;
  const passwordHash = pbkdf2Hash(secret);
  if (existing[0]?.id) {
    await platformPrisma.$executeRawUnsafe('UPDATE "User" SET "tenantId"=$1, name=$2, role=$3::"UserRole", "passwordHash"=$4, "isActive"=true, "sessionVersion"=1, "updatedAt"=NOW() WHERE id=$5', resolvedTenantId, env('BOOTSTRAP_ADMIN_NAME') || 'Admin User', 'SUPERADMIN', passwordHash, existing[0].id);
    return;
  }
  await platformPrisma.$executeRawUnsafe('INSERT INTO "User" (id, "tenantId", email, name, role, "passwordHash", "isActive", "sessionVersion", "updatedAt") VALUES ($1,$2,$3,$4,$5::"UserRole",$6,true,1,NOW())', `user-${crypto.randomUUID()}`, resolvedTenantId, email, env('BOOTSTRAP_ADMIN_NAME') || 'Admin User', 'SUPERADMIN', passwordHash);
}

export async function verifyAdminLogin(email: string, secret: string): Promise<VerifiedAdminLogin> {
  return retryDatabaseConnection(async () => {
    await bootstrapOwnerIfConfigured();
    const rows = await platformPrisma.$queryRawUnsafe<UserRow[]>('SELECT u.id, u."tenantId", u.email, u.name, u.role::text as role, u."passwordHash", u."isActive", u."sessionVersion", t.name as "tenantName", t.slug as "tenantSlug" FROM "User" u LEFT JOIN "Tenant" t ON t.id = u."tenantId" WHERE lower(u.email)=lower($1) LIMIT 1', email.trim());
    const user = rows[0];
    if (!user || !user.passwordHash) return { ok: false, error: 'Admin account was not found or has no login password set.' };
    if (user.isActive === false) return { ok: false, error: 'Admin account is disabled.' };
    if (!verifyHash(secret, user.passwordHash)) return { ok: false, error: 'Invalid email or password.' };
    await platformPrisma.$executeRawUnsafe('UPDATE "User" SET "lastLoginAt"=NOW(), "updatedAt"=NOW() WHERE id=$1', user.id);
    const role = mapRole(user.role);
    return {
      ok: true,
      dbUser: { id: user.id, tenantId: user.tenantId, role: user.role, sessionVersion: user.sessionVersion || 1 },
      session: {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        role,
        company: user.tenantName || (role === 'super_admin' ? 'Print Admin SaaS' : 'Print Admin'),
        tenantId: user.tenantSlug || env('DEFAULT_TENANT_ID') || 'holo-print',
        defaultRoute: defaultRoute(role),
      },
    };
  }, 3);
}

export async function dbAuthStatus() {
  return retryDatabaseConnection(async () => {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>('SELECT COUNT(*)::bigint AS count FROM "User" WHERE "passwordHash" IS NOT NULL AND "isActive" IS NOT FALSE');
    const sessions = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>('SELECT COUNT(*)::bigint AS count FROM "AdminSession" WHERE "revokedAt" IS NULL AND "expiresAt" > NOW()').catch(() => [{ count: 0 }]);
    return {
      ok: true,
      activeLoginUsers: Number(rows[0]?.count || 0),
      activeServerSessions: Number(sessions[0]?.count || 0),
      bootstrapConfigured: Boolean(env('BOOTSTRAP_ADMIN_EMAIL') && env('BOOTSTRAP_ADMIN_PASSWORD')),
      runtimeBootstrapEnabled: runtimeBootstrapEnabled(),
    };
  }, 2);
}
