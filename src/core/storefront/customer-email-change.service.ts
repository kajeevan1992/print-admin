import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { ensureStorefrontCustomerTables, type StorefrontCustomer } from '@/core/storefront/customer-account.service';

const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

export type StorefrontCustomerEmailChangeView = {
  id: string;
  oldEmail: string;
  newEmail: string;
  oldConfirmed: boolean;
  newConfirmed: boolean;
  expiresAt: string;
  createdAt: string;
};

type EmailChangeRow = {
  id: string;
  customerId: string;
  tenantId: string;
  storeSlug: string;
  oldEmail: string;
  newEmail: string;
  oldTokenHash: string;
  newTokenHash: string;
  oldConfirmedAt: Date | string | null;
  newConfirmedAt: Date | string | null;
  expiresAt: Date | string;
  completedAt: Date | string | null;
  cancelledAt: Date | string | null;
  createdAt: Date | string;
  name?: string;
  passwordHash?: string;
  isActive?: boolean;
  currentEmail?: string;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function iso(value: Date | string) { return new Date(value).toISOString(); }
function verifyPassword(secret: string, stored: string) { const [scheme, iterations, salt, hash] = clean(stored).split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); const left = Buffer.from(hash, 'hex'); const right = Buffer.from(next, 'hex'); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function requestMeta(request?: Request) { return { ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers.get('x-real-ip') || '', userAgent: request?.headers.get('user-agent') || '' }; }

function safeView(row: EmailChangeRow): StorefrontCustomerEmailChangeView {
  return { id: row.id, oldEmail: row.oldEmail, newEmail: row.newEmail, oldConfirmed: Boolean(row.oldConfirmedAt), newConfirmed: Boolean(row.newConfirmedAt), expiresAt: iso(row.expiresAt), createdAt: iso(row.createdAt) };
}

async function resolveTenantId(tenantSlug: string) {
  const key = slug(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Storefront tenant was not found.');
  return rows[0].id;
}

async function ensureEmailChangeTable() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerEmailChange" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"oldEmail" TEXT NOT NULL,"newEmail" TEXT NOT NULL,"oldTokenHash" TEXT NOT NULL UNIQUE,"newTokenHash" TEXT NOT NULL UNIQUE,"oldConfirmedAt" TIMESTAMP(3),"newConfirmedAt" TIMESTAMP(3),"expiresAt" TIMESTAMP(3) NOT NULL,"completedAt" TIMESTAMP(3),"cancelledAt" TIMESTAMP(3),"ipAddress" TEXT,"userAgent" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerEmailChange_customer_idx" ON "StorefrontCustomerEmailChange"("customerId","tenantId","storeSlug","expiresAt")');
  await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontCustomerEmailChange" WHERE "expiresAt" < NOW() - INTERVAL \'30 days\' OR "completedAt" < NOW() - INTERVAL \'30 days\' OR "cancelledAt" < NOW() - INTERVAL \'30 days\'').catch(() => 0);
}

async function credentialRow(customer: StorefrontCustomer) {
  await ensureStorefrontCustomerTables();
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string; email: string; name: string; passwordHash: string; isActive: boolean }>>('SELECT id,"tenantId",email,name,"passwordHash","isActive" FROM "StorefrontCustomer" WHERE id=$1 AND "tenantId"=$2 LIMIT 1', customer.id, customer.tenantId);
  const row = rows[0];
  if (!row || row.isActive === false) throw new Error('This customer account is not active.');
  return row;
}

export async function getPendingStorefrontCustomerEmailChange(customer: StorefrontCustomer, storeSlug: string) {
  await ensureEmailChangeTable();
  const rows = await platformPrisma.$queryRawUnsafe<EmailChangeRow[]>('SELECT id,"customerId","tenantId","storeSlug","oldEmail","newEmail","oldTokenHash","newTokenHash","oldConfirmedAt","newConfirmedAt","expiresAt","completedAt","cancelledAt","createdAt" FROM "StorefrontCustomerEmailChange" WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "completedAt" IS NULL AND "cancelledAt" IS NULL AND "expiresAt">NOW() ORDER BY "createdAt" DESC LIMIT 1', customer.id, customer.tenantId, slug(storeSlug));
  return rows[0] ? safeView(rows[0]) : null;
}

export async function requestStorefrontCustomerEmailChange(request: Request, customer: StorefrontCustomer, input: { storeSlug: string; currentPassword: string; newEmail: string }) {
  await ensureEmailChangeTable();
  const row = await credentialRow(customer);
  if (!verifyPassword(clean(input.currentPassword), row.passwordHash)) throw new Error('Current password is incorrect.');
  const newEmail = email(input.newEmail);
  if (!validEmail(newEmail)) throw new Error('Enter a valid new email address.');
  if (newEmail === email(row.email)) throw new Error('Enter a different email address.');
  const duplicate = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) AND id<>$3 LIMIT 1', customer.tenantId, newEmail, customer.id);
  if (duplicate[0]) throw new Error('That email address is already used by another customer account.');

  const oldToken = crypto.randomBytes(48).toString('base64url');
  const newToken = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MS);
  const id = `sfcec-${crypto.randomUUID()}`;
  const meta = requestMeta(request);
  const scope = slug(input.storeSlug);
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "cancelledAt"=COALESCE("cancelledAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "completedAt" IS NULL AND "cancelledAt" IS NULL', customer.id, customer.tenantId, scope);
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerEmailChange" (id,"customerId","tenantId","storeSlug","oldEmail","newEmail","oldTokenHash","newTokenHash","expiresAt","ipAddress","userAgent","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())', id, customer.id, customer.tenantId, scope, email(row.email), newEmail, hashToken(oldToken), hashToken(newToken), expiresAt, meta.ip, meta.userAgent);
  });
  return { change: { id, oldEmail: email(row.email), newEmail, oldConfirmed: false, newConfirmed: false, expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString() } as StorefrontCustomerEmailChangeView, oldToken, newToken, name: row.name || customer.name };
}

