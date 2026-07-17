import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';

export type FormalQuoteStatus = 'requested' | 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired' | 'converted' | 'paid';
export type FormalQuoteLineInput = {
  id?: string;
  productId?: string;
  productSlug?: string;
  categorySlug?: string;
  productName: string;
  description?: string;
  quantity: number;
  unitNetMinor?: number;
  netMinor?: number;
  vatRate?: number;
  vatMinor?: number;
  grossMinor?: number;
  selectedOptions?: Array<{ key: string; label: string; value: string; slug?: string }>;
  metadataJson?: Record<string, unknown>;
};
export type FormalQuoteLine = Required<Pick<FormalQuoteLineInput, 'id' | 'productName' | 'quantity' | 'unitNetMinor' | 'netMinor' | 'vatRate' | 'vatMinor' | 'grossMinor'>> & FormalQuoteLineInput & { position: number };
export type FormalQuote = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  storeSlug: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  title: string;
  status: FormalQuoteStatus;
  currency: string;
  subtotalMinor: number;
  vatMinor: number;
  totalMinor: number;
  customerNotes: string;
  internalNotes: string;
  expiresAt: string;
  sentAt: string;
  viewedAt: string;
  approvedAt: string;
  declinedAt: string;
  convertedAt: string;
  convertedOrderId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lines: FormalQuoteLine[];
  revisions?: Array<Record<string, unknown>>;
};

type CreateInput = {
  tenantSlug: string;
  storeSlug: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  title: string;
  status?: FormalQuoteStatus;
  currency?: string;
  customerNotes?: string;
  internalNotes?: string;
  expiresAt?: string | Date | null;
  lines: FormalQuoteLineInput[];
  actorType?: string;
  actorId?: string;
};

type UpdateInput = Partial<Omit<CreateInput, 'tenantSlug' | 'storeSlug'>> & { status?: FormalQuoteStatus; convertedOrderId?: string };

