import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { buildOrderVatSummary } from '@/core/tax/order-vat-summary';
import { getInvoiceSettings, type InvoiceBrandSettings } from '@/core/documents/invoice-settings';

export type FormalInvoiceStatus = 'issued' | 'paid' | 'partially_credited' | 'credited' | 'void';
export type FormalCreditNoteStatus = 'issued' | 'void';

export type FormalInvoiceLine = {
  id: string;
  invoiceId: string;
  position: number;
  productName: string;
  sku: string;
  quantity: number;
  unitNetMinor: number;
  netMinor: number;
  vatRate: number;
  vatMinor: number;
  grossMinor: number;
  metadataJson: Record<string, unknown>;
};

export type FormalCreditNoteLine = {
  id: string;
  creditNoteId: string;
  invoiceLineId: string;
  position: number;
  description: string;
  quantity: number;
  netMinor: number;
  vatRate: number;
  vatMinor: number;
  grossMinor: number;
};

export type FormalCreditNote = {
  id: string;
  tenantId: string;
  invoiceId: string;
  orderId: string;
  creditNoteNumber: string;
  reason: string;
  currency: string;
  netMinor: number;
  vatMinor: number;
  totalMinor: number;
  status: FormalCreditNoteStatus;
  externalReference: string;
  issuedAt: string;
  createdAt: string;
  lines: FormalCreditNoteLine[];
};

export type FormalInvoice = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  storeSlug: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  quoteReference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  billingAddress: string;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  vatMinor: number;
  totalMinor: number;
  creditedMinor: number;
  status: FormalInvoiceStatus;
  issuedAt: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  brandSnapshot: InvoiceBrandSettings;
  paymentSnapshot: Record<string, unknown>;
  lines: FormalInvoiceLine[];
  creditNotes: FormalCreditNote[];
};

