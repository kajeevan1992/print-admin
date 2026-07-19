import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { customerSessionCookieName, ensureStorefrontCustomerTables, loginStorefrontCustomer, type StorefrontCustomer } from '@/core/storefront/customer-account.service';
import { consumeStorefrontCustomerTrustedDevice, createStorefrontCustomerTrustedDevice, revokeAllStorefrontCustomerTrustedDevices } from '@/core/storefront/customer-trusted-device.service';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SESSION_DAYS = 30;
const MAX_CHALLENGE_ATTEMPTS = 8;
const RECOVERY_CODE_COUNT = 10;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export type StorefrontCustomerTwoStepStatus = {
  enabled: boolean;
  enabledAt: string;
  recoveryCodeCount: number;
  setupPending: boolean;
};

type CustomerCredentialRow = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  passwordHash: string;
  isActive: boolean;
  sessionVersion: number;
  emailVerifiedAt: Date | string | null;
  createdAt: Date | string;
};

type MfaRow = {
  customerId: string;
  tenantId: string;
  secretCiphertext: string | null;
  pendingSecretCiphertext: string | null;
  recoveryCodesJson: unknown;
  pendingRecoveryCodesJson: unknown;
  enabledAt: Date | string | null;
};

type ChallengeRow = CustomerCredentialRow & MfaRow & {
  challengeId: string;
  challengeSessionVersion: number;
  returnUrl: string;
  attempts: number;
  expiresAt: Date | string;
  usedAt: Date | string | null;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function iso(value: Date | string) { return new Date(value).toISOString(); }
function verifyPassword(secret: string, stored: string) { const [scheme, iterations, salt, hash] = clean(stored).split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); const left = Buffer.from(hash, 'hex'); const right = Buffer.from(next, 'hex'); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function requestMeta(request: Request) { return { ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '', userAgent: request.headers.get('user-agent') || '' }; }
function cookieValue(request: Request, name: string) { const item = clean(request.headers.get('cookie')).split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
function safeCustomer(row: CustomerCredentialRow): StorefrontCustomer { const verifiedAt = row.emailVerifiedAt ? iso(row.emailVerifiedAt) : ''; return { id: row.id, tenantId: row.tenantId, email: row.email, name: row.name || row.email, phone: row.phone || '', company: row.company || '', emailVerified: Boolean(verifiedAt), emailVerifiedAt: verifiedAt, createdAt: iso(row.createdAt) }; }
function recoveryHashes(value: unknown) { if (Array.isArray(value)) return value.map(clean).filter(Boolean); if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : []; } catch { return []; } } return []; }
function normalizeRecoveryCode(value: unknown) { return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function recoveryHash(value: unknown) { return hashToken(`storefront-recovery:${normalizeRecoveryCode(value)}`); }

function encryptionKey() {
  const material = clean(process.env.CUSTOMER_MFA_ENCRYPTION_KEY || process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL);
  if (!material) throw new Error('Customer two-step verification is not configured on this server.');
  return crypto.createHash('sha256').update(`storefront-mfa:${material}`).digest();
}

function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = clean(payload).split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('Two-step verification data could not be read.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function base32Encode(buffer: Buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let index = 0; index < bits.length; index += 5) output += BASE32_ALPHABET[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  return output;
}

function base32Decode(value: string) {
  const source = clean(value).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const character of source) { const index = BASE32_ALPHABET.indexOf(character); if (index < 0) throw new Error('Invalid authenticator secret.'); bits += index.toString(2).padStart(5, '0'); }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 30000));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(value).padStart(6, '0');
}

function verifyTotp(secret: string, code: unknown) {
  const candidate = clean(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(candidate)) return false;
  return [-1, 0, 1].some((window) => { const expected = Buffer.from(totp(secret, Date.now() + window * 30000)); const supplied = Buffer.from(candidate); return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied); });
}

function createRecoveryCodes() {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => `${crypto.randomBytes(4).toString('hex').slice(0, 4)}-${crypto.randomBytes(4).toString('hex').slice(0, 4)}`.toUpperCase());
  return { codes, hashes: codes.map(recoveryHash) };
}

