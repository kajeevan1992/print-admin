import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import {
  customerSessionCookieName,
  ensureStorefrontCustomerTables,
  loginStorefrontCustomer,
  type StorefrontCustomer,
} from '@/core/storefront/customer-account.service';

export type StorefrontCustomerSessionView = {
  id: string;
  current: boolean;
  device: string;
  browser: string;
  locationHint: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type SessionRecord = {
  id: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
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

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function hashPassword(secret: string, salt = crypto.randomBytes(16).toString('hex')) { const iterations = 210000; const hash = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256').toString('hex'); return `pbkdf2_sha256$${iterations}$${salt}$${hash}`; }
function verifyPassword(secret: string, stored: string) { const [scheme, iterations, salt, hash] = clean(stored).split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); const left = Buffer.from(hash, 'hex'); const right = Buffer.from(next, 'hex'); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function iso(value: Date | string) { return new Date(value).toISOString(); }
function cookieValue(request: Request, name: string) { const raw = request.headers.get('cookie') || ''; const item = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
function currentTokenHash(request: Request, tenantSlug: string, storeSlug: string) { const token = cookieValue(request, customerSessionCookieName(tenantSlug, storeSlug)); return token ? hashToken(token) : ''; }

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

function safeCustomer(row: CustomerCredentialRow): StorefrontCustomer {
  const verifiedAt = row.emailVerifiedAt ? iso(row.emailVerifiedAt) : '';
  return { id: row.id, tenantId: row.tenantId, email: row.email, name: row.name || row.email, phone: row.phone || '', company: row.company || '', emailVerified: Boolean(verifiedAt), emailVerifiedAt: verifiedAt, createdAt: iso(row.createdAt) };
}

async function ensureProfileSecurityTables() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerSecurityToken" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"purpose" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"ipAddress" TEXT,"userAgent" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
}

async function credentialRow(customer: StorefrontCustomer) {
  await ensureStorefrontCustomerTables();
  const rows = await platformPrisma.$queryRawUnsafe<CustomerCredentialRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE id=$1 AND "tenantId"=$2 LIMIT 1', customer.id, customer.tenantId);
  const row = rows[0];
  if (!row || row.isActive === false) throw new Error('This customer account is not active.');
  return row;
}

export async function listStorefrontCustomerSessions(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string) {
  await ensureStorefrontCustomerTables();
  const scope = slug(storeSlug);
  const currentHash = currentTokenHash(request, tenantSlug, storeSlug);
  if (currentHash) await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "updatedAt"=NOW() WHERE "tokenHash"=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 AND "revokedAt" IS NULL', currentHash, customer.id, customer.tenantId, scope).catch(() => 0);
  const rows = await platformPrisma.$queryRawUnsafe<SessionRecord[]>(`SELECT s.id,s."tokenHash",s."ipAddress",s."userAgent",s."expiresAt",s."createdAt",s."updatedAt" FROM "StorefrontCustomerSession" s JOIN "StorefrontCustomer" c ON c.id=s."customerId" WHERE s."customerId"=$1 AND s."tenantId"=$2 AND s."storeSlug"=$3 AND s."revokedAt" IS NULL AND s."expiresAt">NOW() AND s."sessionVersion"=c."sessionVersion" AND c."isActive"=true ORDER BY CASE WHEN s."tokenHash"=$4 THEN 0 ELSE 1 END,s."updatedAt" DESC`, customer.id, customer.tenantId, scope, currentHash || '__none__');
  return rows.map((row): StorefrontCustomerSessionView => {
    const agent = userAgentSummary(row.userAgent);
    return { id: row.id, current: Boolean(currentHash && row.tokenHash === currentHash), device: agent.device, browser: agent.browser, locationHint: maskIp(row.ipAddress), createdAt: iso(row.createdAt), lastSeenAt: iso(row.updatedAt), expiresAt: iso(row.expiresAt) };
  });
}

export async function updateStorefrontCustomerProfile(customer: StorefrontCustomer, input: { name: string; phone?: string; company?: string }) {
  const name = clean(input.name);
  const phone = clean(input.phone);
  const company = clean(input.company);
  if (name.length < 2) throw new Error('Enter your full name.');
  if (name.length > 160) throw new Error('Name is too long.');
  if (phone.length > 80) throw new Error('Phone number is too long.');
  if (company.length > 160) throw new Error('Company name is too long.');
  await credentialRow(customer);
  const rows = await platformPrisma.$queryRawUnsafe<CustomerCredentialRow[]>('UPDATE "StorefrontCustomer" SET name=$1,phone=$2,company=$3,"updatedAt"=NOW() WHERE id=$4 AND "tenantId"=$5 RETURNING id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt"', name, phone, company, customer.id, customer.tenantId);
  if (!rows[0]) throw new Error('Customer profile could not be updated.');
  return safeCustomer(rows[0]);
}

export async function changeStorefrontCustomerPassword(request: Request, customer: StorefrontCustomer, input: { tenantSlug: string; storeSlug: string; currentPassword: string; newPassword: string }) {
  const currentPassword = clean(input.currentPassword);
  const newPassword = clean(input.newPassword);
  if (newPassword.length < 10) throw new Error('New password must contain at least 10 characters.');
  await ensureProfileSecurityTables();
  const row = await credentialRow(customer);
  if (!verifyPassword(currentPassword, row.passwordHash)) throw new Error('Current password is incorrect.');
  if (verifyPassword(newPassword, row.passwordHash)) throw new Error('Choose a different password from your current password.');
  await platformPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET "passwordHash"=$1,"sessionVersion"="sessionVersion"+1,"updatedAt"=NOW() WHERE id=$2 AND "tenantId"=$3', hashPassword(newPassword), customer.id, customer.tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2', customer.id, customer.tenantId);
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSecurityToken" SET "usedAt"=COALESCE("usedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND purpose=\'reset-password\' AND "usedAt" IS NULL', customer.id);
  });
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerEmailChange" SET "cancelledAt"=COALESCE("cancelledAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "completedAt" IS NULL AND "cancelledAt" IS NULL', customer.id, customer.tenantId).catch(() => 0);
  return loginStorefrontCustomer({ tenantSlug: input.tenantSlug, storeSlug: input.storeSlug, email: row.email, password: newPassword });
}

export async function revokeOtherStorefrontCustomerSessions(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string) {
  await ensureStorefrontCustomerTables();
  const currentHash = currentTokenHash(request, tenantSlug, storeSlug);
  if (!currentHash) throw new Error('Current customer session could not be identified.');
  const count = await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "storeSlug"=$3 AND "tokenHash"<>$4 AND "revokedAt" IS NULL', customer.id, customer.tenantId, slug(storeSlug), currentHash);
  return { revokedCount: Number(count || 0) };
}

export async function revokeStorefrontCustomerSession(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string, sessionId: string) {
  await ensureStorefrontCustomerTables();
  const id = clean(sessionId);
  if (!id) throw new Error('Choose a customer session to sign out.');
  const currentHash = currentTokenHash(request, tenantSlug, storeSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tokenHash: string }>>('SELECT id,"tokenHash" FROM "StorefrontCustomerSession" WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3 AND "storeSlug"=$4 AND "revokedAt" IS NULL LIMIT 1', id, customer.id, customer.tenantId, slug(storeSlug));
  const row = rows[0];
  if (!row) throw new Error('That customer session is no longer active.');
  if (currentHash && row.tokenHash === currentHash) throw new Error('Use Sign out to end the current session.');
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=NOW(),"updatedAt"=NOW() WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3', id, customer.id, customer.tenantId);
  return { revoked: true, sessionId: id };
}
