import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { ensureStorefrontCustomerTables, type StorefrontCustomer } from '@/core/storefront/customer-account.service';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_DAYS = 30;
const MAX_PASSKEYS = 10;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

type CustomerSecurityRow = {
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

type PasskeyRow = {
  id: string;
  customerId: string;
  tenantId: string;
  storeSlug: string;
  credentialId: string;
  publicKey: string;
  counter: bigint | number | string;
  transportsJson: unknown;
  deviceType: string;
  backedUp: boolean;
  name: string;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
  revokedAt: Date | string | null;
};

type ChallengeRow = {
  id: string;
  customerId: string | null;
  tenantId: string;
  storeSlug: string;
  purpose: string;
  tokenHash: string;
  challenge: string;
  rpId: string;
  origin: string;
  returnUrl: string;
  expiresAt: Date | string;
  usedAt: Date | string | null;
};

type MfaRow = { secretCiphertext: string | null; enabledAt: Date | string | null };

export type StorefrontCustomerPasskeyView = {
  id: string;
  name: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function iso(value: Date | string) { return new Date(value).toISOString(); }
function cookieValue(request: Request, name: string) { const item = clean(request.headers.get('cookie')).split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
function requestMeta(request: Request) { return { ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '', userAgent: request.headers.get('user-agent') || '' }; }
function verifyPassword(secret: string, stored: string) { const [scheme, iterations, salt, hash] = clean(stored).split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); const left = Buffer.from(hash, 'hex'); const right = Buffer.from(next, 'hex'); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function jsonStrings(value: unknown) { if (Array.isArray(value)) return value.map(clean).filter(Boolean); if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : []; } catch { return []; } } return []; }
function safeCustomer(row: CustomerSecurityRow): StorefrontCustomer { const verifiedAt = row.emailVerifiedAt ? iso(row.emailVerifiedAt) : ''; return { id: row.id, tenantId: row.tenantId, email: row.email, name: row.name || row.email, phone: row.phone || '', company: row.company || '', emailVerified: Boolean(verifiedAt), emailVerifiedAt: verifiedAt, createdAt: iso(row.createdAt) }; }
function passkeyView(row: PasskeyRow): StorefrontCustomerPasskeyView { return { id: row.id, name: row.name || 'Passkey', deviceType: row.deviceType || 'singleDevice', backedUp: Boolean(row.backedUp), createdAt: iso(row.createdAt), lastUsedAt: row.lastUsedAt ? iso(row.lastUsedAt) : '' }; }

function relyingParty(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = clean(request.headers.get('x-forwarded-host')).split(',')[0]?.trim();
  const host = forwardedHost || clean(request.headers.get('host')) || url.host;
  const forwardedProto = clean(request.headers.get('x-forwarded-proto')).split(',')[0]?.trim();
  const protocol = forwardedProto || url.protocol.replace(':', '') || 'https';
  const hostname = host.replace(/^\[|\]$/g, '').split(':')[0].toLowerCase();
  if (!hostname || !/^[a-z0-9.-]+$/.test(hostname)) throw new Error('Passkeys are not available for this storefront host.');
  return { rpId: hostname, origin: `${protocol}://${host}` };
}

function encryptionKey() {
  const material = clean(process.env.CUSTOMER_MFA_ENCRYPTION_KEY || process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL);
  if (!material) throw new Error('Customer security is not configured on this server.');
  return crypto.createHash('sha256').update(`storefront-mfa:${material}`).digest();
}

function decryptMfaSecret(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = clean(payload).split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('Two-step verification data could not be read.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function base32Decode(value: string) {
  const source = clean(value).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const character of source) { const index = BASE32_ALPHABET.indexOf(character); if (index < 0) return Buffer.alloc(0); bits += index.toString(2).padStart(5, '0'); }
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
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}

function verifyTotp(secret: string, code: unknown) {
  const candidate = clean(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(candidate)) return false;
  return [-1, 0, 1].some((window) => { const expected = Buffer.from(totp(secret, Date.now() + window * 30000)); const supplied = Buffer.from(candidate); return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied); });
}

