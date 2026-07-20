import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { ensureStorefrontCustomerTables } from '@/core/storefront/customer-account.service';

export type AdminCustomerSecurityLevel = 'suspended' | 'attention' | 'verified' | 'protected';

export type AdminCustomerSummary = {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  addressCount: number;
  activeSessions: number;
  trustedBrowsers: number;
  passkeys: number;
  twoStepEnabled: boolean;
  orderCount: number;
  orderTotalMinor: number;
  quoteCount: number;
  quoteTotalMinor: number;
  invoiceCount: number;
  invoicedMinor: number;
  creditedMinor: number;
  netRevenueMinor: number;
  storeSlugs: string[];
  securityLevel: AdminCustomerSecurityLevel;
};

export type AdminCustomerDetail = AdminCustomerSummary & {
  defaultStoreSlug: string;
  addresses: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  quotes: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  trustedDevices: Array<Record<string, unknown>>;
  passkeyItems: Array<Record<string, unknown>>;
  supportNotes: Array<Record<string, unknown>>;
  audit: Array<Record<string, unknown>>;
};

type TenantRow = { id: string; slug: string; defaultSubdomain: string };
type CustomerRow = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  isActive: boolean;
  sessionVersion: number;
  emailVerifiedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
type OrderRow = Record<string, any>;
type QuoteRow = Record<string, any>;
type InvoiceRow = Record<string, any>;
type CreditRow = Record<string, any>;
type CountRow = { customerId: string; count: bigint | number | string; lastActivityAt?: Date | string | null };

type CustomerSnapshot = {
  tenant: TenantRow;
  customers: CustomerRow[];
  orders: OrderRow[];
  quotes: QuoteRow[];
  invoices: InvoiceRow[];
  credits: CreditRow[];
  sessions: Record<string, any>[];
  trustedDevices: Record<string, any>[];
  passkeys: Record<string, any>[];
  mfa: Record<string, any>[];
  addressCounts: CountRow[];
  noteCounts: CountRow[];
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function integer(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) ? Math.round(next) : 0; }
function iso(value: unknown) { if (!value) return ''; const next = new Date(value as any); return Number.isNaN(next.getTime()) ? '' : next.toISOString(); }
function record(value: unknown): Record<string, any> { if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>; if (typeof value === 'string') { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } } return {}; }
function latest(...values: unknown[]) { return values.map(iso).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || ''; }
function unique(values: unknown[]) { return [...new Set(values.map(slug).filter(Boolean))]; }

function userAgentSummary(value: unknown) {
  const ua = clean(value);
  const lower = ua.toLowerCase();
  const device = lower.includes('iphone') ? 'iPhone' : lower.includes('ipad') ? 'iPad' : lower.includes('android') ? 'Android device' : lower.includes('windows') ? 'Windows computer' : lower.includes('macintosh') || lower.includes('mac os') ? 'Mac' : lower.includes('linux') ? 'Linux computer' : ua ? 'Unknown device' : 'Device unavailable';
  const browser = lower.includes('edg/') ? 'Microsoft Edge' : lower.includes('firefox/') ? 'Firefox' : lower.includes('crios/') ? 'Chrome' : lower.includes('chrome/') ? 'Chrome' : lower.includes('safari/') ? 'Safari' : ua ? 'Unknown browser' : 'Browser unavailable';
  return { device, browser };
}

