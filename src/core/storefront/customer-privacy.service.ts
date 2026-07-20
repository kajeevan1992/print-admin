import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { ensureStorefrontCustomerTables, type StorefrontCustomer } from '@/core/storefront/customer-account.service';

function clean(value: unknown) { return String(value || '').trim(); }
function verifyPassword(secret: string, stored: string) {
  const [scheme, iterations, salt, hash] = clean(stored).split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false;
  const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex');
  const left = Buffer.from(hash, 'hex');
  const right = Buffer.from(next, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function credential(customer: StorefrontCustomer) {
  await ensureStorefrontCustomerTables();
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string; email: string; name: string; passwordHash: string; isActive: boolean; emailVerifiedAt: Date | string | null }>>(
    'SELECT id,"tenantId",email,name,"passwordHash","isActive","emailVerifiedAt" FROM "StorefrontCustomer" WHERE id=$1 AND "tenantId"=$2 LIMIT 1',
    customer.id,
    customer.tenantId,
  );
  const row = rows[0];
  if (!row || row.isActive === false) throw new Error('This customer account is not active.');
  return row;
}

export async function verifyCustomerPrivacyPassword(customer: StorefrontCustomer, currentPassword: string) {
  const row = await credential(customer);
  if (!verifyPassword(clean(currentPassword), row.passwordHash)) throw new Error('Current password is incorrect.');
  return row;
}

export async function closeStorefrontCustomerAccount(customer: StorefrontCustomer, input: { currentPassword: string; confirmation: string }) {
  const row = await verifyCustomerPrivacyPassword(customer, input.currentPassword);
  if (clean(input.confirmation).toUpperCase() !== 'CLOSE MY ACCOUNT') throw new Error('Type CLOSE MY ACCOUNT exactly to confirm account closure.');
  if (!row.emailVerifiedAt) throw new Error('Verify the login email before closing this account.');

  const closedAt = new Date();
  const anonymisedEmail = `closed+${crypto.randomUUID()}@customer.invalid`;
  const unusablePassword = `closed$${crypto.randomBytes(48).toString('base64url')}`;

  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2', customer.id, customer.tenantId);
    await tx.$executeRawUnsafe('DELETE FROM "StorefrontCustomerAddress" WHERE "customerId"=$1 AND "tenantId"=$2', customer.id, customer.tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET email=$1,name=$2,phone=\'\',company=\'\',"passwordHash"=$3,"isActive"=false,"sessionVersion"="sessionVersion"+1,"emailVerifiedAt"=NULL,"updatedAt"=NOW() WHERE id=$4 AND "tenantId"=$5', anonymisedEmail, 'Closed customer', unusablePassword, customer.id, customer.tenantId);

    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "customerId"=$1 AND "tenantId"=$2 AND "usedAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "cancelledAt"=COALESCE("cancelledAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "completedAt" IS NULL AND "cancelledAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerMfaChallenge" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "usedAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('DELETE FROM "StorefrontCustomerMfa" WHERE "customerId"=$1 AND "tenantId"=$2', customer.id, customer.tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskey" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskeyChallenge" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "customerId"=$1 AND "tenantId"=$2 AND "usedAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
  });

  return { email: row.email, name: row.name, closedAt: closedAt.toISOString() };
}