async function resolveTenantId(tenantSlug: string) {
  const key = slug(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Storefront tenant was not found.');
  return rows[0].id;
}

async function ensurePasskeyTables() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerPasskey" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"credentialId" TEXT NOT NULL UNIQUE,"publicKey" TEXT NOT NULL,"counter" BIGINT NOT NULL DEFAULT 0,"transportsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,"deviceType" TEXT NOT NULL DEFAULT 'singleDevice',"backedUp" BOOLEAN NOT NULL DEFAULT false,"name" TEXT NOT NULL DEFAULT 'Passkey',"lastUsedAt" TIMESTAMP(3),"revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerPasskeyChallenge" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"purpose" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"challenge" TEXT NOT NULL,"rpId" TEXT NOT NULL,"origin" TEXT NOT NULL,"returnUrl" TEXT NOT NULL DEFAULT '',"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"ipAddress" TEXT,"userAgent" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerPasskey_scope_idx" ON "StorefrontCustomerPasskey"("customerId","tenantId","storeSlug","revokedAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerPasskeyChallenge_scope_idx" ON "StorefrontCustomerPasskeyChallenge"("tenantId","storeSlug","purpose","expiresAt")');
  await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontCustomerPasskeyChallenge" WHERE "expiresAt" < NOW() - INTERVAL \'1 day\' OR "usedAt" < NOW() - INTERVAL \'1 day\'').catch(() => 0);
}

async function securityRow(customer: StorefrontCustomer) {
  await ensurePasskeyTables();
  const rows = await platformPrisma.$queryRawUnsafe<CustomerSecurityRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE id=$1 AND "tenantId"=$2 LIMIT 1', customer.id, customer.tenantId);
  const row = rows[0];
  if (!row || row.isActive === false) throw new Error('This customer account is not active.');
  return row;
}

async function verifyEnrollmentAuthority(customer: StorefrontCustomer, currentPassword: string, twoStepCode: string) {
  const row = await securityRow(customer);
  if (!row.emailVerifiedAt) throw new Error('Verify your login email before adding a passkey.');
  if (!verifyPassword(clean(currentPassword), row.passwordHash)) throw new Error('Current password is incorrect.');
  const mfaRows = await platformPrisma.$queryRawUnsafe<MfaRow[]>('SELECT "secretCiphertext","enabledAt" FROM "StorefrontCustomerMfa" WHERE "customerId"=$1 AND "tenantId"=$2 LIMIT 1', customer.id, customer.tenantId).catch(() => [] as MfaRow[]);
  const mfa = mfaRows[0];
  if (mfa?.enabledAt && mfa.secretCiphertext) {
    if (!verifyTotp(decryptMfaSecret(mfa.secretCiphertext), twoStepCode)) throw new Error('Enter a valid six-digit authenticator code to manage passkeys.');
  }
  return row;
}

function challengeCookieName(tenantSlug: string, storeSlug: string, purpose: 'registration' | 'authentication') {
  const digest = crypto.createHash('sha1').update(`${slug(tenantSlug)}:${slug(storeSlug)}:${purpose}`).digest('hex').slice(0, 18);
  return `sf_customer_pk_${purpose === 'registration' ? 'r' : 'a'}_${digest}`;
}

export function setCustomerPasskeyChallengeCookie(response: NextResponse, tenantSlug: string, storeSlug: string, purpose: 'registration' | 'authentication', token: string, expiresAt: Date) {
  response.cookies.set(challengeCookieName(tenantSlug, storeSlug, purpose), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
}

export function clearCustomerPasskeyChallengeCookie(response: NextResponse, tenantSlug: string, storeSlug: string, purpose: 'registration' | 'authentication') {
  response.cookies.set(challengeCookieName(tenantSlug, storeSlug, purpose), '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export async function listStorefrontCustomerPasskeys(customer: StorefrontCustomer, storeSlug: string) {
  await ensurePasskeyTables();
  const rows = await platformPrisma.$queryRawUnsafe<PasskeyRow[]>('SELECT id,"customerId","tenantId","storeSlug","credentialId","publicKey",counter,"transportsJson","deviceType","backedUp",name,"createdAt","lastUsedAt","revokedAt" FROM "StorefrontCustomerPasskey" WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "revokedAt" IS NULL ORDER BY "lastUsedAt" DESC NULLS LAST,"createdAt" DESC', customer.id, customer.tenantId, slug(storeSlug));
  return rows.map(passkeyView);
}

export async function beginStorefrontCustomerPasskeyRegistration(request: Request, customer: StorefrontCustomer, input: { tenantSlug: string; storeSlug: string; currentPassword: string; twoStepCode: string; brandName: string }) {
  const row = await verifyEnrollmentAuthority(customer, input.currentPassword, input.twoStepCode);
  const current = await platformPrisma.$queryRawUnsafe<PasskeyRow[]>('SELECT id,"customerId","tenantId","storeSlug","credentialId","publicKey",counter,"transportsJson","deviceType","backedUp",name,"createdAt","lastUsedAt","revokedAt" FROM "StorefrontCustomerPasskey" WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "revokedAt" IS NULL ORDER BY "createdAt" DESC', customer.id, customer.tenantId, slug(input.storeSlug));
  if (current.length >= MAX_PASSKEYS) throw new Error(`Remove an existing passkey before adding more than ${MAX_PASSKEYS}.`);
  const rp = relyingParty(request);
  const options = await generateRegistrationOptions({
    rpName: clean(input.brandName) || 'Print store',
    rpID: rp.rpId,
    userID: new Uint8Array(crypto.createHash('sha256').update(`${row.tenantId}:${row.id}`).digest()),
    userName: row.email,
    userDisplayName: row.name || row.email,
    timeout: CHALLENGE_TTL_MS,
    attestationType: 'none',
    excludeCredentials: current.map((item) => ({ id: item.credentialId, transports: jsonStrings(item.transportsJson) as any })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    supportedAlgorithmIDs: [-7, -257] as any,
  });
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const meta = requestMeta(request);
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskeyChallenge" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND purpose=\'registration\' AND "usedAt" IS NULL', customer.id, customer.tenantId, slug(input.storeSlug));
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerPasskeyChallenge" (id,"customerId","tenantId","storeSlug",purpose,"tokenHash",challenge,"rpId",origin,"expiresAt","ipAddress","userAgent","updatedAt") VALUES ($1,$2,$3,$4,\'registration\',$5,$6,$7,$8,$9,$10,$11,NOW())', `sfcpkc-${crypto.randomUUID()}`, customer.id, customer.tenantId, slug(input.storeSlug), hashToken(token), options.challenge, rp.rpId, rp.origin, expiresAt, meta.ip, meta.userAgent);
  });
  return { options, challengeToken: token, expiresAt };
}

export async function completeStorefrontCustomerPasskeyRegistration(request: Request, customer: StorefrontCustomer, input: { tenantSlug: string; storeSlug: string; name: string; response: any }) {
  await ensurePasskeyTables();
  const rawToken = cookieValue(request, challengeCookieName(input.tenantSlug, input.storeSlug, 'registration'));
  if (!rawToken) throw new Error('This passkey setup has expired. Start again.');
  const rp = relyingParty(request);
  const result = await platformPrisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<ChallengeRow[]>('SELECT id,"customerId","tenantId","storeSlug",purpose,"tokenHash",challenge,"rpId",origin,"returnUrl","expiresAt","usedAt" FROM "StorefrontCustomerPasskeyChallenge" WHERE "tokenHash"=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 AND purpose=\'registration\' LIMIT 1 FOR UPDATE', hashToken(rawToken), customer.id, customer.tenantId, slug(input.storeSlug));
    const challenge = rows[0];
    if (!challenge || challenge.usedAt || new Date(challenge.expiresAt).getTime() <= Date.now() || challenge.rpId !== rp.rpId || challenge.origin !== rp.origin) throw new Error('This passkey setup has expired. Start again.');
    const verification: any = await verifyRegistrationResponse({ response: input.response, expectedChallenge: challenge.challenge, expectedOrigin: challenge.origin, expectedRPID: challenge.rpId, requireUserVerification: true });
    if (!verification.verified || !verification.registrationInfo?.credential) throw new Error('The passkey could not be verified.');
    const info = verification.registrationInfo;
    const credential = info.credential;
    const credentialId = clean(credential.id || input.response?.id);
    if (!credentialId) throw new Error('The passkey credential was not returned.');
    const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "StorefrontCustomerPasskey" WHERE "credentialId"=$1 LIMIT 1', credentialId);
    if (existing[0]) throw new Error('This passkey is already registered.');
    const id = `sfcpk-${crypto.randomUUID()}`;
    const label = clean(input.name).slice(0, 80) || 'Passkey';
    const transports = Array.isArray(input.response?.response?.transports) ? input.response.response.transports : credential.transports || [];
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerPasskey" (id,"customerId","tenantId","storeSlug","credentialId","publicKey",counter,"transportsJson","deviceType","backedUp",name,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,NOW())', id, customer.id, customer.tenantId, slug(input.storeSlug), credentialId, Buffer.from(credential.publicKey).toString('base64url'), BigInt(credential.counter || 0), JSON.stringify(transports), clean(info.credentialDeviceType) || 'singleDevice', Boolean(info.credentialBackedUp), label);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskeyChallenge" SET "usedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "usedAt" IS NULL', challenge.id);
    const saved = await tx.$queryRawUnsafe<PasskeyRow[]>('SELECT id,"customerId","tenantId","storeSlug","credentialId","publicKey",counter,"transportsJson","deviceType","backedUp",name,"createdAt","lastUsedAt","revokedAt" FROM "StorefrontCustomerPasskey" WHERE id=$1 LIMIT 1', id);
    return passkeyView(saved[0]);
  });
  return result;
}