function maskIp(value: unknown) {
  const ip = clean(value).split(',')[0]?.trim() || '';
  if (!ip) return 'Network unavailable';
  if (ip.includes(':')) return `${ip.split(':').slice(0, 4).join(':')}::`;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.x` : 'Network recorded';
}

async function tableExists(name: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=$1) AS exists', name);
  return Boolean(rows[0]?.exists);
}

async function resolveTenant(value: string) {
  const key = slug(value);
  const rows = await platformPrisma.$queryRawUnsafe<TenantRow[]>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Customer tenant was not found.');
  return rows[0];
}

async function ensureSupportTables() {
  await ensureStorefrontCustomerTables();
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerSupportNote" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"customerId" TEXT NOT NULL,"note" TEXT NOT NULL,"actorId" TEXT NOT NULL DEFAULT '',"actorName" TEXT NOT NULL DEFAULT '',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerSupportNote_customer_idx" ON "CustomerSupportNote"("tenantId","customerId","createdAt")');
}

async function optionalRows<T = Record<string, any>>(table: string, query: string, ...values: unknown[]) {
  if (!(await tableExists(table))) return [] as T[];
  return platformPrisma.$queryRawUnsafe<T[]>(query, ...values);
}

async function snapshot(tenantKey: string): Promise<CustomerSnapshot> {
  await ensureSupportTables();
  const tenant = await resolveTenant(tenantKey);
  const customers = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT id,"tenantId",email,name,phone,company,"isActive","sessionVersion","emailVerifiedAt","createdAt","updatedAt" FROM "StorefrontCustomer" WHERE "tenantId"=$1 ORDER BY "updatedAt" DESC', tenant.id);
  const [orders, quotes, invoices, credits, sessions, trustedDevices, passkeys, mfa, addressCounts, noteCounts] = await Promise.all([
    optionalRows<OrderRow>('Order', 'SELECT id,"orderNumber",status::text AS status,currency,"totalMinor",notes,"createdAt","updatedAt" FROM "Order" WHERE "tenantId"=$1 ORDER BY "createdAt" DESC LIMIT 5000', tenant.id),
    optionalRows<QuoteRow>('FormalQuote', 'SELECT id,"storeSlug","quoteNumber","customerId","customerName","customerEmail","customerCompany",title,status,currency,"totalMinor","createdAt","updatedAt" FROM "FormalQuote" WHERE "tenantId"=$1 ORDER BY "updatedAt" DESC LIMIT 5000', tenant.id),
    optionalRows<InvoiceRow>('FormalInvoice', 'SELECT id,"storeSlug","invoiceNumber","orderId","orderNumber","customerId","customerName","customerEmail","customerCompany",currency,"totalMinor",status,"issuedAt","updatedAt" FROM "FormalInvoice" WHERE "tenantId"=$1 ORDER BY "issuedAt" DESC LIMIT 5000', tenant.id),
    optionalRows<CreditRow>('FormalCreditNote', 'SELECT id,"invoiceId","totalMinor",status,"issuedAt" FROM "FormalCreditNote" WHERE "tenantId"=$1 ORDER BY "issuedAt" DESC LIMIT 5000', tenant.id),
    optionalRows<Record<string, any>>('StorefrontCustomerSession', 'SELECT id,"customerId","storeSlug","ipAddress","userAgent","createdAt","updatedAt","expiresAt" FROM "StorefrontCustomerSession" WHERE "tenantId"=$1 AND "revokedAt" IS NULL AND "expiresAt">NOW() ORDER BY "updatedAt" DESC', tenant.id),
    optionalRows<Record<string, any>>('StorefrontCustomerTrustedDevice', 'SELECT id,"customerId","storeSlug","ipAddress","userAgent","createdAt","lastUsedAt","expiresAt" FROM "StorefrontCustomerTrustedDevice" WHERE "tenantId"=$1 AND "revokedAt" IS NULL AND "expiresAt">NOW() ORDER BY "lastUsedAt" DESC', tenant.id),
    optionalRows<Record<string, any>>('StorefrontCustomerPasskey', 'SELECT id,"customerId","storeSlug",name,"deviceType","backedUp","createdAt","lastUsedAt" FROM "StorefrontCustomerPasskey" WHERE "tenantId"=$1 AND "revokedAt" IS NULL ORDER BY "lastUsedAt" DESC NULLS LAST,"createdAt" DESC', tenant.id),
    optionalRows<Record<string, any>>('StorefrontCustomerMfa', 'SELECT "customerId","enabledAt" FROM "StorefrontCustomerMfa" WHERE "tenantId"=$1 AND "enabledAt" IS NOT NULL', tenant.id),
    optionalRows<CountRow>('StorefrontCustomerAddress', 'SELECT "customerId",COUNT(*)::bigint AS count,MAX("updatedAt") AS "lastActivityAt" FROM "StorefrontCustomerAddress" WHERE "tenantId"=$1 GROUP BY "customerId"', tenant.id),
    optionalRows<CountRow>('CustomerSupportNote', 'SELECT "customerId",COUNT(*)::bigint AS count,MAX("createdAt") AS "lastActivityAt" FROM "CustomerSupportNote" WHERE "tenantId"=$1 GROUP BY "customerId"', tenant.id),
  ]);
  return { tenant, customers, orders, quotes, invoices, credits, sessions, trustedDevices, passkeys, mfa, addressCounts, noteCounts };
}

function orderCustomer(row: OrderRow) {
  const notes = record(row.notes);
  const customer = record(notes.customer);
  const payment = record(notes.payment);
  const resolver = record(notes.resolver);
  return { email: email(customer.email), name: clean(customer.name), company: clean(customer.company), storeSlug: slug(resolver.storeSlug), paymentStatus: clean(payment.paymentStatus), notes };
}

function matchesCustomer(rowCustomerId: unknown, rowEmail: unknown, customer: CustomerRow) {
  return (clean(rowCustomerId) && clean(rowCustomerId) === customer.id) || (email(rowEmail) && email(rowEmail) === email(customer.email));
}

function buildSummary(data: CustomerSnapshot, customer: CustomerRow): AdminCustomerSummary {
  const customerEmail = email(customer.email);
  const orders = data.orders.filter((row) => orderCustomer(row).email === customerEmail);
  const quotes = data.quotes.filter((row) => matchesCustomer(row.customerId, row.customerEmail, customer));
  const invoices = data.invoices.filter((row) => matchesCustomer(row.customerId, row.customerEmail, customer));
  const invoiceIds = new Set(invoices.map((row) => clean(row.id)));
  const credits = data.credits.filter((row) => invoiceIds.has(clean(row.invoiceId)) && clean(row.status) !== 'void');
  const sessions = data.sessions.filter((row) => clean(row.customerId) === customer.id);
  const trusted = data.trustedDevices.filter((row) => clean(row.customerId) === customer.id);
  const passkeys = data.passkeys.filter((row) => clean(row.customerId) === customer.id);
  const mfa = data.mfa.some((row) => clean(row.customerId) === customer.id && row.enabledAt);
  const address = data.addressCounts.find((row) => clean(row.customerId) === customer.id);
  const notes = data.noteCounts.find((row) => clean(row.customerId) === customer.id);
  const invoicedMinor = invoices.reduce((sum, row) => sum + integer(row.totalMinor), 0);
  const creditedMinor = credits.reduce((sum, row) => sum + integer(row.totalMinor), 0);
  const emailVerified = Boolean(customer.emailVerifiedAt);
  const securityLevel: AdminCustomerSecurityLevel = !customer.isActive ? 'suspended' : !emailVerified ? 'attention' : mfa || passkeys.length ? 'protected' : 'verified';
  const storeSlugs = unique([
    ...sessions.map((row) => row.storeSlug),
    ...trusted.map((row) => row.storeSlug),
    ...passkeys.map((row) => row.storeSlug),
    ...quotes.map((row) => row.storeSlug),
    ...invoices.map((row) => row.storeSlug),
    ...orders.map((row) => orderCustomer(row).storeSlug),
  ]);
  const activity = [
    customer.updatedAt,
    address?.lastActivityAt,
    notes?.lastActivityAt,
    ...orders.map((row) => row.updatedAt || row.createdAt),
    ...quotes.map((row) => row.updatedAt || row.createdAt),
    ...invoices.map((row) => row.updatedAt || row.issuedAt),
    ...sessions.map((row) => row.updatedAt || row.createdAt),
    ...trusted.map((row) => row.lastUsedAt || row.createdAt),
    ...passkeys.map((row) => row.lastUsedAt || row.createdAt),
  ];
  return {
    id: customer.id,
    email: customerEmail,
    name: clean(customer.name) || customerEmail,
    phone: clean(customer.phone),
    company: clean(customer.company),
    isActive: customer.isActive !== false,
    emailVerified,
    emailVerifiedAt: iso(customer.emailVerifiedAt),
    createdAt: iso(customer.createdAt),
    updatedAt: iso(customer.updatedAt),
    lastActivityAt: latest(...activity),
    addressCount: integer(address?.count),
    activeSessions: sessions.length,
    trustedBrowsers: trusted.length,
    passkeys: passkeys.length,
    twoStepEnabled: mfa,
    orderCount: orders.length,
    orderTotalMinor: orders.reduce((sum, row) => sum + integer(row.totalMinor), 0),
    quoteCount: quotes.length,
    quoteTotalMinor: quotes.reduce((sum, row) => sum + integer(row.totalMinor), 0),
    invoiceCount: invoices.length,
    invoicedMinor,
    creditedMinor,
    netRevenueMinor: Math.max(0, invoicedMinor - creditedMinor),
    storeSlugs,
    securityLevel,
  };
}

export async function listAdminCustomers(tenantKey: string, options: { search?: string; status?: string; verification?: string; security?: string; sort?: string; limit?: number } = {}) {
  const data = await snapshot(tenantKey);
  const term = clean(options.search).toLowerCase();
  const status = clean(options.status).toLowerCase();
  const verification = clean(options.verification).toLowerCase();
  const security = clean(options.security).toLowerCase();
  const sort = clean(options.sort).toLowerCase() || 'activity';
  let items = data.customers.map((customer) => buildSummary(data, customer));
  if (term) items = items.filter((item) => [item.name, item.email, item.phone, item.company, ...item.storeSlugs].join(' ').toLowerCase().includes(term));
  if (status === 'active') items = items.filter((item) => item.isActive);
  if (status === 'suspended') items = items.filter((item) => !item.isActive);
  if (verification === 'verified') items = items.filter((item) => item.emailVerified);
  if (verification === 'unverified') items = items.filter((item) => !item.emailVerified);
  if (security) items = items.filter((item) => item.securityLevel === security);
  items.sort((left, right) => {
    if (sort === 'spend') return right.netRevenueMinor - left.netRevenueMinor;
    if (sort === 'created') return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (sort === 'name') return left.name.localeCompare(right.name);
    return new Date(right.lastActivityAt || 0).getTime() - new Date(left.lastActivityAt || 0).getTime();
  });
  const all = data.customers.map((customer) => buildSummary(data, customer));
  const metrics = {
    total: all.length,
    active: all.filter((item) => item.isActive).length,
    suspended: all.filter((item) => !item.isActive).length,
    unverified: all.filter((item) => !item.emailVerified).length,
    protected: all.filter((item) => item.securityLevel === 'protected').length,
    activeSessions: all.reduce((sum, item) => sum + item.activeSessions, 0),
    netRevenueMinor: all.reduce((sum, item) => sum + item.netRevenueMinor, 0),
  };
  return { tenant: data.tenant, metrics, items: items.slice(0, Math.max(1, Math.min(500, integer(options.limit) || 300))) };
}

export async function getAdminCustomer(tenantKey: string, customerId: string): Promise<AdminCustomerDetail | null> {
  const data = await snapshot(tenantKey);
  const customer = data.customers.find((row) => clean(row.id) === clean(customerId));
  if (!customer) return null;
  const summary = buildSummary(data, customer);
  const orders = data.orders.filter((row) => orderCustomer(row).email === summary.email).slice(0, 100).map((row) => { const linked = orderCustomer(row); return { id: clean(row.id), orderNumber: clean(row.orderNumber), status: clean(row.status), paymentStatus: linked.paymentStatus, currency: clean(row.currency) || 'GBP', totalMinor: integer(row.totalMinor), storeSlug: linked.storeSlug, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }; });
  const quotes = data.quotes.filter((row) => matchesCustomer(row.customerId, row.customerEmail, customer)).slice(0, 100).map((row) => ({ id: clean(row.id), quoteNumber: clean(row.quoteNumber), title: clean(row.title), status: clean(row.status), currency: clean(row.currency) || 'GBP', totalMinor: integer(row.totalMinor), storeSlug: slug(row.storeSlug), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }));
  const invoices = data.invoices.filter((row) => matchesCustomer(row.customerId, row.customerEmail, customer)).slice(0, 100).map((row) => ({ id: clean(row.id), invoiceNumber: clean(row.invoiceNumber), orderId: clean(row.orderId), orderNumber: clean(row.orderNumber), status: clean(row.status), currency: clean(row.currency) || 'GBP', totalMinor: integer(row.totalMinor), storeSlug: slug(row.storeSlug), issuedAt: iso(row.issuedAt), updatedAt: iso(row.updatedAt) }));
  const addresses = await optionalRows<Record<string, any>>('StorefrontCustomerAddress', 'SELECT id,label,"recipientName",company,line1,line2,town,county,postcode,country,phone,"isDefaultShipping","isDefaultBilling","updatedAt" FROM "StorefrontCustomerAddress" WHERE "tenantId"=$1 AND "customerId"=$2 ORDER BY "isDefaultShipping" DESC,"updatedAt" DESC', data.tenant.id, customer.id);
  const sessions = data.sessions.filter((row) => clean(row.customerId) === customer.id).map((row) => ({ id: clean(row.id), storeSlug: slug(row.storeSlug), ...userAgentSummary(row.userAgent), locationHint: maskIp(row.ipAddress), createdAt: iso(row.createdAt), lastSeenAt: iso(row.updatedAt), expiresAt: iso(row.expiresAt) }));
  const trustedDevices = data.trustedDevices.filter((row) => clean(row.customerId) === customer.id).map((row) => ({ id: clean(row.id), storeSlug: slug(row.storeSlug), ...userAgentSummary(row.userAgent), locationHint: maskIp(row.ipAddress), createdAt: iso(row.createdAt), lastUsedAt: iso(row.lastUsedAt), expiresAt: iso(row.expiresAt) }));
  const passkeyItems = data.passkeys.filter((row) => clean(row.customerId) === customer.id).map((row) => ({ id: clean(row.id), storeSlug: slug(row.storeSlug), name: clean(row.name) || 'Passkey', deviceType: clean(row.deviceType) || 'singleDevice', backedUp: Boolean(row.backedUp), createdAt: iso(row.createdAt), lastUsedAt: iso(row.lastUsedAt) }));
  const supportNotes = await optionalRows<Record<string, any>>('CustomerSupportNote', 'SELECT id,note,"actorId","actorName","createdAt" FROM "CustomerSupportNote" WHERE "tenantId"=$1 AND "customerId"=$2 ORDER BY "createdAt" DESC LIMIT 200', data.tenant.id, customer.id);
  const audit = await optionalRows<Record<string, any>>('AuditLog', `SELECT id,action,actor,metadata,"createdAt" FROM "AuditLog" WHERE "tenantId"=$1 AND metadata->>'customerId'=$2 ORDER BY "createdAt" DESC LIMIT 200`, data.tenant.id, customer.id);
  return {
    ...summary,
    defaultStoreSlug: summary.storeSlugs[0] || slug(data.tenant.defaultSubdomain) || slug(data.tenant.slug),
    addresses: addresses.map((row) => ({ ...row, updatedAt: iso(row.updatedAt) })),
    orders,
    quotes,
    invoices,
    sessions,
    trustedDevices,
    passkeyItems,
    supportNotes: supportNotes.map((row) => ({ id: clean(row.id), note: clean(row.note), actorId: clean(row.actorId), actorName: clean(row.actorName), createdAt: iso(row.createdAt) })),
    audit: audit.map((row) => ({ id: clean(row.id), action: clean(row.action), actor: clean(row.actor), metadata: record(row.metadata), createdAt: iso(row.createdAt) })),
  };
}

async function customerRow(tenantKey: string, customerId: string) {
  await ensureSupportTables();
  const tenant = await resolveTenant(tenantKey);
  const rows = await platformPrisma.$queryRawUnsafe<CustomerRow[]>('SELECT id,"tenantId",email,name,phone,company,"isActive","sessionVersion","emailVerifiedAt","createdAt","updatedAt" FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND id=$2 LIMIT 1', tenant.id, clean(customerId));
  if (!rows[0]) throw new Error('Customer account was not found.');
  return { tenant, customer: rows[0] };
}

export async function recordAdminCustomerAction(tenantKey: string, customerId: string, action: string, actor: { id: string; name: string; email?: string }, metadata: Record<string, unknown> = {}) {
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  if (await tableExists('AuditLog')) await platformPrisma.$executeRawUnsafe('INSERT INTO "AuditLog" (id,"tenantId",action,actor,metadata,"createdAt") VALUES ($1,$2,$3,$4,$5::jsonb,NOW())', `audit-${crypto.randomUUID()}`, tenant.id, clean(action), clean(actor.name || actor.email || actor.id), JSON.stringify({ customerId: customer.id, customerEmail: customer.email, actorId: actor.id, ...metadata })).catch(() => 0);
  return customer;
}

export async function addAdminCustomerNote(tenantKey: string, customerId: string, noteValue: string, actor: { id: string; name: string }) {
  const note = clean(noteValue);
  if (note.length < 3) throw new Error('Enter a support note.');
  if (note.length > 4000) throw new Error('Support notes must contain 4,000 characters or fewer.');
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  await platformPrisma.$executeRawUnsafe('INSERT INTO "CustomerSupportNote" (id,"tenantId","customerId",note,"actorId","actorName","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())', `csn-${crypto.randomUUID()}`, tenant.id, customer.id, note, actor.id, actor.name);
  await recordAdminCustomerAction(tenantKey, customerId, 'customer.support-note-added', actor, { noteLength: note.length });
}

export async function updateAdminCustomerProfile(tenantKey: string, customerId: string, input: { name: string; phone?: string; company?: string }, actor: { id: string; name: string }) {
  const name = clean(input.name);
  if (name.length < 2) throw new Error('Customer name is required.');
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET name=$1,phone=$2,company=$3,"updatedAt"=NOW() WHERE id=$4 AND "tenantId"=$5', name, clean(input.phone), clean(input.company), customer.id, tenant.id);
  await recordAdminCustomerAction(tenantKey, customerId, 'customer.profile-updated-by-admin', actor, { fields: ['name', 'phone', 'company'] });
}

export async function setAdminCustomerActive(tenantKey: string, customerId: string, active: boolean, actor: { id: string; name: string }) {
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  await platformPrisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET "isActive"=$1,"sessionVersion"="sessionVersion"+1,"updatedAt"=NOW() WHERE id=$2 AND "tenantId"=$3', active, customer.id, tenant.id);
    if (!active && await tableExists('StorefrontCustomerSession')) await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, tenant.id);
    if (!active && await tableExists('StorefrontCustomerTrustedDevice')) await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, tenant.id);
  });
  await recordAdminCustomerAction(tenantKey, customerId, active ? 'customer.reactivated' : 'customer.suspended', actor);
}

export async function revokeAdminCustomerSessions(tenantKey: string, customerId: string, actor: { id: string; name: string }) {
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  let sessions = 0;
  let trusted = 0;
  await platformPrisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('UPDATE "StorefrontCustomer" SET "sessionVersion"="sessionVersion"+1,"updatedAt"=NOW() WHERE id=$1 AND "tenantId"=$2', customer.id, tenant.id);
    if (await tableExists('StorefrontCustomerSession')) sessions = Number(await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerSession" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, tenant.id) || 0);
    if (await tableExists('StorefrontCustomerTrustedDevice')) trusted = Number(await tx.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, tenant.id) || 0);
  });
  await recordAdminCustomerAction(tenantKey, customerId, 'customer.sessions-revoked-by-admin', actor, { sessions, trustedBrowsers: trusted });
  return { sessions, trustedBrowsers: trusted };
}

export async function revokeAdminCustomerTrustedDevices(tenantKey: string, customerId: string, actor: { id: string; name: string }) {
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  const count = await tableExists('StorefrontCustomerTrustedDevice') ? Number(await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerTrustedDevice" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, tenant.id) || 0) : 0;
  await recordAdminCustomerAction(tenantKey, customerId, 'customer.trusted-browsers-revoked-by-admin', actor, { count });
  return { count };
}

export async function revokeAdminCustomerPasskeys(tenantKey: string, customerId: string, actor: { id: string; name: string }) {
  const { tenant, customer } = await customerRow(tenantKey, customerId);
  const count = await tableExists('StorefrontCustomerPasskey') ? Number(await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontCustomerPasskey" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1 AND "tenantId"=$2 AND "revokedAt" IS NULL', customer.id, tenant.id) || 0) : 0;
  await recordAdminCustomerAction(tenantKey, customerId, 'customer.passkeys-revoked-by-admin', actor, { count });
  return { count };
}
