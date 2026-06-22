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

async function ensureAuthTables() {
  await platformPrisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE','TRIAL','SUSPENDED','PENDING_ACTIVATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await platformPrisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN','TENANT_OWNER','TENANT_ADMIN','TENANT_STAFF','CUSTOMER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "defaultSubdomain" TEXT NOT NULL UNIQUE,
    "primaryDomain" TEXT,
    "planName" TEXT NOT NULL DEFAULT 'Starter',
    "storefrontsLimit" INTEGER NOT NULL DEFAULT 1,
    "adminUsersLimit" INTEGER NOT NULL DEFAULT 3,
    "storageLimitGb" INTEGER NOT NULL DEFAULT 10,
    "themeKey" TEXT NOT NULL DEFAULT 'base',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId")');
}

async function ensureAuthColumns() {
  await ensureAuthTables();
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1');
}

async function bootstrapOwnerIfConfigured() {
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
  await bootstrapOwnerIfConfigured();
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>('SELECT COUNT(*)::bigint AS count FROM "User" WHERE "passwordHash" IS NOT NULL AND "isActive" IS NOT FALSE');
  return { ok: true, activeLoginUsers: Number(rows[0]?.count || 0), bootstrapConfigured: Boolean(env('BOOTSTRAP_ADMIN_EMAIL') && env('BOOTSTRAP_ADMIN_PASSWORD')) };
}