async function resolveTenantId(tenantSlug: string) {
  const key = slug(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Storefront tenant was not found.');
  return rows[0].id;
}

async function ensureTwoStepTables() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerMfa" ("customerId" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"secretCiphertext" TEXT,"pendingSecretCiphertext" TEXT,"recoveryCodesJson" JSONB NOT NULL DEFAULT '[]'::jsonb,"pendingRecoveryCodesJson" JSONB NOT NULL DEFAULT '[]'::jsonb,"enabledAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerMfaChallenge" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"sessionVersion" INTEGER NOT NULL,"returnUrl" TEXT NOT NULL,"attempts" INTEGER NOT NULL DEFAULT 0,"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"ipAddress" TEXT,"userAgent" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerMfa_tenant_idx" ON "StorefrontCustomerMfa"("tenantId","enabledAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerMfaChallenge_scope_idx" ON "StorefrontCustomerMfaChallenge"("tenantId","storeSlug","expiresAt")');
  await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontCustomerMfaChallenge" WHERE "expiresAt" < NOW() - INTERVAL \'1 day\' OR "usedAt" < NOW() - INTERVAL \'1 day\'').catch(() => 0);
}

async function credentialByCustomer(customer: StorefrontCustomer) {
  await ensureTwoStepTables();
  const rows = await platformPrisma.$queryRawUnsafe<CustomerCredentialRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE id=$1 AND "tenantId"=$2 LIMIT 1', customer.id, customer.tenantId);
  const row = rows[0];
  if (!row || row.isActive === false) throw new Error('This customer account is not active.');
  return row;
}

async function mfaRow(customerId: string, tenantId: string) {
  await ensureTwoStepTables();
  const rows = await platformPrisma.$queryRawUnsafe<MfaRow[]>('SELECT "customerId","tenantId","secretCiphertext","pendingSecretCiphertext","recoveryCodesJson","pendingRecoveryCodesJson","enabledAt" FROM "StorefrontCustomerMfa" WHERE "customerId"=$1 AND "tenantId"=$2 LIMIT 1', customerId, tenantId);
  return rows[0] || null;
}

function statusFromRow(row: MfaRow | null): StorefrontCustomerTwoStepStatus {
  return { enabled: Boolean(row?.enabledAt && row.secretCiphertext), enabledAt: row?.enabledAt ? iso(row.enabledAt) : '', recoveryCodeCount: recoveryHashes(row?.recoveryCodesJson).length, setupPending: Boolean(row?.pendingSecretCiphertext) };
}

function currentSessionHash(request: Request, tenantSlug: string, storeSlug: string) {
  const token = cookieValue(request, customerSessionCookieName(tenantSlug, storeSlug));
  return token ? hashToken(token) : '';
}

async function revokeOtherSessions(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string) {
  const currentHash = currentSessionHash(request, tenantSlug, storeSlug);
  if (!currentHash) return;
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "tokenHash"<>$4 AND "revokedAt" IS NULL', customer.id, customer.tenantId, slug(storeSlug), currentHash);
}

