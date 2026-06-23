import { cookies } from 'next/headers';
import { platformPrisma } from '@/core/db/platform-prisma';
import { CUSTOMER_SESSION_COOKIE } from '@/core/auth/customer-auth.service';

function hash(value: string) { const crypto = require('crypto') as typeof import('crypto'); return crypto.createHash('sha256').update(value).digest('hex'); }
function parseJson(value: unknown) { if (!value) return {}; if (typeof value === 'object') return value as Record<string, any>; try { return JSON.parse(String(value)); } catch { return {}; } }
function emailFromNotes(notes: unknown) { const data = parseJson(notes); return String(data.customer?.email || data.customerEmail || '').trim().toLowerCase(); }
function customerNameFromNotes(notes: unknown) { const data = parseJson(notes); return String(data.customer?.name || data.customerName || '').trim(); }
async function tableExists(name: string) { const rows = await platformPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=$1) AS exists', name); return Boolean(rows[0]?.exists); }

async function ensureLinkTable() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerOrderLink" ("id" TEXT PRIMARY KEY,"tenantId" TEXT,"userId" TEXT NOT NULL,"orderId" TEXT NOT NULL,"orderNumber" TEXT,"customerEmail" TEXT,"linkSource" TEXT NOT NULL DEFAULT 'email-match',"claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CustomerOrderLink_userId_orderId_key" UNIQUE ("userId","orderId"));`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerOrderLink_userId_idx" ON "CustomerOrderLink"("userId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerOrderLink_orderId_idx" ON "CustomerOrderLink"("orderId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerOrderLink_tenantId_idx" ON "CustomerOrderLink"("tenantId")');
}

type SessionRow = { userId: string; tenantId: string | null; email: string; name: string | null; tenantSlug: string | null; tenantName: string | null };
async function readCustomerSession() {
  const token = cookies().get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) throw new Error('Customer session required.');
  const rows = await platformPrisma.$queryRawUnsafe<SessionRow[]>('SELECT u.id AS "userId",u."tenantId",u.email,u.name,t.slug AS "tenantSlug",t.name AS "tenantName" FROM "CustomerSession" s JOIN "User" u ON u.id=s."userId" LEFT JOIN "Tenant" t ON t.id=s."tenantId" WHERE s."tokenHash"=$1 AND s."revokedAt" IS NULL AND s."expiresAt" > NOW() AND u.role::text=\'CUSTOMER\' AND u."isActive" IS TRUE LIMIT 1', hash(token));
  const session = rows[0];
  if (!session) throw new Error('Customer session required.');
  return { ...session, email: session.email.toLowerCase() };
}

type OrderRow = { id: string; tenantId: string | null; customerId: string | null; orderNumber: string; status: string; currency: string; subtotalMinor: number | string; shippingMinor: number | string; taxMinor: number | string; totalMinor: number | string; notes: unknown; createdAt: Date | string; updatedAt: Date | string };
function publicOrder(row: OrderRow) { const notes = parseJson(row.notes); return { id: row.id, orderNumber: row.orderNumber, status: row.status, currency: row.currency || 'GBP', subtotalMinor: Number(row.subtotalMinor || 0), shippingMinor: Number(row.shippingMinor || 0), taxMinor: Number(row.taxMinor || 0), totalMinor: Number(row.totalMinor || 0), total: Number(row.totalMinor || 0) / 100, customerEmail: emailFromNotes(row.notes), customerName: customerNameFromNotes(row.notes), items: Array.isArray(notes.rawCheckout?.items) ? notes.rawCheckout.items : Array.isArray(notes.items) ? notes.items : [], createdAt: row.createdAt, updatedAt: row.updatedAt }; }
async function fetchCandidateOrders(session: SessionRow) {
  if (!(await tableExists('Order'))) return [] as OrderRow[];
  return platformPrisma.$queryRawUnsafe<OrderRow[]>('SELECT id,"tenantId","customerId","orderNumber",status,currency,"subtotalMinor","shippingMinor","taxMinor","totalMinor",notes,"createdAt","updatedAt" FROM "Order" WHERE "tenantId"=$1 ORDER BY "createdAt" DESC LIMIT 250', session.tenantId);
}

export async function claimCustomerOrdersByEmail() {
  await ensureLinkTable();
  const session = await readCustomerSession();
  const rows = await fetchCandidateOrders(session);
  const matches = rows.filter((row) => row.customerId === session.userId || emailFromNotes(row.notes) === session.email);
  for (const row of matches) {
    if (!row.customerId) await platformPrisma.$executeRawUnsafe('UPDATE "Order" SET "customerId"=$1,"updatedAt"=NOW() WHERE id=$2 AND ("customerId" IS NULL OR "customerId"=\'\')', session.userId, row.id).catch(() => undefined);
    await platformPrisma.$executeRawUnsafe('INSERT INTO "CustomerOrderLink" (id,"tenantId","userId","orderId","orderNumber","customerEmail","linkSource") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT ("userId","orderId") DO NOTHING', `colink-${row.id}-${session.userId}`, row.tenantId, session.userId, row.id, row.orderNumber, session.email, row.customerId === session.userId ? 'direct-customer-id' : 'email-claim').catch(() => undefined);
  }
  return { claimed: matches.length, orders: matches.map(publicOrder) };
}

export async function listCustomerOrders() {
  await ensureLinkTable();
  const session = await readCustomerSession();
  await claimCustomerOrdersByEmail();
  if (!(await tableExists('Order'))) return { customer: { email: session.email, name: session.name || session.email, tenantId: session.tenantSlug || session.tenantId }, orders: [] };
  const rows = await platformPrisma.$queryRawUnsafe<OrderRow[]>('SELECT DISTINCT o.id,o."tenantId",o."customerId",o."orderNumber",o.status,o.currency,o."subtotalMinor",o."shippingMinor",o."taxMinor",o."totalMinor",o.notes,o."createdAt",o."updatedAt" FROM "Order" o LEFT JOIN "CustomerOrderLink" l ON l."orderId"=o.id WHERE o."tenantId"=$1 AND (o."customerId"=$2 OR l."userId"=$2) ORDER BY o."createdAt" DESC LIMIT 100', session.tenantId, session.userId);
  return { customer: { email: session.email, name: session.name || session.email, tenantId: session.tenantSlug || session.tenantId, company: session.tenantName || 'Print Store' }, orders: rows.map(publicOrder) };
}