type QuoteRow = Record<string, any>;
const ACCESS_DAYS = 30;

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function integer(value: unknown, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? Math.round(next) : fallback; }
function iso(value: unknown) { if (!value) return ''; const date = new Date(value as any); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function hashToken(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function safeStatus(value: unknown): FormalQuoteStatus { const status = clean(value).toLowerCase(); return ['requested','draft','sent','viewed','approved','declined','expired','converted','paid'].includes(status) ? status as FormalQuoteStatus : 'draft'; }
function defaultExpiry() { return new Date(Date.now() + 30 * 86400000); }

async function ensureTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalQuoteSequence" ("tenantId" TEXT NOT NULL,"year" INTEGER NOT NULL,"lastValue" INTEGER NOT NULL DEFAULT 0,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY("tenantId","year"));`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalQuote" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"tenantSlug" TEXT NOT NULL,"storeSlug" TEXT NOT NULL,"quoteNumber" TEXT NOT NULL,"customerId" TEXT NOT NULL DEFAULT '',"customerName" TEXT NOT NULL,"customerEmail" TEXT NOT NULL DEFAULT '',"customerPhone" TEXT NOT NULL DEFAULT '',"customerCompany" TEXT NOT NULL DEFAULT '',"title" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'draft',"currency" TEXT NOT NULL DEFAULT 'GBP',"subtotalMinor" INTEGER NOT NULL DEFAULT 0,"vatMinor" INTEGER NOT NULL DEFAULT 0,"totalMinor" INTEGER NOT NULL DEFAULT 0,"customerNotes" TEXT NOT NULL DEFAULT '',"internalNotes" TEXT NOT NULL DEFAULT '',"expiresAt" TIMESTAMP(3),"sentAt" TIMESTAMP(3),"viewedAt" TIMESTAMP(3),"approvedAt" TIMESTAMP(3),"declinedAt" TIMESTAMP(3),"convertedAt" TIMESTAMP(3),"convertedOrderId" TEXT NOT NULL DEFAULT '',"revision" INTEGER NOT NULL DEFAULT 1,"publicTokenHash" TEXT NOT NULL DEFAULT '',"publicTokenExpiresAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("tenantId","quoteNumber"));`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalQuoteLine" ("id" TEXT PRIMARY KEY,"quoteId" TEXT NOT NULL,"position" INTEGER NOT NULL,"productId" TEXT NOT NULL DEFAULT '',"productSlug" TEXT NOT NULL DEFAULT '',"categorySlug" TEXT NOT NULL DEFAULT '',"productName" TEXT NOT NULL,"description" TEXT NOT NULL DEFAULT '',"quantity" INTEGER NOT NULL DEFAULT 1,"unitNetMinor" INTEGER NOT NULL DEFAULT 0,"netMinor" INTEGER NOT NULL DEFAULT 0,"vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,"vatMinor" INTEGER NOT NULL DEFAULT 0,"grossMinor" INTEGER NOT NULL DEFAULT 0,"selectedOptions" JSONB NOT NULL DEFAULT '[]'::jsonb,"metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FormalQuoteRevision" ("id" TEXT PRIMARY KEY,"quoteId" TEXT NOT NULL,"revision" INTEGER NOT NULL,"action" TEXT NOT NULL,"actorType" TEXT NOT NULL DEFAULT 'system',"actorId" TEXT NOT NULL DEFAULT '',"note" TEXT NOT NULL DEFAULT '',"snapshotJson" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalQuote_tenant_status_idx" ON "FormalQuote"("tenantId","status","updatedAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalQuote_customer_idx" ON "FormalQuote"("tenantId","customerEmail","storeSlug")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalQuoteLine_quote_idx" ON "FormalQuoteLine"("quoteId","position")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "FormalQuoteRevision_quote_idx" ON "FormalQuoteRevision"("quoteId","revision")');
}

export async function resolveFormalQuoteTenant(tenantSlug: string) {
  const key = slug(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', key);
  if (!rows[0]) throw new Error('Quote tenant was not found.');
  return rows[0];
}

function normaliseLine(input: FormalQuoteLineInput, position: number): FormalQuoteLine {
  const quantity = Math.max(1, integer(input.quantity, 1));
  const vatRate = Math.max(0, Number(input.vatRate ?? 20));
  const suppliedNet = Math.max(0, integer(input.netMinor));
  const unitNetMinor = Math.max(0, integer(input.unitNetMinor, suppliedNet ? Math.round(suppliedNet / quantity) : 0));
  const netMinor = suppliedNet || unitNetMinor * quantity;
  const vatMinor = input.vatMinor === undefined ? Math.round(netMinor * vatRate / 100) : Math.max(0, integer(input.vatMinor));
  const grossMinor = input.grossMinor === undefined ? netMinor + vatMinor : Math.max(0, integer(input.grossMinor));
  return { ...input, id: clean(input.id) || `fql-${crypto.randomUUID()}`, position, productId: clean(input.productId), productSlug: slug(input.productSlug), categorySlug: slug(input.categorySlug), productName: clean(input.productName) || 'Print item', description: clean(input.description), quantity, unitNetMinor, netMinor, vatRate, vatMinor, grossMinor, selectedOptions: Array.isArray(input.selectedOptions) ? input.selectedOptions : [], metadataJson: input.metadataJson && typeof input.metadataJson === 'object' ? input.metadataJson : {} };
}
function totals(lines: FormalQuoteLine[]) { return lines.reduce((sum, line) => ({ subtotalMinor: sum.subtotalMinor + line.netMinor, vatMinor: sum.vatMinor + line.vatMinor, totalMinor: sum.totalMinor + line.grossMinor }), { subtotalMinor: 0, vatMinor: 0, totalMinor: 0 }); }

async function nextQuoteNumber(tx: any, tenantId: string) {
  const year = new Date().getUTCFullYear();
  const rows = await tx.$queryRawUnsafe<Array<{ lastValue: number }>>('INSERT INTO "FormalQuoteSequence" ("tenantId","year","lastValue","updatedAt") VALUES ($1,$2,1,NOW()) ON CONFLICT ("tenantId","year") DO UPDATE SET "lastValue"="FormalQuoteSequence"."lastValue"+1,"updatedAt"=NOW() RETURNING "lastValue"', tenantId, year);
  const sequence = Number(rows[0]?.lastValue || 1);
  return { year, sequence, quoteNumber: `Q-${year}-${String(sequence).padStart(6, '0')}` };
}

function rowToQuote(row: QuoteRow, lines: FormalQuoteLine[] = [], revisions?: Array<Record<string, unknown>>): FormalQuote {
  return { id: clean(row.id), tenantId: clean(row.tenantId), tenantSlug: clean(row.tenantSlug), storeSlug: clean(row.storeSlug), quoteNumber: clean(row.quoteNumber), customerId: clean(row.customerId), customerName: clean(row.customerName), customerEmail: email(row.customerEmail), customerPhone: clean(row.customerPhone), customerCompany: clean(row.customerCompany), title: clean(row.title), status: safeStatus(row.status), currency: clean(row.currency) || 'GBP', subtotalMinor: integer(row.subtotalMinor), vatMinor: integer(row.vatMinor), totalMinor: integer(row.totalMinor), customerNotes: clean(row.customerNotes), internalNotes: clean(row.internalNotes), expiresAt: iso(row.expiresAt), sentAt: iso(row.sentAt), viewedAt: iso(row.viewedAt), approvedAt: iso(row.approvedAt), declinedAt: iso(row.declinedAt), convertedAt: iso(row.convertedAt), convertedOrderId: clean(row.convertedOrderId), revision: Math.max(1, integer(row.revision, 1)), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), lines, revisions };
}

async function quoteLines(quoteId: string): Promise<FormalQuoteLine[]> {
  const rows = await platformPrisma.$queryRawUnsafe<QuoteRow[]>('SELECT * FROM "FormalQuoteLine" WHERE "quoteId"=$1 ORDER BY position ASC', quoteId);
  return rows.map((row) => ({ id: clean(row.id), quoteId, position: integer(row.position), productId: clean(row.productId), productSlug: clean(row.productSlug), categorySlug: clean(row.categorySlug), productName: clean(row.productName), description: clean(row.description), quantity: integer(row.quantity, 1), unitNetMinor: integer(row.unitNetMinor), netMinor: integer(row.netMinor), vatRate: Number(row.vatRate || 0), vatMinor: integer(row.vatMinor), grossMinor: integer(row.grossMinor), selectedOptions: Array.isArray(row.selectedOptions) ? row.selectedOptions : [], metadataJson: row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {} }));
}
async function quoteRevisions(quoteId: string) { const rows = await platformPrisma.$queryRawUnsafe<QuoteRow[]>('SELECT id,revision,action,"actorType","actorId",note,"snapshotJson","createdAt" FROM "FormalQuoteRevision" WHERE "quoteId"=$1 ORDER BY revision DESC LIMIT 100', quoteId); return rows.map((row) => ({ id: row.id, revision: row.revision, action: row.action, actorType: row.actorType, actorId: row.actorId, note: row.note, snapshot: row.snapshotJson, createdAt: iso(row.createdAt) })); }

async function snapshot(tx: any, quoteId: string, revision: number, action: string, actorType = 'system', actorId = '', note = '') {
  const quoteRows = await tx.$queryRawUnsafe<QuoteRow[]>('SELECT * FROM "FormalQuote" WHERE id=$1 LIMIT 1', quoteId);
  const lineRows = await tx.$queryRawUnsafe<QuoteRow[]>('SELECT * FROM "FormalQuoteLine" WHERE "quoteId"=$1 ORDER BY position ASC', quoteId);
  if (!quoteRows[0]) return;
  await tx.$executeRawUnsafe('INSERT INTO "FormalQuoteRevision" (id,"quoteId",revision,action,"actorType","actorId",note,"snapshotJson") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)', `fqr-${crypto.randomUUID()}`, quoteId, revision, action, clean(actorType) || 'system', clean(actorId), clean(note), JSON.stringify({ quote: quoteRows[0], lines: lineRows }));
}

async function replaceLines(tx: any, quoteId: string, lines: FormalQuoteLine[]) {
  await tx.$executeRawUnsafe('DELETE FROM "FormalQuoteLine" WHERE "quoteId"=$1', quoteId);
  for (const line of lines) await tx.$executeRawUnsafe('INSERT INTO "FormalQuoteLine" (id,"quoteId",position,"productId","productSlug","categorySlug","productName",description,quantity,"unitNetMinor","netMinor","vatRate","vatMinor","grossMinor","selectedOptions","metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,NOW())', line.id, quoteId, line.position, clean(line.productId), slug(line.productSlug), slug(line.categorySlug), line.productName, clean(line.description), line.quantity, line.unitNetMinor, line.netMinor, line.vatRate, line.vatMinor, line.grossMinor, JSON.stringify(line.selectedOptions || []), JSON.stringify(line.metadataJson || {}));
}

export async function createFormalQuote(input: CreateInput) {
  await ensureTables();
  const tenant = await resolveFormalQuoteTenant(input.tenantSlug);
  const lines = input.lines.map(normaliseLine);
  if (!lines.length) throw new Error('A quote requires at least one line.');
  const sum = totals(lines);
  const id = `fq-${crypto.randomUUID()}`;
  await platformPrisma.$transaction(async (tx: any) => {
    const number = await nextQuoteNumber(tx, tenant.id);
    await tx.$executeRawUnsafe('INSERT INTO "FormalQuote" (id,"tenantId","tenantSlug","storeSlug","quoteNumber","customerId","customerName","customerEmail","customerPhone","customerCompany",title,status,currency,"subtotalMinor","vatMinor","totalMinor","customerNotes","internalNotes","expiresAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())', id, tenant.id, slug(input.tenantSlug), slug(input.storeSlug), number.quoteNumber, clean(input.customerId), clean(input.customerName), email(input.customerEmail), clean(input.customerPhone), clean(input.customerCompany), clean(input.title) || 'Print quotation', safeStatus(input.status || 'requested'), clean(input.currency) || 'GBP', sum.subtotalMinor, sum.vatMinor, sum.totalMinor, clean(input.customerNotes), clean(input.internalNotes), input.expiresAt ? new Date(input.expiresAt) : defaultExpiry());
    await replaceLines(tx, id, lines);
    await snapshot(tx, id, 1, 'created', input.actorType || 'storefront', input.actorId || clean(input.customerId), 'Quote created');
  });
  return getFormalQuote(input.tenantSlug, id, { includeRevisions: true });
}

export async function getFormalQuote(tenantSlug: string, idOrNumber: string, options: { includeRevisions?: boolean } = {}) {
  await ensureTables();
  const tenant = await resolveFormalQuoteTenant(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<QuoteRow[]>('SELECT * FROM "FormalQuote" WHERE "tenantId"=$1 AND (id=$2 OR "quoteNumber"=$2) LIMIT 1', tenant.id, clean(idOrNumber));
  if (!rows[0]) return null;
  const [lines, revisions] = await Promise.all([quoteLines(rows[0].id), options.includeRevisions ? quoteRevisions(rows[0].id) : Promise.resolve(undefined)]);
  return rowToQuote(rows[0], lines, revisions);
}

export async function listFormalQuotes(tenantSlug: string, filters: { storeSlug?: string; customerEmail?: string; customerId?: string; status?: string; limit?: number } = {}) {
  await ensureTables();
  const tenant = await resolveFormalQuoteTenant(tenantSlug);
  const rows = await platformPrisma.$queryRawUnsafe<QuoteRow[]>('SELECT * FROM "FormalQuote" WHERE "tenantId"=$1 AND ($2='' OR "storeSlug"=$2) AND ($3='' OR lower("customerEmail")=lower($3)) AND ($4='' OR "customerId"=$4) AND ($5='' OR status=$5) ORDER BY "updatedAt" DESC LIMIT $6', tenant.id, slug(filters.storeSlug), email(filters.customerEmail), clean(filters.customerId), clean(filters.status), Math.max(1, Math.min(500, integer(filters.limit, 200))));
  return Promise.all(rows.map(async (row) => rowToQuote(row, await quoteLines(row.id))));
}

export async function updateFormalQuote(tenantSlug: string, idOrNumber: string, input: UpdateInput, actor: { type?: string; id?: string; action?: string; note?: string } = {}) {
  await ensureTables();
  const tenant = await resolveFormalQuoteTenant(tenantSlug);
  const current = await getFormalQuote(tenantSlug, idOrNumber);
  if (!current) throw new Error('Quote was not found.');
  if (['converted','paid'].includes(current.status) && input.lines) throw new Error('Converted or paid quotes cannot be repriced. Create a new revision instead.');
  const lines = input.lines ? input.lines.map(normaliseLine) : current.lines;
  if (!lines.length) throw new Error('A quote requires at least one line.');
  const sum = totals(lines);
  const nextStatus = input.status ? safeStatus(input.status) : current.status;
  const revision = current.revision + 1;
  await platformPrisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('UPDATE "FormalQuote" SET "customerId"=$2,"customerName"=$3,"customerEmail"=$4,"customerPhone"=$5,"customerCompany"=$6,title=$7,status=$8,currency=$9,"subtotalMinor"=$10,"vatMinor"=$11,"totalMinor"=$12,"customerNotes"=$13,"internalNotes"=$14,"expiresAt"=$15,"convertedOrderId"=$16,revision=$17,"approvedAt"=CASE WHEN $8=\'approved\' AND "approvedAt" IS NULL THEN NOW() ELSE "approvedAt" END,"declinedAt"=CASE WHEN $8=\'declined\' AND "declinedAt" IS NULL THEN NOW() ELSE "declinedAt" END,"convertedAt"=CASE WHEN $8 IN (\'converted\',\'paid\') AND "convertedAt" IS NULL THEN NOW() ELSE "convertedAt" END,"updatedAt"=NOW() WHERE id=$1 AND "tenantId"=$18', current.id, clean(input.customerId ?? current.customerId), clean(input.customerName ?? current.customerName), email(input.customerEmail ?? current.customerEmail), clean(input.customerPhone ?? current.customerPhone), clean(input.customerCompany ?? current.customerCompany), clean(input.title ?? current.title), nextStatus, clean(input.currency ?? current.currency) || 'GBP', sum.subtotalMinor, sum.vatMinor, sum.totalMinor, clean(input.customerNotes ?? current.customerNotes), clean(input.internalNotes ?? current.internalNotes), input.expiresAt === null ? null : input.expiresAt ? new Date(input.expiresAt) : current.expiresAt ? new Date(current.expiresAt) : defaultExpiry(), clean(input.convertedOrderId ?? current.convertedOrderId), revision, tenant.id);
    await replaceLines(tx, current.id, lines);
    await snapshot(tx, current.id, revision, actor.action || 'updated', actor.type || 'admin', actor.id || '', actor.note || 'Quote updated');
  });
  return getFormalQuote(tenantSlug, current.id, { includeRevisions: true });
}

export async function issueFormalQuoteAccess(tenantSlug: string, quoteId: string) {
  await ensureTables();
  const quote = await getFormalQuote(tenantSlug, quoteId);
  if (!quote) throw new Error('Quote was not found.');
  if (!quote.customerEmail) throw new Error('A customer email is required before sending this quote.');
  const token = crypto.randomBytes(40).toString('base64url');
  const expiresAt = new Date(Date.now() + ACCESS_DAYS * 86400000);
  await platformPrisma.$executeRawUnsafe('UPDATE "FormalQuote" SET status=CASE WHEN status IN (\'requested\',\'draft\') THEN \'sent\' ELSE status END,"publicTokenHash"=$2,"publicTokenExpiresAt"=$3,"sentAt"=COALESCE("sentAt",NOW()),"updatedAt"=NOW() WHERE id=$1', quote.id, hashToken(token), expiresAt);
  await platformPrisma.$transaction(async (tx: any) => snapshot(tx, quote.id, quote.revision, 'sent', 'admin', '', 'Quote sent to customer'));
  return { quote: await getFormalQuote(tenantSlug, quote.id), token, expiresAt: expiresAt.toISOString() };
}

export async function accessFormalQuote(input: { tenantSlug: string; storeSlug: string; quoteId: string; token?: string; customerId?: string; customerEmail?: string; markViewed?: boolean }) {
  const quote = await getFormalQuote(input.tenantSlug, input.quoteId, { includeRevisions: false });
  if (!quote || quote.storeSlug !== slug(input.storeSlug)) return null;
  const owns = Boolean(input.customerId && quote.customerId && clean(input.customerId) === quote.customerId) || Boolean(input.customerEmail && quote.customerEmail && email(input.customerEmail) === quote.customerEmail);
  let tokenValid = false;
  if (input.token) {
    const tenant = await resolveFormalQuoteTenant(input.tenantSlug);
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ ok: boolean }>>('SELECT true AS ok FROM "FormalQuote" WHERE id=$1 AND "tenantId"=$2 AND "publicTokenHash"=$3 AND "publicTokenExpiresAt">NOW() LIMIT 1', quote.id, tenant.id, hashToken(input.token));
    tokenValid = Boolean(rows[0]?.ok);
  }
  if (!owns && !tokenValid) return null;
  if (input.markViewed && ['sent','draft','requested'].includes(quote.status)) await platformPrisma.$executeRawUnsafe('UPDATE "FormalQuote" SET status=CASE WHEN status=\'sent\' THEN \'viewed\' ELSE status END,"viewedAt"=COALESCE("viewedAt",NOW()),"updatedAt"=NOW() WHERE id=$1', quote.id);
  return getFormalQuote(input.tenantSlug, quote.id, { includeRevisions: false });
}

export async function decideFormalQuote(input: { tenantSlug: string; storeSlug: string; quoteId: string; decision: 'approved' | 'declined'; token?: string; customerId?: string; customerEmail?: string; note?: string }) {
  const quote = await accessFormalQuote({ ...input, markViewed: true });
  if (!quote) throw new Error('Quote access was not authorised.');
  if (quote.expiresAt && new Date(quote.expiresAt).getTime() < Date.now()) { await updateFormalQuote(input.tenantSlug, quote.id, { status: 'expired' }, { type: 'system', action: 'expired', note: 'Quote expiry reached' }); throw new Error('This quote has expired.'); }
  if (['converted','paid'].includes(quote.status)) return quote;
  return updateFormalQuote(input.tenantSlug, quote.id, { status: input.decision, customerNotes: clean(input.note) || quote.customerNotes }, { type: 'customer', id: clean(input.customerId), action: input.decision, note: clean(input.note) || `Customer ${input.decision} quote` });
}

export function formalQuoteDocumentHtml(quote: FormalQuote, brandName = 'Holo Print') {
  const money = (minor: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: quote.currency || 'GBP' }).format(minor / 100);
  const escape = (value: unknown) => clean(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const rows = quote.lines.map((line) => `<tr><td>${escape(line.productName)}${line.description ? `<div class="muted">${escape(line.description)}</div>` : ''}</td><td>${line.quantity}</td><td>${money(line.unitNetMinor)}</td><td>${line.vatRate}%</td><td>${money(line.grossMinor)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(quote.quoteNumber)}</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:40px}.top{display:flex;justify-content:space-between;gap:24px}.brand{font-size:28px;font-weight:800}.num{font-size:20px;font-weight:800}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left}th{font-size:11px;text-transform:uppercase;color:#64748b}.totals{margin-left:auto;margin-top:24px;width:320px}.totals div{display:flex;justify-content:space-between;padding:7px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #111827}.muted{color:#64748b;font-size:12px;margin-top:4px}@media print{body{margin:18mm}.no-print{display:none}}</style></head><body><div class="top"><div><div class="brand">${escape(brandName)}</div><div class="muted">Formal print quotation</div></div><div><div class="num">${escape(quote.quoteNumber)}</div><div class="muted">Status: ${escape(quote.status)}</div><div class="muted">Expires: ${quote.expiresAt ? escape(new Date(quote.expiresAt).toLocaleDateString('en-GB')) : 'Not set'}</div></div></div><h1>${escape(quote.title)}</h1><p><strong>Customer:</strong> ${escape(quote.customerName)}<br>${escape(quote.customerCompany)}<br>${escape(quote.customerEmail)} ${escape(quote.customerPhone)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit net</th><th>VAT</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${money(quote.subtotalMinor)}</strong></div><div><span>VAT</span><strong>${money(quote.vatMinor)}</strong></div><div class="grand"><span>Total</span><strong>${money(quote.totalMinor)}</strong></div></div>${quote.customerNotes ? `<h3>Customer notes</h3><p>${escape(quote.customerNotes)}</p>` : ''}<p class="muted">Quote revision ${quote.revision}. Prices and availability remain subject to the expiry date above.</p><button class="no-print" onclick="window.print()">Print / Save as PDF</button></body></html>`;
}
