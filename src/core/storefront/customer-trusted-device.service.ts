import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { ensureStorefrontCustomerTables, type StorefrontCustomer } from '@/core/storefront/customer-account.service';

const TRUST_DAYS = 30;
const MAX_TRUSTED_DEVICES = 10;

export type StorefrontCustomerTrustedDeviceView = {
  id: string;
  current: boolean;
  device: string;
  browser: string;
  locationHint: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

type TrustedDeviceRow = {
  id: string;
  tokenHash: string;
  sessionVersion: number;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
  lastUsedAt: Date | string;
  revokedAt: Date | string | null;
};

type CustomerSecurityRow = {
  id: string;
  tenantId: string;
  passwordHash: string;
  isActive: boolean;
  sessionVersion: number;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function iso(value: Date | string) { return new Date(value).toISOString(); }
function cookieValue(request: Request, name: string) { const raw = request.headers.get('cookie') || ''; const item = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
function requestMeta(request: Request) { return { ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '', userAgent: request.headers.get('user-agent') || '' }; }
function verifyPassword(secret: string, stored: string) { const [scheme, iterations, salt, hash] = clean(stored).split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); const left = Buffer.from(hash, 'hex'); const right = Buffer.from(next, 'hex'); return left.length === right.length && crypto.timingSafeEqual(left, right); }

function userAgentSummary(value: string | null) {
  const ua = clean(value);
  const lower = ua.toLowerCase();
  const device = lower.includes('iphone') ? 'iPhone' : lower.includes('ipad') ? 'iPad' : lower.includes('android') ? 'Android device' : lower.includes('windows') ? 'Windows computer' : lower.includes('macintosh') || lower.includes('mac os') ? 'Mac' : lower.includes('linux') ? 'Linux computer' : ua ? 'Unknown device' : 'Device details unavailable';
  const browser = lower.includes('edg/') ? 'Microsoft Edge' : lower.includes('firefox/') ? 'Firefox' : lower.includes('crios/') ? 'Chrome' : lower.includes('chrome/') ? 'Chrome' : lower.includes('safari/') ? 'Safari' : ua ? 'Unknown browser' : 'Browser unavailable';
  return { device, browser };
}

function maskIp(value: string | null) {
  const ip = clean(value).split(',')[0]?.trim() || '';
  if (!ip) return 'Network unavailable';
  if (ip.includes(':')) return `${ip.split(':').slice(0, 4).join(':')}::`;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.x` : 'Network recorded';
}

async function ensureTrustedDeviceTable() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerTrustedDevice" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"sessionVersion" INTEGER NOT NULL,"ipAddress" TEXT,"userAgent" TEXT,"expiresAt" TIMESTAMP(3) NOT NULL,"lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerTrustedDevice_scope_idx" ON "StorefrontCustomerTrustedDevice"("customerId","tenantId","storeSlug","expiresAt")');
  await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontCustomerTrustedDevice" WHERE "expiresAt" < NOW() - INTERVAL \'7 days\' OR "revokedAt" < NOW() - INTERVAL \'7 days\'').catch(() => 0);
}

async function customerSecurityRow(customer: StorefrontCustomer) {
  await ensureTrustedDeviceTable();
  const rows = await platformPrisma.$queryRawUnsafe<CustomerSecurityRow[]>('SELECT id,"tenantId","passwordHash","isActive","sessionVersion" FROM "StorefrontCustomer" WHERE id=$1 AND "tenantId"=$2 LIMIT 1', customer.id, customer.tenantId);
  const row = rows[0];
  if (!row || row.isActive === false) throw new Error('This customer account is not active.');
  return row;
}

function view(row: TrustedDeviceRow, currentHash: string): StorefrontCustomerTrustedDeviceView {
  const agent = userAgentSummary(row.userAgent);
  return { id: row.id, current: Boolean(currentHash && row.tokenHash === currentHash), device: agent.device, browser: agent.browser, locationHint: maskIp(row.ipAddress), createdAt: iso(row.createdAt), lastUsedAt: iso(row.lastUsedAt), expiresAt: iso(row.expiresAt) };
}

export function customerTrustedDeviceCookieName(tenantSlug: string, storeSlug: string) {
  const digest = crypto.createHash('sha1').update(`${slug(tenantSlug)}:${slug(storeSlug)}`).digest('hex').slice(0, 18);
  return `sf_customer_trusted_${digest}`;
}

export function setCustomerTrustedDeviceCookie(response: NextResponse, tenantSlug: string, storeSlug: string, token: string, expiresAt: Date) {
  response.cookies.set(customerTrustedDeviceCookieName(tenantSlug, storeSlug), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
}

export function clearCustomerTrustedDeviceCookie(response: NextResponse, tenantSlug: string, storeSlug: string) {
  response.cookies.set(customerTrustedDeviceCookieName(tenantSlug, storeSlug), '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export async function consumeStorefrontCustomerTrustedDevice(request: Request, input: { customerId: string; tenantId: string; storeSlug: string; sessionVersion: number }) {
  await ensureTrustedDeviceTable();
  const rawToken = cookieValue(request, customerTrustedDeviceCookieName(input.tenantId, input.storeSlug));
  if (!rawToken) return { trusted: false as const, clearCookie: false };
  const tokenHash = hashToken(rawToken);
  const meta = requestMeta(request);
  const result = await platformPrisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<TrustedDeviceRow[]>('SELECT id,"tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","createdAt","lastUsedAt","revokedAt" FROM "StorefrontCustomerTrustedDevice" WHERE "tokenHash"=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 LIMIT 1 FOR UPDATE', tokenHash, input.customerId, input.tenantId, slug(input.storeSlug));
    const row = rows[0];
    const valid = Boolean(row && !row.revokedAt && row.sessionVersion === input.sessionVersion && new Date(row.expiresAt).getTime() > Date.now());
    if (!valid) {
      if (row && !row.revokedAt) await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1', row.id);
      return { trusted: false as const, clearCookie: true };
    }
    const nextToken = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + TRUST_DAYS * 86400000);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "tokenHash"=$1,"ipAddress"=$2,"userAgent"=$3,"lastUsedAt"=NOW(),"expiresAt"=$4,"updatedAt"=NOW() WHERE id=$5 AND "tokenHash"=$6', hashToken(nextToken), meta.ip, meta.userAgent, expiresAt, row.id, tokenHash);
    return { trusted: true as const, clearCookie: false, token: nextToken, expiresAt, deviceId: row.id };
  });
  return result;
}

export async function createStorefrontCustomerTrustedDevice(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string) {
  const security = await customerSecurityRow(customer);
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + TRUST_DAYS * 86400000);
  const meta = requestMeta(request);
  const id = `sfctd-${crypto.randomUUID()}`;
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerTrustedDevice" (id,"customerId","tenantId","storeSlug","tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","lastUsedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())', id, customer.id, customer.tenantId, slug(storeSlug), hashToken(token), security.sessionVersion, meta.ip, meta.userAgent, expiresAt);
    await tx.$executeRawUnsafe(`UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE id IN (SELECT id FROM "StorefrontCustomerTrustedDevice" WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "revokedAt" IS NULL AND "expiresAt">NOW() ORDER BY "lastUsedAt" DESC OFFSET ${MAX_TRUSTED_DEVICES})`, customer.id, customer.tenantId, slug(storeSlug));
  });
  return { token, expiresAt, deviceId: id };
}

export async function listStorefrontCustomerTrustedDevices(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string) {
  const security = await customerSecurityRow(customer);
  const currentToken = cookieValue(request, customerTrustedDeviceCookieName(tenantSlug, storeSlug));
  const currentHash = currentToken ? hashToken(currentToken) : '';
  const rows = await platformPrisma.$queryRawUnsafe<TrustedDeviceRow[]>(`SELECT id,"tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","createdAt","lastUsedAt","revokedAt" FROM "StorefrontCustomerTrustedDevice" WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "revokedAt" IS NULL AND "expiresAt">NOW() AND "sessionVersion"=$4 ORDER BY CASE WHEN "tokenHash"=$5 THEN 0 ELSE 1 END,"lastUsedAt" DESC`, customer.id, customer.tenantId, slug(storeSlug), security.sessionVersion, currentHash || '__none__');
  return rows.map((row) => view(row, currentHash));
}

export async function revokeStorefrontCustomerTrustedDevice(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string, deviceId: string) {
  await ensureTrustedDeviceTable();
  const id = clean(deviceId);
  if (!id) throw new Error('Choose a trusted browser to remove.');
  const currentToken = cookieValue(request, customerTrustedDeviceCookieName(tenantSlug, storeSlug));
  const currentHash = currentToken ? hashToken(currentToken) : '';
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tokenHash: string }>>('SELECT id,"tokenHash" FROM "StorefrontCustomerTrustedDevice" WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 AND "revokedAt" IS NULL LIMIT 1', id, customer.id, customer.tenantId, slug(storeSlug));
  const row = rows[0];
  if (!row) throw new Error('That trusted browser is no longer active.');
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3', id, customer.id, customer.tenantId);
  return { revoked: true, current: Boolean(currentHash && row.tokenHash === currentHash), deviceId: id };
}

export async function revokeAllStorefrontCustomerTrustedDevices(customer: StorefrontCustomer, input?: { currentPassword?: string }) {
  const security = await customerSecurityRow(customer);
  if (input?.currentPassword !== undefined && !verifyPassword(clean(input.currentPassword), security.passwordHash)) throw new Error('Current password is incorrect.');
  const count = await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, customer.tenantId);
  return { revokedCount: Number(count || 0) };
}
