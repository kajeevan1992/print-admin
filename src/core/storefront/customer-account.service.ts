import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getOrder, listOrders } from '@/core/orders/orders.service';
import {
  addOrUpdateBasketLine,
  loadPersistentBasket,
  newBasketId,
  savePersistentBasket,
  type StorefrontBasket,
} from '@/core/storefront/persistent-basket.service';

const SESSION_DAYS = 30;
const MAX_ADDRESSES = 20;

export type StorefrontCustomer = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  emailVerified: boolean;
  emailVerifiedAt: string;
  createdAt: string;
};

export type StorefrontCustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  company: string;
  line1: string;
  line2: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

type CustomerRow = StorefrontCustomer & {
  passwordHash?: string;
  isActive?: boolean;
  sessionVersion?: number;
  emailVerifiedAt?: Date | string | null;
};

type SessionRow = CustomerRow & {
  sessionId: string;
  sessionVersionSnapshot: number;
  expiresAt: Date | string;
  revokedAt: Date | string | null;
  storeSlug: string;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function tokenHash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function nowIso(value: Date | string = new Date()) { return new Date(value).toISOString(); }
function passwordHash(secret: string, salt = crypto.randomBytes(16).toString('hex')) { const iterations = 210000; const hash = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256').toString('hex'); return `pbkdf2_sha256$${iterations}$${salt}$${hash}`; }
function verifyPassword(secret: string, stored: string) { const [scheme, iterations, salt, hash] = clean(stored).split('$'); if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false; const next = crypto.pbkdf2Sync(secret, salt, Number(iterations), 32, 'sha256').toString('hex'); const left = Buffer.from(hash, 'hex'); const right = Buffer.from(next, 'hex'); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function cookieValue(header: string | null, name: string) { const item = clean(header).split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`)); return item ? decodeURIComponent(item.slice(name.length + 1)) : ''; }
function requestMeta() { const h = headers(); return { ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '', userAgent: h.get('user-agent') || '' }; }
function customerSafe(row: CustomerRow): StorefrontCustomer { const verifiedAt = row.emailVerifiedAt ? nowIso(row.emailVerifiedAt) : ''; return { id: row.id, tenantId: row.tenantId, email: row.email, name: row.name || row.email, phone: row.phone || '', company: row.company || '', emailVerified: Boolean(verifiedAt), emailVerifiedAt: verifiedAt, createdAt: nowIso(row.createdAt) }; }

export function customerSessionCookieName(tenantSlug: string, storeSlug: string) { const digest = crypto.createHash('sha1').update(`${slug(tenantSlug)}:${slug(storeSlug)}`).digest('hex').slice(0, 18); return `sf_customer_${digest}`; }
export function setCustomerSessionCookie(response: NextResponse, tenantSlug: string, storeSlug: string, token: string, expiresAt: Date) { response.cookies.set(customerSessionCookieName(tenantSlug, storeSlug), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt }); }
export function clearCustomerSessionCookie(response: NextResponse, tenantSlug: string, storeSlug: string) { response.cookies.set(customerSessionCookieName(tenantSlug, storeSlug), '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }); }

export async function ensureStorefrontCustomerTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomer" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"email" TEXT NOT NULL,"name" TEXT NOT NULL,"phone" TEXT NOT NULL DEFAULT '',"company" TEXT NOT NULL DEFAULT '',"passwordHash" TEXT NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT true,"sessionVersion" INTEGER NOT NULL DEFAULT 1,"emailVerifiedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("tenantId","email"));`);
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "StorefrontCustomer" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3)');
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerSession" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"sessionVersion" INTEGER NOT NULL DEFAULT 1,"ipAddress" TEXT,"userAgent" TEXT,"expiresAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontCustomerAddress" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"label" TEXT NOT NULL DEFAULT 'Address',"recipientName" TEXT NOT NULL DEFAULT '',"company" TEXT NOT NULL DEFAULT '',"line1" TEXT NOT NULL,"line2" TEXT NOT NULL DEFAULT '',"town" TEXT NOT NULL,"county" TEXT NOT NULL DEFAULT '',"postcode" TEXT NOT NULL,"country" TEXT NOT NULL DEFAULT 'United Kingdom',"phone" TEXT NOT NULL DEFAULT '',"isDefaultShipping" BOOLEAN NOT NULL DEFAULT false,"isDefaultBilling" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomer_tenant_email_idx" ON "StorefrontCustomer"("tenantId","email")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerSession_customer_idx" ON "StorefrontCustomerSession"("customerId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerSession_expiry_idx" ON "StorefrontCustomerSession"("expiresAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontCustomerAddress_customer_idx" ON "StorefrontCustomerAddress"("customerId")');
}

const ensureCustomerTables = ensureStorefrontCustomerTables;
async function resolveTenantId(tenantSlug: string) { const key = slug(tenantSlug); const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key); if (!rows[0]) throw new Error('Storefront tenant was not found.'); return rows[0].id; }
function scopedOrderRequest(tenantSlug: string) { return new Request(`https://internal.local/customer-account?tenantId=${encodeURIComponent(tenantSlug)}`, { headers: { 'x-tenant-id': tenantSlug } }); }