export function customerTwoStepChallengeCookieName(tenantSlug: string, storeSlug: string) { const digest = crypto.createHash('sha1').update(`${slug(tenantSlug)}:${slug(storeSlug)}`).digest('hex').slice(0, 18); return `sf_customer_mfa_${digest}`; }
export function setCustomerTwoStepChallengeCookie(response: NextResponse, tenantSlug: string, storeSlug: string, token: string, expiresAt: Date) { response.cookies.set(customerTwoStepChallengeCookieName(tenantSlug, storeSlug), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt }); }
export function clearCustomerTwoStepChallengeCookie(response: NextResponse, tenantSlug: string, storeSlug: string) { response.cookies.set(customerTwoStepChallengeCookieName(tenantSlug, storeSlug), '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }); }

export async function getStorefrontCustomerTwoStepStatus(customer: StorefrontCustomer) { return statusFromRow(await mfaRow(customer.id, customer.tenantId)); }
export async function isStorefrontCustomerTwoStepEnabled(customer: StorefrontCustomer) { return (await getStorefrontCustomerTwoStepStatus(customer)).enabled; }

export async function beginStorefrontCustomerLogin(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; password: string; returnUrl: string }) {
  await ensureTwoStepTables();
  const tenantId = await resolveTenantId(input.tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<CustomerCredentialRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) LIMIT 1', tenantId, email(input.email));
  const customer = rows[0];
  if (!customer?.passwordHash || customer.isActive === false || !verifyPassword(clean(input.password), customer.passwordHash)) throw new Error('Invalid email or password.');
  const configuration = await mfaRow(customer.id, tenantId);
  if (!configuration?.enabledAt || !configuration.secretCiphertext) return { requiresTwoStep: false as const, trustedDeviceUsed: false as const, ...(await loginStorefrontCustomer(input)) };

  const trusted = await consumeStorefrontCustomerTrustedDevice(request, { customerId: customer.id, tenantId, tenantSlug: input.tenantSlug, storeSlug: input.storeSlug, sessionVersion: customer.sessionVersion });
  if (trusted.trusted) {
    const session = await loginStorefrontCustomer(input);
    return { requiresTwoStep: false as const, trustedDeviceUsed: true as const, trustedDeviceToken: trusted.token, trustedDeviceExpiresAt: trusted.expiresAt, ...session };
  }

  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const meta = requestMeta(request);
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerMfaChallenge" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "usedAt" IS NULL', customer.id, tenantId, slug(input.storeSlug));
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerMfaChallenge" (id,"customerId","tenantId","storeSlug","tokenHash","sessionVersion","returnUrl","expiresAt","ipAddress","userAgent","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())', `sfcmfa-${crypto.randomUUID()}`, customer.id, tenantId, slug(input.storeSlug), hashToken(token), customer.sessionVersion, clean(input.returnUrl), expiresAt, meta.ip, meta.userAgent);
  });
  return { requiresTwoStep: true as const, challengeToken: token, expiresAt, customer: safeCustomer(customer), clearTrustedDevice: trusted.clearCookie };
}