type Row = Record<string, any>;
function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function minor(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0; }
function iso(value: unknown) { if (!value) return ''; const date = new Date(value as any); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function jsonObject(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function paidStatus(value: unknown) { return ['paid', 'captured', 'authorized', 'refunded'].includes(clean(value).toLowerCase()); }

async function ensureTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalDocumentSequence" ("tenantId" TEXT NOT NULL,"year" INTEGER NOT NULL,"kind" TEXT NOT NULL,"lastValue" INTEGER NOT NULL DEFAULT 0,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY("tenantId","year","kind"));`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalInvoice" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"tenantSlug" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"invoiceNumber" TEXT NOT NULL,"orderId" TEXT NOT NULL,"orderNumber" TEXT NOT NULL,"quoteReference" TEXT NOT NULL DEFAULT '',"customerId" TEXT NOT NULL DEFAULT '',"customerName" TEXT NOT NULL,"customerEmail" TEXT NOT NULL DEFAULT '',"customerPhone" TEXT NOT NULL DEFAULT '',"customerCompany" TEXT NOT NULL DEFAULT '',"billingAddress" TEXT NOT NULL DEFAULT '',"currency" TEXT NOT NULL DEFAULT 'GBP',"subtotalMinor" INTEGER NOT NULL DEFAULT 0,"shippingMinor" INTEGER NOT NULL DEFAULT 0,"vatMinor" INTEGER NOT NULL DEFAULT 0,"totalMinor" INTEGER NOT NULL DEFAULT 0,"status" TEXT NOT NULL DEFAULT 'issued',"issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"paidAt" TIMESTAMP(3),"brandSnapshotJson" JSONB NOT NULL DEFAULT '{}'::jsonb,"paymentSnapshotJson" JSONB NOT NULL DEFAULT '{}'::jsonb,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("tenantId","invoiceNumber"),UNIQUE("tenantId","orderId"));`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalInvoiceLine" ("id" TEXT PRIMARY KEY,"invoiceId" TEXT NOT NULL,"position" INTEGER NOT NULL,"productName" TEXT NOT NULL,"sku" TEXT NOT NULL DEFAULT '',"quantity" INTEGER NOT NULL DEFAULT 1,"unitNetMinor" INTEGER NOT NULL DEFAULT 0,"netMinor" INTEGER NOT NULL DEFAULT 0,"vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,"vatMinor" INTEGER NOT NULL DEFAULT 0,"grossMinor" INTEGER NOT NULL DEFAULT 0,"metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalCreditNote" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"invoiceId" TEXT NOT NULL,"orderId" TEXT NOT NULL,"creditNoteNumber" TEXT NOT NULL,"reason" TEXT NOT NULL,"currency" TEXT NOT NULL DEFAULT 'GBP',"netMinor" INTEGER NOT NULL DEFAULT 0,"vatMinor" INTEGER NOT NULL DEFAULT 0,"totalMinor" INTEGER NOT NULL DEFAULT 0,"status" TEXT NOT NULL DEFAULT 'issued',"externalReference" TEXT NOT NULL DEFAULT '',"issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("tenantId","creditNoteNumber"));`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalCreditNoteLine" ("id" TEXT PRIMARY KEY,"creditNoteId" TEXT NOT NULL,"invoiceLineId" TEXT NOT NULL,"position" INTEGER NOT NULL,"description" TEXT NOT NULL,"quantity" INTEGER NOT NULL DEFAULT 1,"netMinor" INTEGER NOT NULL DEFAULT 0,"vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,"vatMinor" INTEGER NOT NULL DEFAULT 0,"grossMinor" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalInvoice_customer_idx" ON "FormalInvoice"("tenantId","customerEmail","storeSlug","issuedAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalInvoice_order_idx" ON "FormalInvoice"("tenantId","orderNumber")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalInvoiceLine_invoice_idx" ON "FormalInvoiceLine"("invoiceId","position")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalCreditNote_invoice_idx" ON "FormalCreditNote"("invoiceId","issuedAt")');
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "FormalCreditNote_external_idx" ON "FormalCreditNote"("tenantId","externalReference") WHERE "externalReference" <> \'\'');
}

export async function resolveInvoiceTenant(tenantSlug: string) {
  const key = slug(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Invoice tenant was not found.');
  return rows[0];
}

async function nextNumber(tx: any, tenantId: string, kind: 'INV' | 'CN') {
  const year = new Date().getUTCFullYear();
  const rows = await tx.$queryRawUnsafe<Array<{ lastValue: number }>>('INSERT INTO "FormalDocumentSequence" ("tenantId","year","kind","lastValue","updatedAt") VALUES ($1,$2,$3,1,NOW()) ON CONFLICT ("tenantId","year","kind") DO UPDATE SET "lastValue"="FormalDocumentSequence"."lastValue"+1,"updatedAt"=NOW() RETURNING "lastValue"', tenantId, year, kind);
  return `${kind}-${year}-${String(Number(rows[0]?.lastValue || 1)).padStart(6, '0')}`;
}

function orderLines(order: any) {
  const lines = (Array.isArray(order?.items) ? order.items : []).map((item: any, position: number) => {
    const metadata = jsonObject(item.metadataJson);
    const quantity = Math.max(1, minor(item.quantity) || 1);
    const grossMinor = minor(metadata.grossTotalMinor) || Math.round(Number(item.totalPrice || 0) * 100);
    const vatMinor = minor(metadata.vatMinor ?? item.vatMinor);
    const netMinor = minor(metadata.netTotalMinor ?? item.netTotalMinor) || Math.max(0, grossMinor - vatMinor);
    const vatRate = Number(metadata.vatRate ?? item.vatRate ?? (vatMinor ? 20 : 0));
    return { id: `finvl-${crypto.randomUUID()}`, position, productName: clean(item.productName) || 'Print item', sku: clean(item.sku || metadata.sku), quantity, unitNetMinor: minor(metadata.unitNetMinor) || Math.round(netMinor / quantity), netMinor, vatRate: Number.isFinite(vatRate) ? vatRate : 0, vatMinor, grossMinor, metadataJson: metadata };
  });
  const tax = order?.taxSummary || buildOrderVatSummary(order || {});
  const shippingGross = minor(tax.deliveryMinor ?? order?.shippingMinor);
  if (shippingGross > 0) {
    const shippingVat = minor(tax.deliveryVatMinor);
    const shippingNet = minor(tax.deliveryNetMinor) || Math.max(0, shippingGross - shippingVat);
    const rate = shippingNet ? Math.round((shippingVat / shippingNet) * 10000) / 100 : 0;
    lines.push({ id: `finvl-${crypto.randomUUID()}`, position: lines.length, productName: clean(order?.shippingMethod) ? `Delivery - ${clean(order.shippingMethod)}` : 'Delivery / fulfilment', sku: 'DELIVERY', quantity: 1, unitNetMinor: shippingNet, netMinor: shippingNet, vatRate: rate, vatMinor: shippingVat, grossMinor: shippingGross, metadataJson: { lineType: 'delivery' } });
  }
  return lines;
}

async function invoiceLines(invoiceId: string): Promise<FormalInvoiceLine[]> {
  const rows = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "FormalInvoiceLine" WHERE "invoiceId"=$1 ORDER BY position ASC', invoiceId);
  return rows.map((row) => ({ id: clean(row.id), invoiceId, position: minor(row.position), productName: clean(row.productName), sku: clean(row.sku), quantity: Math.max(1, minor(row.quantity)), unitNetMinor: minor(row.unitNetMinor), netMinor: minor(row.netMinor), vatRate: Number(row.vatRate || 0), vatMinor: minor(row.vatMinor), grossMinor: minor(row.grossMinor), metadataJson: jsonObject(row.metadataJson) }));
}

async function creditNotes(invoiceId: string): Promise<FormalCreditNote[]> {
  const rows = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "FormalCreditNote" WHERE "invoiceId"=$1 ORDER BY "issuedAt" DESC', invoiceId);
  const notes: FormalCreditNote[] = [];
  for (const row of rows) {
    const lineRows = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "FormalCreditNoteLine" WHERE "creditNoteId"=$1 ORDER BY position ASC', row.id);
    notes.push({ id: clean(row.id), tenantId: clean(row.tenantId), invoiceId, orderId: clean(row.orderId), creditNoteNumber: clean(row.creditNoteNumber), reason: clean(row.reason), currency: clean(row.currency) || 'GBP', netMinor: minor(row.netMinor), vatMinor: minor(row.vatMinor), totalMinor: minor(row.totalMinor), status: clean(row.status) === 'void' ? 'void' : 'issued', externalReference: clean(row.externalReference), issuedAt: iso(row.issuedAt), createdAt: iso(row.createdAt), lines: lineRows.map((line) => ({ id: clean(line.id), creditNoteId: clean(row.id), invoiceLineId: clean(line.invoiceLineId), position: minor(line.position), description: clean(line.description), quantity: Math.max(1, minor(line.quantity)), netMinor: minor(line.netMinor), vatRate: Number(line.vatRate || 0), vatMinor: minor(line.vatMinor), grossMinor: minor(line.grossMinor) })) });
  }
  return notes;
}

function invoiceStatus(value: unknown): FormalInvoiceStatus { const status = clean(value); return ['issued','paid','partially_credited','credited','void'].includes(status) ? status as FormalInvoiceStatus : 'issued'; }
async function rowToInvoice(row: Row): Promise<FormalInvoice> {
  const lines = await invoiceLines(row.id);
  const notes = await creditNotes(row.id);
  const creditedMinor = notes.filter((note) => note.status === 'issued').reduce((sum, note) => sum + note.totalMinor, 0);
  return { id: clean(row.id), tenantId: clean(row.tenantId), tenantSlug: clean(row.tenantSlug), storeSlug: clean(row.storeSlug), invoiceNumber: clean(row.invoiceNumber), orderId: clean(row.orderId), orderNumber: clean(row.orderNumber), quoteReference: clean(row.quoteReference), customerId: clean(row.customerId), customerName: clean(row.customerName), customerEmail: email(row.customerEmail), customerPhone: clean(row.customerPhone), customerCompany: clean(row.customerCompany), billingAddress: clean(row.billingAddress), currency: clean(row.currency) || 'GBP', subtotalMinor: minor(row.subtotalMinor), shippingMinor: minor(row.shippingMinor), vatMinor: minor(row.vatMinor), totalMinor: minor(row.totalMinor), creditedMinor, status: invoiceStatus(row.status), issuedAt: iso(row.issuedAt), paidAt: iso(row.paidAt), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), brandSnapshot: jsonObject(row.brandSnapshotJson) as InvoiceBrandSettings, paymentSnapshot: jsonObject(row.paymentSnapshotJson), lines, creditNotes: notes };
}

export async function getFormalInvoice(tenantSlug: string, idOrNumber: string) {
  await ensureTables();
  const tenant = await resolveInvoiceTenant(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "FormalInvoice" WHERE "tenantId"=$1 AND (id=$2 OR "invoiceNumber"=$2 OR "orderId"=$2 OR "orderNumber"=$2) LIMIT 1', tenant.id, clean(idOrNumber));
  return rows[0] ? rowToInvoice(rows[0]) : null;
}

export async function listFormalInvoices(tenantSlug: string, options: { storeSlug?: string; customerEmail?: string; customerId?: string; status?: string; limit?: number } = {}) {
  await ensureTables();
  const tenant = await resolveInvoiceTenant(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Row[]>(`SELECT * FROM "FormalInvoice" WHERE "tenantId"=$1 AND ($2='' OR "storeSlug"=$2) AND ($3='' OR lower("customerEmail")=lower($3)) AND ($4='' OR "customerId"=$4) AND ($5='' OR status=$5) ORDER BY "issuedAt" DESC LIMIT $6`, tenant.id, slug(options.storeSlug), email(options.customerEmail), clean(options.customerId), clean(options.status), Math.max(1, Math.min(500, Number(options.limit || 100))));
  const items: FormalInvoice[] = [];
  for (const row of rows) items.push(await rowToInvoice(row));
  return items;
}

export async function ensureInvoiceForPaidOrder(order: any) {
  if (!order?.id || !paidStatus(order.paymentStatus)) return { created: false, skipped: true, reason: 'Order is not paid.' };
  await ensureTables();
  const tenantSlug = clean(order?.resolver?.tenantSlug || order?.tenantSlug || order?.tenantId);
  const tenant = await resolveInvoiceTenant(tenantSlug);
  const existing = await getFormalInvoice(tenant.id, clean(order.id));
  if (existing) return { created: false, duplicate: true, invoice: existing };
  const tax = order.taxSummary || buildOrderVatSummary(order);
  const lines = orderLines(order);
  const settings = await getInvoiceSettings({ tenantId: tenant.id } as any);
  const id = `finv-${crypto.randomUUID()}`;
  await platformPrisma.$transaction(async (tx: any) => {
    const invoiceNumber = await nextNumber(tx, tenant.id, 'INV');
    await tx.$executeRawUnsafe('INSERT INTO "FormalInvoice" (id,"tenantId","tenantSlug","storeSlug","invoiceNumber","orderId","orderNumber","quoteReference","customerId","customerName","customerEmail","customerPhone","customerCompany","billingAddress",currency,"subtotalMinor","shippingMinor","vatMinor","totalMinor",status,"paidAt","brandSnapshotJson","paymentSnapshotJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,\'paid\',$20,$21::jsonb,$22::jsonb,NOW())', id, tenant.id, slug(tenantSlug), slug(order?.resolver?.storeSlug || order?.storeSlug || 'main'), invoiceNumber, clean(order.id), clean(order.orderNumber), clean(order.quoteReference), clean(order?.resolver?.customerId || order.customerId), clean(order.customerName) || 'Customer', email(order.customerEmail), clean(order.customerPhone), clean(order.customerCompany), clean(order.billingAddress || order.shippingAddress), clean(order.currency) || 'GBP', minor(tax.netMinor ?? order.subtotalMinor), minor(tax.deliveryMinor ?? order.shippingMinor), minor(tax.vatMinor ?? order.taxMinor), minor(tax.grossMinor ?? order.totalMinor), order.paidAt ? new Date(order.paidAt) : new Date(), JSON.stringify(settings), JSON.stringify({ provider: order.paymentProvider || '', reference: order.paymentReference || '', checkoutSessionId: order.stripeCheckoutSessionId || '', paymentIntentId: order.stripePaymentIntentId || '', paidAt: order.paidAt || new Date().toISOString() }));
    for (const line of lines) await tx.$executeRawUnsafe('INSERT INTO "FormalInvoiceLine" (id,"invoiceId",position,"productName",sku,quantity,"unitNetMinor","netMinor","vatRate","vatMinor","grossMinor","metadataJson") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)', line.id, id, line.position, line.productName, line.sku, line.quantity, line.unitNetMinor, line.netMinor, line.vatRate, line.vatMinor, line.grossMinor, JSON.stringify(line.metadataJson));
  });
  return { created: true, invoice: await getFormalInvoice(tenant.id, id) };
}

export async function createFormalCreditNote(input: { tenantSlug: string; invoiceId: string; reason: string; amountMinor?: number; externalReference?: string }) {
  await ensureTables();
  const invoice = await getFormalInvoice(input.tenantSlug, input.invoiceId);
  if (!invoice) throw new Error('Invoice was not found.');
  if (invoice.status === 'void') throw new Error('A void invoice cannot be credited.');
  const externalReference = clean(input.externalReference);
  if (externalReference) {
    const duplicate = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT id FROM "FormalCreditNote" WHERE "tenantId"=$1 AND "externalReference"=$2 LIMIT 1', invoice.tenantId, externalReference);
    if (duplicate[0]) return (await creditNotes(invoice.id)).find((note) => note.id === duplicate[0].id) || null;
  }
  const previousByLine = new Map<string, number>();
  for (const note of invoice.creditNotes.filter((item) => item.status === 'issued')) for (const line of note.lines) previousByLine.set(line.invoiceLineId, (previousByLine.get(line.invoiceLineId) || 0) + line.grossMinor);
  const available = invoice.lines.reduce((sum, line) => sum + Math.max(0, line.grossMinor - (previousByLine.get(line.id) || 0)), 0);
  const requested = Math.min(available, Math.max(1, minor(input.amountMinor) || available));
  if (!available || requested <= 0) throw new Error('This invoice has already been fully credited.');
  let remaining = requested;
  const allocations: Array<{ invoiceLineId: string; description: string; quantity: number; netMinor: number; vatRate: number; vatMinor: number; grossMinor: number }> = [];
  for (const line of invoice.lines) {
    if (remaining <= 0) break;
    const lineAvailable = Math.max(0, line.grossMinor - (previousByLine.get(line.id) || 0));
    if (!lineAvailable) continue;
    const grossMinor = Math.min(lineAvailable, remaining);
    const vatMinor = line.vatRate > 0 ? Math.round(grossMinor * line.vatRate / (100 + line.vatRate)) : 0;
    allocations.push({ invoiceLineId: line.id, description: line.productName, quantity: line.quantity, netMinor: grossMinor - vatMinor, vatRate: line.vatRate, vatMinor, grossMinor });
    remaining -= grossMinor;
  }
  const totalMinor = allocations.reduce((sum, line) => sum + line.grossMinor, 0);
  const vatMinor = allocations.reduce((sum, line) => sum + line.vatMinor, 0);
  const netMinor = totalMinor - vatMinor;
  const id = `fcn-${crypto.randomUUID()}`;
  await platformPrisma.$transaction(async (tx: any) => {
    const creditNoteNumber = await nextNumber(tx, invoice.tenantId, 'CN');
    await tx.$executeRawUnsafe('INSERT INTO "FormalCreditNote" (id,"tenantId","invoiceId","orderId","creditNoteNumber",reason,currency,"netMinor","vatMinor","totalMinor",status,"externalReference") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,\'issued\',$11)', id, invoice.tenantId, invoice.id, invoice.orderId, creditNoteNumber, clean(input.reason) || 'Refund / account adjustment', invoice.currency, netMinor, vatMinor, totalMinor, externalReference);
    for (const [position, line] of allocations.entries()) await tx.$executeRawUnsafe('INSERT INTO "FormalCreditNoteLine" (id,"creditNoteId","invoiceLineId",position,description,quantity,"netMinor","vatRate","vatMinor","grossMinor") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', `fcnl-${crypto.randomUUID()}`, id, line.invoiceLineId, position, line.description, line.quantity, line.netMinor, line.vatRate, line.vatMinor, line.grossMinor);
    const creditedAfter = invoice.creditedMinor + totalMinor;
    const status = creditedAfter >= invoice.totalMinor ? 'credited' : 'partially_credited';
    await tx.$executeRawUnsafe('UPDATE "FormalInvoice" SET status=$2,"updatedAt"=NOW() WHERE id=$1', invoice.id, status);
  });
  return (await creditNotes(invoice.id)).find((note) => note.id === id) || null;
}

export async function syncInvoiceFromPaymentOrder(order: any) {
  if (!order) return { invoice: null, creditNote: null, skipped: true };
  const invoiceResult = await ensureInvoiceForPaidOrder(order);
  const invoice = (invoiceResult as any).invoice || null;
  if (clean(order.paymentStatus).toLowerCase() !== 'refunded' || !invoice) return { invoice, creditNote: null, ...invoiceResult };
  const refundAmountMinor = minor(order.refundAmountMinor) || invoice.totalMinor;
  const creditNote = await createFormalCreditNote({ tenantSlug: invoice.tenantId, invoiceId: invoice.id, amountMinor: refundAmountMinor, reason: clean(order.refundNote) || 'Stripe refund', externalReference: clean(order.stripeRefundId || order.paymentReference) });
  return { invoice, creditNote, created: (invoiceResult as any).created || false };
}
