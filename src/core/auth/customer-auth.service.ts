import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';

export const CUSTOMER_SESSION_COOKIE = 'print_customer_session';
const SESSION_DAYS = 30;

type CustomerRow = { id: string; tenantId: string | null; email: string; name: string | null; passwordHash: string | null; isActive: boolean; sessionVersion: number | null; tenantSlug: string | null; tenantName: string | null };
function hmac(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function cleanEmail(value: string) { return value.trim().toLowerCase(); }
function hashSecret(secret: string, salt = crypto.randomBytes(16).toString('hex')) { const hash = crypto.pbkdf2Sync(secret, salt, 180000, 32, 'sha256').toString('hex'); return `pbkdf2_sha256$180000$${salt}$${hash}`; }
function verifySecret(secret: string, stored: string) { const [scheme, iterations, salt, hash] = stored.split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex')); }
function getIp() { const h = headers(); return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || ''; }
function getUserAgent() { return headers().get('user-agent') || ''; }
function publicCustomer(row: CustomerRow) { return { id: row.id, email: row.email, name: row.name || row.email, tenantId: row.tenantSlug || row.tenantId || 'holo-print', company: row.tenantName || 'Print Store' }; }
function appUrl() { return (process.env.NEXT_PUBLIC_APP_URL || process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL || '').replace(/\/$/, ''); }

async function ensureCustomerTables() {
  await platformPrisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN','TENANT_OWNER','TENANT_ADMIN','TENANT_STAFF','CUSTOMER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY,"tenantId" TEXT,"email" TEXT NOT NULL UNIQUE,"name" TEXT,"role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',"passwordHash" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,"lastLoginAt" TIMESTAMP(3),"sessionVersion" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerSession" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL,"tenantId" TEXT,"tokenHash" TEXT NOT NULL UNIQUE,"sessionVersion" INTEGER NOT NULL DEFAULT 1,"ipAddress" TEXT,"userAgent" TEXT,"expiresAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerPasswordReset" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL,"tenantId" TEXT,"tokenHash" TEXT NOT NULL UNIQUE,"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerSession_userId_idx" ON "CustomerSession"("userId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerPasswordReset_userId_idx" ON "CustomerPasswordReset"("userId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerPasswordReset_expiresAt_idx" ON "CustomerPasswordReset"("expiresAt")');
}

async function findTenantId(slugOrId?: string) {
  const value = String(slugOrId || process.env.DEFAULT_TENANT_ID || 'holo-print').trim();
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 LIMIT 1', value).catch(() => []);
  return rows[0]?.id || null;
}
async function findCustomer(email: string) { const rows = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT u.id,u."tenantId",u.email,u.name,u."passwordHash",u."isActive",u."sessionVersion",t.slug AS "tenantSlug",t.name AS "tenantName" FROM "User" u LEFT JOIN "Tenant" t ON t.id=u."tenantId" WHERE lower(u.email)=lower($1) AND u.role::text=\'CUSTOMER\' LIMIT 1', email); return rows[0] || null; }
async function createCustomerSession(user: CustomerRow) { const token = crypto.randomBytes(48).toString('base64url'); const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000); await platformPrisma.$executeRawUnsafe('INSERT INTO "CustomerSession" (id,"userId","tenantId","tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())', `custsess-${crypto.randomUUID()}`, user.id, user.tenantId, hmac(token), user.sessionVersion || 1, getIp(), getUserAgent(), expiresAt); return { token, expiresAt }; }
export function setCustomerCookie(response: NextResponse, token: string, expiresAt: Date) { response.cookies.set(CUSTOMER_SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt }); }
export function clearCustomerCookie(response: NextResponse) { response.cookies.set(CUSTOMER_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }); }