async function createCustomerSession(customer: CustomerRow, tenantId: string, storeSlug: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  const meta = requestMeta();
  await platformPrisma.$executeRawUnsafe('INSERT INTO "StorefrontCustomerSession" (id,"customerId","tenantId","storeSlug","tokenHash","sessionVersion","ipAddress","userAgent","expiresAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', `sfc-sess-${crypto.randomUUID()}`, customer.id, tenantId, slug(storeSlug), tokenHash(token), customer.sessionVersion || 1, meta.ip, meta.userAgent, expiresAt);
  return { customer: customerSafe(customer), token, expiresAt };
}

export async function registerStorefrontCustomer(input: { tenantSlug: string; storeSlug: string; email: string; password: string; name: string; phone?: string; company?: string }) {
  await ensureCustomerTables();
  const tenantId = await resolveTenantId(input.tenantSlug);
  const customerEmail = email(input.email);
  const name = clean(input.name);
  if (!validEmail(customerEmail)) throw new Error('Enter a valid email address.');
  if (clean(input.password).length < 10) throw new Error('Password must contain at least 10 characters.');
  if (name.length < 2) throw new Error('Enter your name.');
  const existing = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) LIMIT 1', tenantId, customerEmail);
  if (existing[0]) throw new Error('An account already exists for this email. Sign in instead.');
  const id = `sfc-${crypto.randomUUID()}`;
  await platformPrisma.$executeRawUnsafe('INSERT INTO "StorefrontCustomer" (id,"tenantId",email,name,phone,company,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', id, tenantId, customerEmail, name, clean(input.phone), clean(input.company), passwordHash(input.password));
  const rows = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE id=$1 LIMIT 1', id);
  return createCustomerSession(rows[0], tenantId, input.storeSlug);
}

export async function loginStorefrontCustomer(input: { tenantSlug: string; storeSlug: string; email: string; password: string }) {
  await ensureCustomerTables();
  const tenantId = await resolveTenantId(input.tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT id,"tenantId",email,name,phone,company,"passwordHash","isActive","sessionVersion","emailVerifiedAt","createdAt" FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) LIMIT 1', tenantId, email(input.email));
  const customer = rows[0];
  if (!customer?.passwordHash || customer.isActive === false || !verifyPassword(input.password, customer.passwordHash)) throw new Error('Invalid email or password.');
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET "updatedAt"=NOW() WHERE id=$1', customer.id);
  return createCustomerSession(customer, tenantId, input.storeSlug);
}

export async function readStorefrontCustomerSessionFromToken(token: string, tenantSlug: string, storeSlug: string) {
  if (!token) return null;
  await ensureCustomerTables();
  const tenantId = await resolveTenantId(tenantSlug).catch(() => '');
  if (!tenantId) return null;
  const rows = await platformPrisma.$queryRawUnsafe<SessionRow[]>(`SELECT s.id AS "sessionId",s."sessionVersion" AS "sessionVersionSnapshot",s."expiresAt",s."revokedAt",s."storeSlug",c.id,c."tenantId",c.email,c.name,c.phone,c.company,c."isActive",c."sessionVersion",c."emailVerifiedAt",c."createdAt" FROM "StorefrontCustomerSession" s JOIN "StorefrontCustomer" c ON c.id=s."customerId" WHERE s."tokenHash"=$1 AND s."tenantId"=$2 AND s."storeSlug"=$3 LIMIT 1`, tokenHash(token), tenantId, slug(storeSlug));
  const row = rows[0];
  if (!row || row.revokedAt || row.isActive === false || new Date(row.expiresAt).getTime() <= Date.now() || Number(row.sessionVersionSnapshot || 1) !== Number(row.sessionVersion || 1)) return null;
  return customerSafe(row);
}

