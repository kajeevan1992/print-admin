import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';

export type AdminAuthSession = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'tenant_admin' | 'ops_manager';
  company: string;
  tenantId: string;
  defaultRoute: string;
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

async function ensureAuthColumns() {
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1');
}

async function bootstrapOwnerIfConfigured() {
  const email = env('BOOTSTRAP_ADMIN_EMAIL');
  const secret = env('BOOTSTRAP_ADMIN_PASSWORD');
  if (!email || !secret) return;
  const existing = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "User" WHERE lower(email)=lower($1) LIMIT 1', email);
  if (existing.length) return;
  const tenantSlug = env('DEFAULT_TENANT_ID') || 'holo-print';
  const tenantRows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; name: string; slug: string }>>('SELECT id, name, slug FROM "Tenant" WHERE slug=$1 LIMIT 1', tenantSlug);
  const tenantId = tenantRows[0]?.id || null;
  await platformPrisma.$executeRawUnsafe('INSERT INTO "User" (id, "tenantId", email, name, role, "passwordHash", "isActive", "sessionVersion", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,true,1,NOW(),NOW())', `admin_${Date.now()}`, tenantId, email.toLowerCase(), env('BOOTSTRAP_ADMIN_NAME') || 'Admin User', 'SUPERADMIN', pbkdf2Hash(secret));
}

export async function verifyAdminLogin(email: string, secret: string): Promise<{ ok: boolean; session?: AdminAuthSession; error?: string }> {
  await ensureAuthColumns();
  await bootstrapOwnerIfConfigured();
  const rows = await platformPrisma.$queryRawUnsafe<UserRow[]>('SELECT u.id, u."tenantId", u.email, u.name, u.role::text as role, u."passwordHash", u."isActive", u."sessionVersion", t.name as "tenantName", t.slug as "tenantSlug" FROM "User" u LEFT JOIN "Tenant" t ON t.id = u."tenantId" WHERE lower(u.email)=lower($1) LIMIT 1', email.trim());
  const user = rows[0];
  if (!user || !user.passwordHash) return { ok: false, error: 'Admin account was not found or has no login password set.' };
  if (user.isActive === false) return { ok: false, error: 'Admin account is disabled.' };
  if (!verifyHash(secret, user.passwordHash)) return { ok: false, error: 'Invalid email or password.' };
  await platformPrisma.$executeRawUnsafe('UPDATE "User" SET "lastLoginAt"=NOW(), "updatedAt"=NOW() WHERE id=$1', user.id);
  const role = mapRole(user.role);
  return { ok: true, session: { id: user.id, name: user.name || user.email, email: user.email, role, company: user.tenantName || (role === 'super_admin' ? 'Print Admin SaaS' : 'Print Admin'), tenantId: user.tenantSlug || env('DEFAULT_TENANT_ID') || 'holo-print', defaultRoute: defaultRoute(role) } };
}

export async function dbAuthStatus() {
  await ensureAuthColumns();
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>('SELECT COUNT(*)::bigint AS count FROM "User" WHERE "passwordHash" IS NOT NULL AND "isActive" IS NOT FALSE');
  return { ok: true, activeLoginUsers: Number(rows[0]?.count || 0), bootstrapConfigured: Boolean(env('BOOTSTRAP_ADMIN_EMAIL') && env('BOOTSTRAP_ADMIN_PASSWORD')) };
}