export async function beginStorefrontCustomerPasskeyLogin(request: Request, input: { tenantSlug: string; storeSlug: string; returnUrl: string }) {
  await ensurePasskeyTables();
  const tenantId = await resolveTenantId(input.tenantSlug);
  const rp = relyingParty(request);
  const options = await generateAuthenticationOptions({ rpID: rp.rpId, timeout: CHALLENGE_TTL_MS, userVerification: 'required', allowCredentials: [] });
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const meta = requestMeta(request);
  await platformPrisma.$executeRawUnsafe('INSERT INTO "StorefrontCustomerPasskeyChallenge" (id,"tenantId","storeSlug",purpose,"tokenHash",challenge,"rpId",origin,"returnUrl","expiresAt","ipAddress","userAgent","updatedAt") VALUES ($1,$2,$3,\'authentication\',$4,$5,$6,$7,$8,$9,$10,$11,NOW())', `sfcpkc-${crypto.randomUUID()}`, tenantId, slug(input.storeSlug), hashToken(token), options.challenge, rp.rpId, rp.origin, clean(input.returnUrl), expiresAt, meta.ip, meta.userAgent);
  return { options, challengeToken: token, expiresAt };
}

export async function completeStorefrontCustomerPasskeyLogin(request: Request, input: { tenantSlug: string; storeSlug: string; response: any }) {
  await ensurePasskeyTables();
  const tenantId = await resolveTenantId(input.tenantSlug);
  const rawToken = cookieValue(request, challengeCookieName(input.tenantSlug, input.storeSlug, 'authentication'));
  if (!rawToken) throw new Error('This passkey sign-in has expired. Try again.');
  const rp = relyingParty(request);
  const meta = requestMeta(request);
  return platformPrisma.$transaction(async (tx) => {
    const challenges = await tx.$queryRawUnsafe<ChallengeRow[]>('SELECT id,"customerId","tenantId","storeSlug",purpose,"tokenHash",challenge,"rpId",origin,"returnUrl","expiresAt","usedAt" FROM "StorefrontCustomerPasskeyChallenge" WHERE "tokenHash"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND purpose=\'authentication\' LIMIT 1 FOR UPDATE', hashToken(rawToken), tenantId, slug(input.storeSlug));
    const challenge = challenges[0];
    if (!challenge || challenge.usedAt || new Date(challenge.expiresAt).getTime() <= Date.now() || challenge.rpId !== rp.rpId || challenge.origin !== rp.origin) throw new Error('This passkey sign-in has expired. Try again.');
    const credentialId = clean(input.response?.id);
    const rows = await tx.$queryRawUnsafe<Array<PasskeyRow & CustomerSecurityRow>>(`SELECT p.id,p."customerId",p."tenantId",p."storeSlug",p."credentialId",p."publicKey",p.counter,p."transportsJson",p."deviceType",p."backedUp",p.name,p."createdAt",p."lastUsedAt",p."revokedAt",c.email,c.name AS "customerName",c.phone,c.company,c."passwordHash",c."isActive",c."sessionVersion",c."emailVerifiedAt",c."createdAt" AS "customerCreatedAt" FROM "StorefrontCustomerPasskey" p JOIN "StorefrontCustomer" c ON c.id=p."customerId" WHERE p."credentialId"=$1 AND p."tenantId"=$2 AND p."storeSlug"=$3 AND p."revokedAt" IS NULL LIMIT 1 FOR UPDATE`, credentialId, tenantId, slug(input.storeSlug));
    const joined: any = rows[0];
    if (!joined || joined.isActive === false) throw new Error('This passkey is not recognised for this store.');
    const verification: any = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpId,
      requireUserVerification: true,
      credential: { id: joined.credentialId, publicKey: new Uint8Array(Buffer.from(joined.publicKey, 'base64url')), counter: Number(joined.counter || 0), transports: jsonStrings(joined.transportsJson) as any },
    });
    if (!verification.verified) throw new Error('The passkey could not be verified.');
    const newCounter = Number(verification.authenticationInfo?.newCounter || joined.counter || 0);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskey" SET counter=$1,"lastUsedAt"=NOW(),"updatedAt"=NOW() WHERE id=$2', BigInt(newCounter), joined.id);
    const used = await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskeyChallenge" SET "usedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "usedAt" IS NULL', challenge.id);
    if (!used) throw new Error('This passkey sign-in has already been used.');
    const token = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await tx.$executeRawUnsafe('INSERT INTO "StorefrontCustomerSession" (id,"customerId","tenantId","storeSlug","tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', `sfc-sess-${crypto.randomUUID()}`, joined.customerId, tenantId, slug(input.storeSlug), hashToken(token), Number(joined.sessionVersion || 1), meta.ip, meta.userAgent, expiresAt);
    const customerRow: CustomerSecurityRow = { id: joined.customerId, tenantId, email: joined.email, name: joined.customerName || joined.email, phone: joined.phone || '', company: joined.company || '', passwordHash: joined.passwordHash, isActive: joined.isActive, sessionVersion: Number(joined.sessionVersion || 1), emailVerifiedAt: joined.emailVerifiedAt, createdAt: joined.customerCreatedAt };
    return { customer: safeCustomer(customerRow), token, expiresAt, returnUrl: challenge.returnUrl, passkeyId: joined.id };
  });
}

export async function revokeStorefrontCustomerPasskey(customer: StorefrontCustomer, input: { storeSlug: string; passkeyId: string; currentPassword: string; twoStepCode: string }) {
  await verifyEnrollmentAuthority(customer, input.currentPassword, input.twoStepCode);
  const id = clean(input.passkeyId);
  if (!id) throw new Error('Choose a passkey to remove.');
  const count = await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskey" SET "revokedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 AND "revokedAt" IS NULL', id, customer.id, customer.tenantId, slug(input.storeSlug));
  if (!count) throw new Error('That passkey is no longer active.');
  return { revoked: true, passkeyId: id };
}