export async function registerCustomer(input: { email: string; password: string; name?: string; tenantId?: string }) {
  await ensureCustomerTables(); const email = cleanEmail(input.email || ''); const password = String(input.password || ''); if (!email.includes('@')) throw new Error('Valid email is required.'); if (password.length < 8) throw new Error('Password must be at least 8 characters.'); const tenantId = await findTenantId(input.tenantId); const existing = await findCustomer(email); if (existing) throw new Error('Customer account already exists.'); const id = `customer-${crypto.randomUUID()}`; await platformPrisma.$executeRawUnsafe('INSERT INTO "User" (id,"tenantId",email,name,role,"passwordHash","isActive","sessionVersion","updatedAt") VALUES ($1,$2,$3,$4,\'CUSTOMER\',$5,true,1,NOW())', id, tenantId, email, input.name || email, hashSecret(password)); const customer = await findCustomer(email); if (!customer) throw new Error('Customer account could not be created.'); return { customer: publicCustomer(customer), serverSession: await createCustomerSession(customer) };
}

export async function loginCustomer(input: { email: string; password: string }) {
  await ensureCustomerTables(); const email = cleanEmail(input.email || ''); const customer = await findCustomer(email); if (!customer || !customer.passwordHash) throw new Error('Invalid email or password.'); if (!customer.isActive) throw new Error('Customer account is disabled.'); if (!verifySecret(String(input.password || ''), customer.passwordHash)) throw new Error('Invalid email or password.'); await platformPrisma.$executeRawUnsafe('UPDATE "User" SET "lastLoginAt"=NOW(),"updatedAt"=NOW() WHERE id=$1', customer.id); return { customer: publicCustomer(customer), serverSession: await createCustomerSession(customer) };
}

export async function readCustomerSessionFromCookie() { await ensureCustomerTables(); const token = cookies().get(CUSTOMER_SESSION_COOKIE)?.value; if (!token) return null; const rows = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT u.id,u."tenantId",u.email,u.name,u."passwordHash",u."isActive",u."sessionVersion",t.slug AS "tenantSlug",t.name AS "tenantName" FROM "CustomerSession" s JOIN "User" u ON u.id=s."userId" LEFT JOIN "Tenant" t ON t.id=s."tenantId" WHERE s."tokenHash"=$1 AND s."revokedAt" IS NULL AND s."expiresAt" > NOW() AND u."isActive" IS TRUE LIMIT 1', hmac(token)); return rows[0] ? publicCustomer(rows[0]) : null; }
export async function logoutCustomer() { await ensureCustomerTables(); const token = cookies().get(CUSTOMER_SESSION_COOKIE)?.value; if (!token) return; await platformPrisma.$executeRawUnsafe('UPDATE "CustomerSession" SET "revokedAt"=NOW(),"updatedAt"=NOW() WHERE "tokenHash"=$1', hmac(token)); }

export async function requestPasswordReset(input: { email: string }) {
  await ensureCustomerTables(); const customer = await findCustomer(cleanEmail(input.email || '')); if (!customer) return { ok: true, resetUrl: '' }; const token = crypto.randomBytes(32).toString('base64url'); await platformPrisma.$executeRawUnsafe('INSERT INTO "CustomerPasswordReset" (id,"userId","tenantId","tokenHash","expiresAt") VALUES ($1,$2,$3,$4,$5)', `reset-${crypto.randomUUID()}`, customer.id, customer.tenantId, hmac(token), new Date(Date.now() + 60 * 60 * 1000)); const base = appUrl(); return { ok: true, resetUrl: base ? `${base}/customer-account?resetToken=${token}` : `/customer-account?resetToken=${token}` };
}

export async function resetCustomerPassword(input: { token: string; password: string }) {
  await ensureCustomerTables(); const password = String(input.password || ''); if (password.length < 8) throw new Error('Password must be at least 8 characters.'); const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; userId: string }>>('SELECT id,"userId" FROM "CustomerPasswordReset" WHERE "tokenHash"=$1 AND "usedAt" IS NULL AND "expiresAt" > NOW() LIMIT 1', hmac(String(input.token || ''))); const item = rows[0]; if (!item) throw new Error('Reset link is invalid or expired.'); await platformPrisma.$executeRawUnsafe('UPDATE "User" SET "passwordHash"=$1,"sessionVersion"="sessionVersion"+1,"updatedAt"=NOW() WHERE id=$2', hashSecret(password), item.userId); await platformPrisma.$executeRawUnsafe('UPDATE "CustomerPasswordReset" SET "usedAt"=NOW() WHERE id=$1', item.id); return { ok: true };
}