export async function completeStorefrontCustomerTwoStepLogin(request: Request, input: { tenantSlug: string; storeSlug: string; code: string; rememberDevice?: boolean }) {
  await ensureTwoStepTables();
  const tenantId = await resolveTenantId(input.tenantSlug);
  const rawToken = cookieValue(request, customerTwoStepChallengeCookieName(input.tenantSlug, input.storeSlug));
  if (!rawToken) throw new Error('This two-step sign-in has expired. Start again.');
  const meta = requestMeta(request);
  const outcome = await platformPrisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<ChallengeRow[]>(`SELECT ch.id AS "challengeId",ch."sessionVersion" AS "challengeSessionVersion",ch."returnUrl",ch.attempts,ch."expiresAt",ch."usedAt",c.id,c."tenantId",c.email,c.name,c.phone,c.company,c."passwordHash",c."isActive",c."sessionVersion",c."emailVerifiedAt",c."createdAt",m."customerId",m."secretCiphertext",m."pendingSecretCiphertext",m."recoveryCodesJson",m."pendingRecoveryCodesJson",m."enabledAt" FROM "StorefrontCustomerMfaChallenge" ch JOIN "StorefrontCustomer" c ON c.id=ch."customerId" JOIN "StorefrontCustomerMfa" m ON m."customerId"=c.id WHERE ch."tokenHash"=$1 AND ch."tenantId"=$2 AND ch."storeSlug"=$3 LIMIT 1 FOR UPDATE`, hashToken(rawToken), tenantId, slug(input.storeSlug));
    const row = rows[0];
    if (!row || row.usedAt || row.isActive === false || !row.enabledAt || !row.secretCiphertext || row.challengeSessionVersion !== row.sessionVersion || row.attempts >= MAX_CHALLENGE_ATTEMPTS || new Date(row.expiresAt).getTime() <= Date.now()) return { ok: false as const, expired: true };
    const secret = decryptSecret(row.secretCiphertext);
    const candidate = clean(input.code);
    let recoveryUsed = false;
    let nextRecoveryHashes = recoveryHashes(row.recoveryCodesJson);
    let verified = verifyTotp(secret, candidate);
    if (!verified) {
      const digest = recoveryHash(candidate);
      const index = nextRecoveryHashes.indexOf(digest);
      if (index >= 0) { verified = true; recoveryUsed = true; nextRecoveryHashes = nextRecoveryHashes.filter((_, recoveryIndex) => recoveryIndex !== index); }
    }
    if (!verified) { await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerMfaChallenge" SET attempts=attempts+1,"updatedAt"=NOW() WHERE id=$1', row.challengeId); return { ok: false as const, expired: false }; }
    const used = await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerMfaChallenge" SET "usedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "usedAt" IS NULL', row.challengeId);
    if (!used) return { ok: false as const, expired: true };
    if (recoveryUsed) await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerMfa" SET "recoveryCodesJson"=$1::jsonb,"updatedAt"=NOW() WHERE "customerId"=$2 AND "tenantId"=$3', JSON.stringify(nextRecoveryHashes), row.id, tenantId);
    const sessionToken = crypto.randomBytes(48).toString('base64url');
    const sessionExpiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerSession" (id,"customerId","tenantId","storeSlug","tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', `sfc-sess-${crypto.randomUUID()}`, row.id, tenantId, slug(input.storeSlug), hashToken(sessionToken), row.sessionVersion, meta.ip, meta.userAgent, sessionExpiresAt);
    return { ok: true as const, customer: safeCustomer(row), token: sessionToken, expiresAt: sessionExpiresAt, redirectUrl: row.returnUrl, recoveryUsed, recoveryCodeCount: nextRecoveryHashes.length };
  });
  if (!outcome.ok) throw new Error(outcome.expired ? 'This two-step sign-in has expired. Start again.' : 'That authenticator or recovery code is not valid.');
  if (!input.rememberDevice) return outcome;
  const trusted = await createStorefrontCustomerTrustedDevice(request, outcome.customer, input.storeSlug);
  return { ...outcome, trustedDeviceToken: trusted.token, trustedDeviceExpiresAt: trusted.expiresAt, trustedDeviceId: trusted.deviceId };
}

export async function beginStorefrontCustomerTwoStepSetup(request: Request, customer: StorefrontCustomer, input: { tenantSlug: string; storeSlug: string; currentPassword: string; brandName: string }) {
  const credential = await credentialByCustomer(customer);
  if (!credential.emailVerifiedAt) throw new Error('Verify your login email before enabling two-step verification.');
  if (!verifyPassword(clean(input.currentPassword), credential.passwordHash)) throw new Error('Current password is incorrect.');
  const existing = await mfaRow(customer.id, customer.tenantId);
  if (existing?.enabledAt && existing.secretCiphertext) throw new Error('Two-step verification is already enabled. Disable it with your current authenticator or recovery code before setting up a replacement.');
  const secret = base32Encode(crypto.randomBytes(20));
  const recovery = createRecoveryCodes();
  await platformPrisma.$executeRawUnsafe(`INSERT INTO "StorefrontCustomerMfa" ("customerId","tenantId","pendingSecretCiphertext","pendingRecoveryCodesJson","updatedAt") VALUES ($1,$2,$3,$4::jsonb,NOW()) ON CONFLICT ("customerId") DO UPDATE SET "pendingSecretCiphertext"=EXCLUDED."pendingSecretCiphertext","pendingRecoveryCodesJson"=EXCLUDED."pendingRecoveryCodesJson","updatedAt"=NOW()`, customer.id, customer.tenantId, encryptSecret(secret), JSON.stringify(recovery.hashes));
  const issuer = clean(input.brandName) || 'Print store';
  const label = `${issuer}:${credential.email}`;
  return { status: { ...(await getStorefrontCustomerTwoStepStatus(customer)), setupPending: true }, secret, recoveryCodes: recovery.codes, otpauthUri: `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30` };
}