export async function currentStorefrontCustomer(tenantSlug: string, storeSlug: string) { const token = cookies().get(customerSessionCookieName(tenantSlug, storeSlug))?.value || ''; return readStorefrontCustomerSessionFromToken(token, tenantSlug, storeSlug); }
export async function customerFromRequest(request: Request, tenantSlug: string, storeSlug: string) { return readStorefrontCustomerSessionFromToken(cookieValue(request.headers.get('cookie'), customerSessionCookieName(tenantSlug, storeSlug)), tenantSlug, storeSlug); }
export async function requireCustomerFromRequest(request: Request, tenantSlug: string, storeSlug: string) { const customer = await customerFromRequest(request, tenantSlug, storeSlug); if (!customer) throw new Error('Customer sign-in is required.'); return customer; }
export async function revokeCustomerSession(request: Request, tenantSlug: string, storeSlug: string) { const token = cookieValue(request.headers.get('cookie'), customerSessionCookieName(tenantSlug, storeSlug)); if (!token) return; await ensureCustomerTables(); await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=NOW(),"updatedAt"=NOW() WHERE "tokenHash"=$1', tokenHash(token)); }

export async function listCustomerAddresses(customer: StorefrontCustomer) {
  await ensureCustomerTables();
  const rows = await platformPrisma.$queryRawUnsafe<Array<StorefrontCustomerAddress & { isDefaultShipping: boolean; isDefaultBilling: boolean }>>('SELECT id,label,"recipientName",company,line1,line2,town,county,postcode,country,phone,"isDefaultShipping","isDefaultBilling" FROM "StorefrontCustomerAddress" WHERE "customerId"=$1 AND "tenantId"=$2 ORDER BY "isDefaultShipping" DESC,"updatedAt" DESC', customer.id, customer.tenantId);
  return rows;
}

export async function saveCustomerAddress(customer: StorefrontCustomer, input: Partial<StorefrontCustomerAddress>) {
  await ensureCustomerTables();
  const line1 = clean(input.line1); const town = clean(input.town); const postcode = clean(input.postcode).toUpperCase();
  if (!line1 || !town || !postcode) throw new Error('Address line 1, town and postcode are required.');
  const existing = input.id ? await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "StorefrontCustomerAddress" WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3 LIMIT 1', clean(input.id), customer.id, customer.tenantId) : [];
  if (!existing[0]) { const count = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>('SELECT COUNT(*)::bigint AS count FROM "StorefrontCustomerAddress" WHERE "customerId"=$1', customer.id); if (Number(count[0]?.count || 0) >= MAX_ADDRESSES) throw new Error(`You can save up to ${MAX_ADDRESSES} addresses.`); }
  if (input.isDefaultShipping) await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerAddress" SET "isDefaultShipping"=false,"updatedAt"=NOW() WHERE "customerId"=$1', customer.id);
  if (input.isDefaultBilling) await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerAddress" SET "isDefaultBilling"=false,"updatedAt"=NOW() WHERE "customerId"=$1', customer.id);
  const id = existing[0]?.id || `sfa-${crypto.randomUUID()}`;
  if (existing[0]) await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerAddress" SET label=$1,"recipientName"=$2,company=$3,line1=$4,line2=$5,town=$6,county=$7,postcode=$8,country=$9,phone=$10,"isDefaultShipping"=$11,"isDefaultBilling"=$12,"updatedAt"=NOW() WHERE id=$13 AND "customerId"=$14', clean(input.label) || 'Address', clean(input.recipientName) || customer.name, clean(input.company), line1, clean(input.line2), town, clean(input.county), postcode, clean(input.country) || 'United Kingdom', clean(input.phone), Boolean(input.isDefaultShipping), Boolean(input.isDefaultBilling), id, customer.id);
  else await platformPrisma.$executeRawUnsafe('INSERT INTO "StorefrontCustomerAddress" (id,"customerId","tenantId",label,"recipientName",company,line1,line2,town,county,postcode,country,phone,"isDefaultShipping","isDefaultBilling","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())', id, customer.id, customer.tenantId, clean(input.label) || 'Address', clean(input.recipientName) || customer.name, clean(input.company), line1, clean(input.line2), town, clean(input.county), postcode, clean(input.country) || 'United Kingdom', clean(input.phone), Boolean(input.isDefaultShipping), Boolean(input.isDefaultBilling));
  return (await listCustomerAddresses(customer)).find((address) => address.id === id) || null;
}

export async function deleteCustomerAddress(customer: StorefrontCustomer, id: string) { await ensureCustomerTables(); await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontCustomerAddress" WHERE id=$1 AND "customerId"=$2 AND "tenantId"=$3', clean(id), customer.id, customer.tenantId); }

function belongsToStore(order: any, storeSlug: string) { const stored = slug(order?.resolver?.storeSlug); return !stored || stored === slug(storeSlug); }
export async function listCustomerOrders(customer: StorefrontCustomer, tenantSlug: string, storeSlug: string) { const orders = await listOrders(scopedOrderRequest(tenantSlug), { email: customer.email, limit: 100 }); return orders.filter((order) => belongsToStore(order, storeSlug)); }
export async function getCustomerOrder(customer: StorefrontCustomer, tenantSlug: string, storeSlug: string, orderId: string) { const order = await getOrder(scopedOrderRequest(tenantSlug), orderId); if (!order || email(order.customerEmail) !== email(customer.email) || !belongsToStore(order, storeSlug)) return null; return order; }

export async function repeatCustomerOrder(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string, orderId: string, basketId?: string) {
  const order = await getCustomerOrder(customer, tenantSlug, storeSlug, orderId);
  if (!order) throw new Error('Order was not found in this customer account.');
  const targetBasketId = clean(basketId) || newBasketId();
  let basket = await loadPersistentBasket(request, tenantSlug, storeSlug, targetBasketId, { reprice: false });
  for (const item of order.items || []) {
    const meta = item.metadataJson || {};
    if (clean(meta.lineType || item.lineType) === 'add-on') continue;
    const productSlug = slug(meta.productSlug || meta.productId || item.productId);
    if (!productSlug) continue;
    basket = await addOrUpdateBasketLine(request, tenantSlug, storeSlug, targetBasketId, { productSlug, categorySlug: slug(meta.categorySlug), productName: item.productName, selectedOptions: Array.isArray(meta.selectedOptions) ? meta.selectedOptions : Array.isArray(meta.resolverSnapshot?.selectedOptions) ? meta.resolverSnapshot.selectedOptions : [], quantity: item.quantity || 1, delivery: clean(meta.selectedDelivery || meta.delivery || meta.resolverSnapshot?.delivery), customSize: meta.customSize || meta.resolverSnapshot?.customSize || null, artwork: { status: 'send-later', notes: `Repeat of ${order.orderNumber}` } });
  }
  basket = await savePersistentBasket({ ...basket, customerId: customer.id });
  if (!basket.lines.length) throw new Error('No repeatable product lines were found in this order.');
  return basket;
}

export async function attachBasketToCustomer(request: Request, customer: StorefrontCustomer, tenantSlug: string, storeSlug: string, basketId: string) { if (!basketId) return null; const basket = await loadPersistentBasket(request, tenantSlug, storeSlug, basketId, { reprice: false }); return savePersistentBasket({ ...basket, customerId: customer.id }); }

export function accountSummary(orders: any[], addresses: StorefrontCustomerAddress[]) {
  const quotes = orders.filter((order) => order.status === 'AWAITING_APPROVAL' || order.quoteReference);
  const invoices = orders.filter((order) => ['paid', 'authorized', 'refunded'].includes(clean(order.paymentStatus).toLowerCase()));
  const artwork = orders.flatMap((order) => (order.items || []).filter((item: any) => item.metadataJson?.artworkSnapshot || item.metadataJson?.artworkStatus).map((item: any) => ({ orderId: order.id, orderNumber: order.orderNumber, productName: item.productName, status: item.metadataJson?.artworkSnapshot?.preflightStatus || item.metadataJson?.artworkStatus || 'pending', uploadId: item.metadataJson?.artworkUploadId || item.metadataJson?.artworkSnapshot?.upload?.id || '' })));
  return { orderCount: orders.length, quoteCount: quotes.length, invoiceCount: invoices.length, artworkCount: artwork.length, addressCount: addresses.length, quotes, invoices, artwork };
}
