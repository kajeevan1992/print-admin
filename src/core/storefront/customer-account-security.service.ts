import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { ensureStorefrontCustomerTables, loginStorefrontCustomer } from '@/core/storefront/customer-account.service';

const VERIFY_EMAIL_TTL_MS = 48 * 60 * 60 * 1000;
const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;

type SecurityPurpose = 'verify-email' | 'reset-password';
type SecurityCustomerRow = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  isActive: boolean;
  sessionVersion: number;
  emailVerifiedAt: Date | string | null;
};
type SecurityTokenRow = SecurityCustomerRow & {
  tokenId: string;
  expiresAt: Date | string;
  usedAt: Date | string | null;
  storeSlug: string;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function hashPassword(secret: string, salt = crypto.randomBytes(16).toString('hex')) { const iterations = 210000; const hash = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256').toString('hex'); return `pbkdf2_sha256$${iterations}$${salt}$${hash}`; }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function requestMeta(request?: Request) { return { ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers.get('x-real-ip') || '', userAgent: request?.headers.get('user-agent') || '' }; }

async function resolveTenantId(tenantSlug: string) {
  const key = slug(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Storefront tenant was not found.');
  return rows[0].id;
}

async function ensureSecurityTables() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerSecurityToken" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"purpose" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"ipAddress" TEXT,"userAgent" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerSecurityToken_scope_idx" ON "StorefrontCustomerSecurityToken"("tenantId","storeSlug","purpose","expiresAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerSecurityToken_customer_idx" ON "StorefrontCustomerSecurityToken"("customerId","purpose")');
  await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontCustomerSecurityToken" WHERE "expiresAt" < NOW() - INTERVAL \'30 days\' OR "usedAt" < NOW() - INTERVAL \'30 days\'').catch(() => 0);
}

async function findCustomer(tenantId: string, customerEmail: string) {
  const rows = await platformPrisma.$queryRawUnsafe<SecurityCustomerRow[]>('SELECT id,"tenantId",email,name,"isActive","sessionVersion","emailVerifiedAt" FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) LIMIT 1', tenantId, customerEmail);
  return rows[0] || null;
}

export async function issueCustomerSecurityToken(input: { tenantSlug: string; storeSlug: string; email: string; purpose: SecurityPurpose }, request?: Request) {
  await ensureSecurityTables();
  const customerEmail = email(input.email);
  if (!validEmail(customerEmail)) return null;
  const tenantId = await resolveTenantId(input.tenantSlug);
  const customer = await findCustomer(tenantId, customerEmail);
  if (!customer || customer.isActive === false) return null;
  if (input.purpose === 'verify-email' && customer.emailVerifiedAt) return { customer, alreadyComplete: true, token: '', expiresAt: new Date(0) };
  const storeSlug = slug(input.storeSlug);
  const ttl = input.purpose === 'verify-email' ? VERIFY_EMAIL_TTL_MS : RESET_PASSWORD_TTL_MS;
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + ttl);
  const meta = requestMeta(request);
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND purpose=$4 AND "usedAt" IS NULL', customer.id, tenantId, storeSlug, input.purpose);
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerSecurityToken" (id,"customerId","tenantId","storeSlug",purpose,"tokenHash","expiresAt","ipAddress","userAgent","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', `sfct-${crypto.randomUUID()}`, customer.id, tenantId, storeSlug, input.purpose, hashToken(token), expiresAt, meta.ip, meta.userAgent);
  });
  return { customer, alreadyComplete: false, token, expiresAt };
}

async function securityToken(input: { tenantSlug: string; storeSlug: string; token: string; purpose: SecurityPurpose }) {
  await ensureSecurityTables();
  const token = clean(input.token);
  if (token.length < 32) throw new Error('This secure link is invalid or has expired.');
  const tenantId = await resolveTenantId(input.tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<SecurityTokenRow[]>(`SELECT t.id AS "tokenId",t."expiresAt",t."usedAt",t."storeSlug",c.id,c."tenantId",c.email,c.name,c."isActive",c."sessionVersion",c."emailVerifiedAt" FROM "StorefrontCustomerSecurityToken" t JOIN "StorefrontCustomer" c ON c.id=t."customerId" WHERE t."tokenHash"=$1 AND t."tenantId"=$2 AND t."storeSlug"=$3 AND t.purpose=$4 LIMIT 1`, hashToken(token), tenantId, slug(input.storeSlug), input.purpose);
  const row = rows[0];
  if (!row || row.usedAt || row.isActive === false || new Date(row.expiresAt).getTime() <= Date.now()) throw new Error('This secure link is invalid or has expired.');
  return { tenantId, row };
}

export async function verifyStorefrontCustomerEmail(input: { tenantSlug: string; storeSlug: string; token: string }) {
  const { row } = await securityToken({ ...input, purpose: 'verify-email' });
  await platformPrisma.$transaction(async (tx) => {
    const used = await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "usedAt" IS NULL AND "expiresAt">NOW()', row.tokenId);
    if (!used) throw new Error('This secure link is invalid or has expired.');
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET "emailVerifiedAt"=COALESCE("emailVerifiedAt",NOW()),"updatedAt"=NOW() WHERE id=$1 AND "tenantId"=$2', row.id, row.tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND purpose=\'verify-email\' AND "usedAt" IS NULL', row.id);
  });
  return { customerId: row.id, email: row.email, name: row.name, verified: true };
}

export async function resetStorefrontCustomerPassword(input: { tenantSlug: string; storeSlug: string; token: string; password: string }) {
  const password = clean(input.password);
  if (password.length < 10) throw new Error('Password must contain at least 10 characters.');
  const { tenantId, row } = await securityToken({ ...input, purpose: 'reset-password' });
  await platformPrisma.$transaction(async (tx) => {
    const used = await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "usedAt" IS NULL AND "expiresAt">NOW()', row.tokenId);
    if (!used) throw new Error('This secure link is invalid or has expired.');
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET "passwordHash"=$1,"sessionVersion"="sessionVersion"+1,"updatedAt"=NOW() WHERE id=$2 AND "tenantId"=$3', hashPassword(password), row.id, tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2', row.id, tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND purpose=\'reset-password\' AND "usedAt" IS NULL', row.id);
  });
  return loginStorefrontCustomer({ tenantSlug: input.tenantSlug, storeSlug: input.storeSlug, email: row.email, password });
}