export async function confirmStorefrontCustomerTwoStepSetup(request: Request, customer: StorefrontCustomer, input: { tenantSlug: string; storeSlug: string; code: string }) {
  const row = await mfaRow(customer.id, customer.tenantId);
  if (!row?.pendingSecretCiphertext) throw new Error('Start two-step setup again.');
  if (row.enabledAt && row.secretCiphertext) throw new Error('Two-step verification is already enabled. Disable it with your current authenticator or recovery code before setting up a replacement.');
  const secret = decryptSecret(row.pendingSecretCiphertext);
  if (!verifyTotp(secret, input.code)) throw new Error('That authenticator code is not valid.');
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerMfa" SET "secretCiphertext"="pendingSecretCiphertext","recoveryCodesJson"="pendingRecoveryCodesJson","pendingSecretCiphertext"=NULL,"pendingRecoveryCodesJson"=\'[]\'::jsonb,"enabledAt"=NOW(),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2', customer.id, customer.tenantId);
  await revokeOtherSessions(request, customer, input.tenantSlug, input.storeSlug);
  return getStorefrontCustomerTwoStepStatus(customer);
}

async function verifyCurrentTwoStep(customer: StorefrontCustomer, code: string) {
  const row = await mfaRow(customer.id, customer.tenantId);
  if (!row?.enabledAt || !row.secretCiphertext) throw new Error('Two-step verification is not enabled.');
  const secret = decryptSecret(row.secretCiphertext);
  if (verifyTotp(secret, code)) return { recoveryUsed: false, nextRecoveryHashes: recoveryHashes(row.recoveryCodesJson) };
  const hashes = recoveryHashes(row.recoveryCodesJson);
  const digest = recoveryHash(code);
  const index = hashes.indexOf(digest);
  if (index < 0) throw new Error('That authenticator or recovery code is not valid.');
  return { recoveryUsed: true, nextRecoveryHashes: hashes.filter((_, recoveryIndex) => recoveryIndex !== index) };
}

export async function disableStorefrontCustomerTwoStep(request: Request, customer: StorefrontCustomer, input: { tenantSlug: string; storeSlug: string; currentPassword: string; code: string }) {
  const credential = await credentialByCustomer(customer);
  if (!verifyPassword(clean(input.currentPassword), credential.passwordHash)) throw new Error('Current password is incorrect.');
  await verifyCurrentTwoStep(customer, input.code);
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerMfa" SET "secretCiphertext"=NULL,"pendingSecretCiphertext"=NULL,"recoveryCodesJson"=\'[]\'::jsonb,"pendingRecoveryCodesJson"=\'[]\'::jsonb,"enabledAt"=NULL,"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2', customer.id, customer.tenantId);
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerMfaChallenge" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "usedAt" IS NULL', customer.id, customer.tenantId);
  await revokeAllStorefrontCustomerTrustedDevices(customer, input.storeSlug);
  await revokeOtherSessions(request, customer, input.tenantSlug, input.storeSlug);
  return getStorefrontCustomerTwoStepStatus(customer);
}

export async function regenerateStorefrontCustomerRecoveryCodes(customer: StorefrontCustomer, input: { currentPassword: string; code: string }) {
  const credential = await credentialByCustomer(customer);
  if (!verifyPassword(clean(input.currentPassword), credential.passwordHash)) throw new Error('Current password is incorrect.');
  await verifyCurrentTwoStep(customer, input.code);
  const recovery = createRecoveryCodes();
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerMfa" SET "recoveryCodesJson"=$1::jsonb,"updatedAt"=NOW() WHERE "customerId"=$2 AND "tenantId"=$3 AND "enabledAt" IS NOT NULL', JSON.stringify(recovery.hashes), customer.id, customer.tenantId);
  return { status: await getStorefrontCustomerTwoStepStatus(customer), recoveryCodes: recovery.codes };
}

export async function revokeUncommittedStorefrontCustomerSession(token: string) {
  const value = clean(token);
  if (!value) return;
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "tokenHash"=$1', hashToken(value));
}