export async function cancelStorefrontCustomerEmailChange(customer: StorefrontCustomer, storeSlug: string, changeId?: string) {
  await ensureEmailChangeTable();
  const id = clean(changeId);
  const count = id
    ? await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "cancelledAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 AND "completedAt" IS NULL AND "cancelledAt" IS NULL', id, customer.id, customer.tenantId, slug(storeSlug))
    : await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "cancelledAt"=NOW(),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "completedAt" IS NULL AND "cancelledAt" IS NULL', customer.id, customer.tenantId, slug(storeSlug));
  return { cancelled: Number(count || 0) > 0 };
}

export async function confirmStorefrontCustomerEmailChange(input: { tenantSlug: string; storeSlug: string; token: string }) {
  await ensureEmailChangeTable();
  const token = clean(input.token);
  if (token.length < 32) throw new Error('This email-change link is invalid or has expired.');
  const tenantId = await resolveTenantId(input.tenantSlug);
  const tokenDigest = hashToken(token);
  const scope = slug(input.storeSlug);

  return platformPrisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<EmailChangeRow[]>(`SELECT r.id,r."customerId",r."tenantId",r."storeSlug",r."oldEmail",r."newEmail",r."oldTokenHash",r."newTokenHash",r."oldConfirmedAt",r."newConfirmedAt",r."expiresAt",r."completedAt",r."cancelledAt",r."createdAt",c.name,c."isActive",c.email AS "currentEmail" FROM "StorefrontCustomerEmailChange" r JOIN "StorefrontCustomer" c ON c.id=r."customerId" WHERE r."tenantId"=$1 AND r."storeSlug"=$2 AND (r."oldTokenHash"=$3 OR r."newTokenHash"=$3) LIMIT 1 FOR UPDATE`, tenantId, scope, tokenDigest);
    const row = rows[0];
    if (!row || row.cancelledAt || row.completedAt || row.isActive === false || new Date(row.expiresAt).getTime() <= Date.now()) throw new Error('This email-change link is invalid or has expired.');
    const side = row.oldTokenHash === tokenDigest ? 'old' : row.newTokenHash === tokenDigest ? 'new' : '';
    if (!side) throw new Error('This email-change link is invalid or has expired.');
    if (side === 'old' && !row.oldConfirmedAt) await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "oldConfirmedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1', row.id);
    if (side === 'new' && !row.newConfirmedAt) await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "newConfirmedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1', row.id);

    const refreshed = (await tx.$queryRawUnsafe<EmailChangeRow[]>('SELECT id,"customerId","tenantId","storeSlug","oldEmail","newEmail","oldTokenHash","newTokenHash","oldConfirmedAt","newConfirmedAt","expiresAt","completedAt","cancelledAt","createdAt" FROM "StorefrontCustomerEmailChange" WHERE id=$1 LIMIT 1 FOR UPDATE', row.id))[0];
    const oldConfirmed = Boolean(refreshed.oldConfirmedAt);
    const newConfirmed = Boolean(refreshed.newConfirmedAt);
    if (!oldConfirmed || !newConfirmed) return { completed: false, side, oldConfirmed, newConfirmed, oldEmail: row.oldEmail, newEmail: row.newEmail, name: row.name || 'Customer' };

    if (email(row.currentEmail) !== email(row.oldEmail)) throw new Error('This email-change request is no longer current.');
    const duplicate = await tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) AND id<>$3 LIMIT 1 FOR UPDATE', tenantId, row.newEmail, row.customerId);
    if (duplicate[0]) throw new Error('That email address is already used by another customer account.');

    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET email=$1,"emailVerifiedAt"=NOW(),"sessionVersion"="sessionVersion"+1,"updatedAt"=NOW() WHERE id=$2 AND "tenantId"=$3', row.newEmail, row.customerId, tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2', row.customerId, tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "usedAt" IS NULL', row.customerId, tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "completedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "completedAt" IS NULL', row.id);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "cancelledAt"=COALESCE("cancelledAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND id<>$3 AND "completedAt" IS NULL AND "cancelledAt" IS NULL', row.customerId, tenantId, row.id);
    return { completed: true, side, oldConfirmed: true, newConfirmed: true, oldEmail: row.oldEmail, newEmail: row.newEmail, name: row.name || 'Customer' };
  });
}
