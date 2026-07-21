import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { customerFromRequest, type StorefrontCustomer } from '@/core/storefront/customer-account.service';
import type { TenantContext } from '@/core/tenant/types';

const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';
const MAX_PROOF_BYTES = 20 * 1024 * 1024;
const TOKEN_DAYS = 14;
const MAX_REVISIONS = 40;

export type ArtworkProofStatus = 'sent' | 'viewed' | 'approved' | 'changes-requested' | 'superseded' | 'withdrawn';

type TenantScope = {
  canonicalTenantId: string;
  tenantSlug: string;
  tenantIds: string[];
  ticketTenantId: string;
};

type StoreRow = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  metadataJson?: Record<string, any> | null;
  storeSlug: string;
  storeName: string;
};

type ProofRow = {
  id: string;
  tenantId: string;
  storeSlug: string;
  ticketId: string;
  orderId: string | null;
  orderNumber: string;
  lineId: string | null;
  productName: string;
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  revisionNumber: number;
  status: ArtworkProofStatus;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  message: string;
  tokenHash: string;
  tokenExpiresAt: Date | string | null;
  createdBy: string;
  createdAt: Date | string;
  sentAt: Date | string | null;
  viewedAt: Date | string | null;
  decidedAt: Date | string | null;
  decisionNote: string;
  supersededById: string | null;
};

type ProofFileRow = ProofRow & { fileBytes: Buffer };

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function uniq(values: string[]) { return Array.from(new Set(values.map(clean).filter(Boolean))); }
function tokenHash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function checksum(value: Buffer) { return crypto.createHash('sha256').update(value).digest('hex'); }
function iso(value: Date | string | null | undefined) { if (!value) return ''; const date = value instanceof Date ? value : new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function safeName(value: unknown) { return clean(value || 'proof.pdf').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'proof.pdf'; }
function activeStatus(value: string) { return value === 'sent' || value === 'viewed'; }
function paymentReleased(ticket: Record<string, any>) { const value = clean(ticket.paymentStatus || ticket.paymentGate).toLowerCase(); return ticket.paymentReleased === true || ['paid', 'captured', 'authorized', 'manual-paid'].includes(value); }

function detectProofType(buffer: Buffer) {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return { mimeType: 'application/pdf', extension: 'pdf' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mimeType: 'image/png', extension: 'png' };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mimeType: 'image/jpeg', extension: 'jpg' };
  throw new Error('Proof files must be PDF, PNG or JPEG.');
}

async function ensureTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontArtworkProofRevision" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "lineId" TEXT,
    "productName" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "revisionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileBytes" BYTEA NOT NULL,
    "checksum" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL DEFAULT '',
    "tokenExpiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT NOT NULL DEFAULT '',
    "supersededById" TEXT
  );`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontArtworkProofEvent" (
    "id" TEXT PRIMARY KEY,
    "proofId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorLabel" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontArtworkProofRevision_scope_revision_uq" ON "StorefrontArtworkProofRevision"("tenantId","storeSlug","ticketId","revisionNumber")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontArtworkProofRevision_scope_ticket_idx" ON "StorefrontArtworkProofRevision"("tenantId","storeSlug","ticketId","createdAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontArtworkProofRevision_customer_idx" ON "StorefrontArtworkProofRevision"("tenantId","storeSlug","customerId","customerEmail")');
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontArtworkProofRevision_token_uq" ON "StorefrontArtworkProofRevision"("tokenHash") WHERE "tokenHash" <> \'\'');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontArtworkProofEvent_proof_idx" ON "StorefrontArtworkProofEvent"("proofId","createdAt")');
}

async function resolveTenantScope(value: string): Promise<TenantScope> {
  const requested = clean(value);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    requested,
  ).catch(() => []);
  const tenant = rows[0];
  if (!tenant) throw new Error('Storefront tenant was not found.');
  return {
    canonicalTenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantIds: uniq([requested, tenant.id, tenant.slug, tenant.defaultSubdomain]),
    ticketTenantId: requested || tenant.slug,
  };
}

async function loadStores(scope: TenantScope): Promise<StoreRow[]> {
  const placeholders = scope.tenantIds.map((_, index) => `$${index + 1}`).join(',');
  if (!placeholders) return [];
  const rows = await platformPrisma.$queryRawUnsafe<Array<Omit<StoreRow, 'storeSlug' | 'storeName'>>>(
    `SELECT id,"tenantId",slug,name,"metadataJson" FROM "CoreCatalogRecord" WHERE resource='storefront-stores' AND "tenantId" IN (${placeholders}) ORDER BY "updatedAt" DESC`,
    ...scope.tenantIds,
  ).catch(() => []);
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const meta = row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
    const storeSlug = slug(meta.storeSlug || meta.slug || meta.storeId || row.slug);
    if (!storeSlug || seen.has(storeSlug)) return [];
    seen.add(storeSlug);
    return [{ ...row, storeSlug, storeName: clean(meta.name || meta.title || row.name || storeSlug) }];
  });
}

async function resolveStore(tenantSlugOrId: string, requestedStoreSlug?: string) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const stores = await loadStores(scope);
  const requested = slug(requestedStoreSlug);
  const store = requested ? stores.find((item) => item.storeSlug === requested) || null : stores[0] || null;
  if (!store) throw new Error(requested ? 'Storefront store not found for this tenant.' : 'Create a storefront before managing artwork proofs.');
  return { scope, stores, store };
}

async function loadTickets(scope: TenantScope) {
  const candidates = uniq([scope.ticketTenantId, scope.tenantSlug, scope.canonicalTenantId]);
  let lastError: unknown = null;
  for (const tenantId of candidates) {
    try {
      const ctx: TenantContext = { tenantId };
      const record = await getInternalCatalogRecord(ctx, CONFIG_RESOURCE, TICKETS_KEY);
      const items = (record as any)?.metadataJson?.items;
      return { ctx, items: Array.isArray(items) ? items as Record<string, any>[] : [] };
    } catch (cause) {
      lastError = cause;
      const message = cause instanceof Error ? cause.message : '';
      if (/was not found/i.test(message)) return { ctx: { tenantId }, items: [] as Record<string, any>[] };
    }
  }
  if (lastError) throw lastError;
  return { ctx: { tenantId: scope.ticketTenantId }, items: [] as Record<string, any>[] };
}

async function saveTickets(ctx: TenantContext, items: Record<string, any>[]) {
  await upsertInternalCatalogRecord(ctx, CONFIG_RESOURCE, {
    id: TICKETS_KEY,
    slug: TICKETS_KEY,
    name: 'Production Job Tickets',
    description: 'Manufacturing job tickets with storefront artwork, preflight, proof, payment and production handoff',
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: TICKETS_KEY, source: 'storefront-artwork-production-bridge' },
  } as any);
}

function event(action: string, actor: { type: string; id?: string; label?: string }, note = '', metadata: Record<string, unknown> = {}) {
  return { action, actorType: actor.type, actorId: clean(actor.id), actorLabel: clean(actor.label), note: clean(note), metadata };
}

async function addEvent(proof: Pick<ProofRow, 'id' | 'tenantId' | 'storeSlug' | 'ticketId'>, input: ReturnType<typeof event>) {
  await platformPrisma.$executeRawUnsafe(
    'INSERT INTO "StorefrontArtworkProofEvent" (id,"proofId","tenantId","storeSlug","ticketId",action,"actorType","actorId","actorLabel",note,"metadataJson") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)',
    `proof-event-${crypto.randomUUID()}`, proof.id, proof.tenantId, proof.storeSlug, proof.ticketId, input.action, input.actorType, input.actorId, input.actorLabel, input.note, JSON.stringify(input.metadata || {}),
  );
}

const proofSelect = 'id,"tenantId","storeSlug","ticketId","orderId","orderNumber","lineId","productName","customerId","customerEmail","customerName","revisionNumber",status,"fileName","mimeType","sizeBytes",checksum,message,"tokenHash","tokenExpiresAt","createdBy","createdAt","sentAt","viewedAt","decidedAt","decisionNote","supersededById"';

function publicProof(row: ProofRow, events: Record<string, any>[] = []) {
  return {
    id: row.id,
    storeSlug: row.storeSlug,
    ticketId: row.ticketId,
    orderId: row.orderId || '',
    orderNumber: row.orderNumber,
    lineId: row.lineId || '',
    productName: row.productName,
    customerName: row.customerName,
    revisionNumber: Number(row.revisionNumber || 0),
    status: row.status,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes || 0),
    checksum: row.checksum,
    message: row.message,
    tokenExpiresAt: iso(row.tokenExpiresAt),
    createdAt: iso(row.createdAt),
    sentAt: iso(row.sentAt),
    viewedAt: iso(row.viewedAt),
    decidedAt: iso(row.decidedAt),
    decisionNote: row.decisionNote,
    supersededById: row.supersededById || '',
    events: events.map((item) => ({ id: item.id, action: item.action, actorType: item.actorType, actorLabel: item.actorLabel, note: item.note, createdAt: iso(item.createdAt) })),
  };
}

async function proofEvents(proofId: string) {
  return platformPrisma.$queryRawUnsafe<Record<string, any>[]>(
    'SELECT id,action,"actorType","actorLabel",note,"createdAt" FROM "StorefrontArtworkProofEvent" WHERE "proofId"=$1 ORDER BY "createdAt" ASC',
    proofId,
  ).catch(() => []);
}

async function readProofById(scope: TenantScope, storeSlug: string, proofId: string, includeFile = false) {
  await ensureTables();
  const fields = includeFile ? `${proofSelect},"fileBytes"` : proofSelect;
  const rows = await platformPrisma.$queryRawUnsafe<ProofRow[]>(
    `SELECT ${fields} FROM "StorefrontArtworkProofRevision" WHERE id=$1 AND "tenantId"=$2 AND "storeSlug"=$3 LIMIT 1`,
    clean(proofId), scope.canonicalTenantId, slug(storeSlug),
  );
  if (!rows[0]) throw new Error('Artwork proof was not found.');
  return rows[0] as ProofRow | ProofFileRow;
}

async function customerForProof(scope: TenantScope, customerEmail: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "StorefrontCustomer" WHERE "tenantId"=$1 AND lower(email)=lower($2) AND "isActive"=true LIMIT 1',
    scope.canonicalTenantId, customerEmail,
  ).catch(() => []);
  return rows[0]?.id || null;
}

async function updateTicketForProof(scope: TenantScope, proof: ProofRow, mode: 'sent' | 'approved' | 'changes-requested' | 'withdrawn', actor: string, note = '') {
  const loaded = await loadTickets(scope);
  const index = loaded.items.findIndex((item) => clean(item.id) === proof.ticketId);
  if (index < 0) throw new Error('Production job ticket was not found.');
  const current = loaded.items[index];
  const paid = paymentReleased(current);
  const now = new Date().toISOString();
  let patch: Record<string, any>;
  if (mode === 'approved') {
    patch = {
      customerProofStatus: 'approved', proofReleased: true, artworkStatus: 'approved',
      status: paid ? 'ready-to-print' : 'artwork-check', stage: paid ? 'ready-to-print' : 'proofing',
      handoffState: paid ? 'ready-for-print' : 'payment-held', releaseGate: paid ? 'ready-to-print' : 'payment-held',
      releaseLabel: paid ? 'Proof and payment released' : 'Proof approved, payment held', canSchedule: paid, canDispatch: false,
      blockedReason: '', blockReason: '', proofApprovedAt: now,
    };
  } else if (mode === 'changes-requested') {
    patch = {
      customerProofStatus: 'changes-requested', proofReleased: false, artworkStatus: 'changes-requested',
      status: 'blocked', stage: 'proofing', handoffState: 'blocked', releaseGate: paid ? 'proof-held' : 'proof-and-payment-held',
      releaseLabel: paid ? 'Payment ready, proof changes requested' : 'Proof changes and payment held', canSchedule: false, canDispatch: false,
      blockedReason: note || 'Customer requested artwork proof changes.', blockReason: note || 'Customer requested artwork proof changes.',
    };
  } else if (mode === 'withdrawn') {
    patch = {
      customerProofStatus: 'pending-review', proofReleased: false, artworkStatus: 'proof-withdrawn',
      status: 'artwork-check', stage: 'proofing', handoffState: 'needs-approval', releaseGate: paid ? 'proof-held' : 'proof-and-payment-held',
      releaseLabel: paid ? 'Payment ready, proof withdrawn' : 'Proof and payment held', canSchedule: false, canDispatch: false,
      blockedReason: 'The current proof was withdrawn by staff.', blockReason: 'The current proof was withdrawn by staff.',
    };
  } else {
    patch = {
      customerProofStatus: 'pending-customer-approval', proofReleased: false, artworkStatus: 'proof-sent',
      status: 'artwork-check', stage: 'proofing', handoffState: 'needs-approval', releaseGate: paid ? 'proof-held' : 'proof-and-payment-held',
      releaseLabel: paid ? 'Payment ready, proof approval held' : 'Proof and payment held', canSchedule: false, canDispatch: false,
      blockedReason: '', blockReason: '', proofSentAt: now,
    };
  }
  const history = Array.isArray(current.stageHistory) ? current.stageHistory : [];
  const action = mode === 'sent' ? 'proof-sent' : mode === 'approved' ? 'proof-approved' : mode === 'changes-requested' ? 'proof-changes-requested' : 'proof-withdrawn';
  const next = {
    ...current,
    ...patch,
    proofRevisionId: proof.id,
    proofRevisionNumber: proof.revisionNumber,
    proofFileName: proof.fileName,
    proofUpdatedAt: now,
    updatedAt: now,
    stageHistory: [...history, { id: `stage-${crypto.randomUUID()}`, from: clean(current.status || current.stage), to: patch.status, action, actor: clean(actor) || 'system', note: clean(note), createdAt: now }].slice(-200),
  };
  const items = [...loaded.items];
  items[index] = next;
  await saveTickets(loaded.ctx, items);
  return next;
}

export async function listAdminArtworkProofs(tenantSlugOrId: string, input: { ticketId?: string; storeSlug?: string }) {
  await ensureTables();
  const { scope, stores, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const loaded = await loadTickets(scope);
  const ticketId = clean(input.ticketId);
  const ticket = ticketId ? loaded.items.find((item) => clean(item.id) === ticketId) || null : null;
  if (ticketId && !ticket) throw new Error('Production job ticket was not found.');
  const rows = ticketId
    ? await platformPrisma.$queryRawUnsafe<ProofRow[]>(`SELECT ${proofSelect} FROM "StorefrontArtworkProofRevision" WHERE "tenantId"=$1 AND "storeSlug"=$2 AND "ticketId"=$3 ORDER BY "revisionNumber" DESC LIMIT $4`, scope.canonicalTenantId, store.storeSlug, ticketId, MAX_REVISIONS)
    : [];
  const items = [];
  for (const row of rows) items.push(publicProof(row, await proofEvents(row.id)));
  return {
    tenant: { id: scope.canonicalTenantId, slug: scope.tenantSlug },
    stores: stores.map((item) => ({ slug: item.storeSlug, name: item.storeName })),
    selectedStore: { slug: store.storeSlug, name: store.storeName },
    ticket,
    items,
  };
}

export async function createArtworkProofRevision(tenantSlugOrId: string, input: {
  storeSlug: string;
  ticketId: string;
  file: File;
  message?: string;
  customerEmail?: string;
  customerName?: string;
  actorId: string;
  actorLabel: string;
}) {
  await ensureTables();
  const { scope, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const loaded = await loadTickets(scope);
  const ticket = loaded.items.find((item) => clean(item.id) === clean(input.ticketId));
  if (!ticket) throw new Error('Production job ticket was not found.');
  if (!(input.file instanceof File) || input.file.size <= 0) throw new Error('Choose a proof file to upload.');
  if (input.file.size > MAX_PROOF_BYTES) throw new Error('Artwork proof files must be 20 MB or smaller.');
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const detected = detectProofType(buffer);
  const customerEmail = email(input.customerEmail || ticket.customerEmail);
  const customerName = clean(input.customerName || ticket.customerName);
  if (!validEmail(customerEmail)) throw new Error('The production job needs a valid customer email before a proof can be sent.');
  const counts = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string; maximum: number | null }>>(
    'SELECT COUNT(*)::bigint AS count, MAX("revisionNumber")::int AS maximum FROM "StorefrontArtworkProofRevision" WHERE "tenantId"=$1 AND "storeSlug"=$2 AND "ticketId"=$3',
    scope.canonicalTenantId, store.storeSlug, clean(input.ticketId),
  );
  if (Number(counts[0]?.count || 0) >= MAX_REVISIONS) throw new Error(`A production job can keep up to ${MAX_REVISIONS} proof revisions.`);
  const revisionNumber = Number(counts[0]?.maximum || 0) + 1;
  const id = `proof-${crypto.randomUUID()}`;
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 86400000);
  const requestedName = safeName(input.file.name || `proof-v${revisionNumber}.${detected.extension}`);
  const fileName = requestedName.toLowerCase().endsWith(`.${detected.extension}`) ? requestedName : `${requestedName}.${detected.extension}`;
  const customerId = await customerForProof(scope, customerEmail);
  const now = new Date();
  await (platformPrisma as any).$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(
      `UPDATE "StorefrontArtworkProofRevision" SET status='superseded',"supersededById"=$1 WHERE "tenantId"=$2 AND "storeSlug"=$3 AND "ticketId"=$4 AND status IN ('sent','viewed')`,
      id, scope.canonicalTenantId, store.storeSlug, clean(input.ticketId),
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO "StorefrontArtworkProofRevision" (id,"tenantId","storeSlug","ticketId","orderId","orderNumber","lineId","productName","customerId","customerEmail","customerName","revisionNumber",status,"fileName","mimeType","sizeBytes","fileBytes",checksum,message,"tokenHash","tokenExpiresAt","createdBy","createdAt","sentAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'sent',$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$22)`,
      id, scope.canonicalTenantId, store.storeSlug, clean(input.ticketId), clean(ticket.orderId) || null, clean(ticket.orderNumber), clean(ticket.lineId) || null, clean(ticket.productName), customerId, customerEmail, customerName, revisionNumber, fileName, detected.mimeType, buffer.byteLength, buffer, checksum(buffer), clean(input.message), tokenHash(rawToken), expiresAt, clean(input.actorId), now,
    );
  });
  const row = await readProofById(scope, store.storeSlug, id) as ProofRow;
  await addEvent(row, event('revision-sent', { type: 'staff', id: input.actorId, label: input.actorLabel }, input.message || '', { revisionNumber, fileName }));
  try {
    await updateTicketForProof(scope, row, 'sent', input.actorLabel || input.actorId, input.message || '');
  } catch (cause) {
    await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontArtworkProofRevision" SET status=\'withdrawn\' WHERE id=$1', id).catch(() => null);
    await addEvent(row, event('revision-withdrawn', { type: 'system', label: 'Proof synchronisation' }, 'Production ticket synchronisation failed.')).catch(() => null);
    throw cause;
  }
  return { proof: publicProof(row, await proofEvents(row.id)), accessToken: rawToken, customerEmail, customerName, storeName: store.storeName, tenantSlug: scope.tenantSlug };
}

export async function resendArtworkProof(tenantSlugOrId: string, input: { storeSlug: string; proofId: string; actorId: string; actorLabel: string }) {
  const { scope, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const row = await readProofById(scope, store.storeSlug, input.proofId) as ProofRow;
  if (!activeStatus(row.status)) throw new Error('Only a proof awaiting a customer decision can be resent.');
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 86400000);
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontArtworkProofRevision" SET "tokenHash"=$1,"tokenExpiresAt"=$2,"sentAt"=NOW() WHERE id=$3', tokenHash(rawToken), expiresAt, row.id);
  await addEvent(row, event('link-resent', { type: 'staff', id: input.actorId, label: input.actorLabel }, 'Customer proof link resent.'));
  return { proof: publicProof({ ...row, tokenExpiresAt: expiresAt, sentAt: new Date() }, await proofEvents(row.id)), accessToken: rawToken, customerEmail: row.customerEmail, customerName: row.customerName, storeName: store.storeName, tenantSlug: scope.tenantSlug };
}

export async function withdrawArtworkProof(tenantSlugOrId: string, input: { storeSlug: string; proofId: string; actorId: string; actorLabel: string; note?: string }) {
  const { scope, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const row = await readProofById(scope, store.storeSlug, input.proofId) as ProofRow;
  if (!activeStatus(row.status)) throw new Error('Only a proof awaiting a customer decision can be withdrawn.');
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontArtworkProofRevision" SET status=\'withdrawn\',"decisionNote"=$1,"decidedAt"=NOW(),"tokenHash"=\'\' WHERE id=$2', clean(input.note), row.id);
  const next = { ...row, status: 'withdrawn' as const, decisionNote: clean(input.note), decidedAt: new Date(), tokenHash: '' };
  await addEvent(next, event('revision-withdrawn', { type: 'staff', id: input.actorId, label: input.actorLabel }, input.note || 'Proof withdrawn.'));
  await updateTicketForProof(scope, next, 'withdrawn', input.actorLabel || input.actorId, input.note || '');
  return publicProof(next, await proofEvents(next.id));
}

async function authoriseCustomerProof(request: Request, input: { tenantSlug: string; storeSlug: string; proofId?: string; token?: string; includeFile?: boolean }) {
  const { scope, store } = await resolveStore(input.tenantSlug, input.storeSlug);
  let row: ProofRow | ProofFileRow | null = null;
  const rawToken = clean(input.token);
  if (rawToken) {
    await ensureTables();
    const fields = input.includeFile ? `${proofSelect},"fileBytes"` : proofSelect;
    const rows = await platformPrisma.$queryRawUnsafe<ProofRow[]>(
      `SELECT ${fields} FROM "StorefrontArtworkProofRevision" WHERE "tenantId"=$1 AND "storeSlug"=$2 AND "tokenHash"=$3 LIMIT 1`,
      scope.canonicalTenantId, store.storeSlug, tokenHash(rawToken),
    );
    row = (rows[0] || null) as ProofRow | ProofFileRow | null;
    if (!row) throw new Error('Artwork proof link is invalid.');
    if (!row.tokenExpiresAt || new Date(row.tokenExpiresAt).getTime() <= Date.now()) throw new Error('Artwork proof link has expired. Ask the store to resend it.');
  } else {
    const customer = await customerFromRequest(request, input.tenantSlug, input.storeSlug);
    if (!customer) throw new Error('Customer sign-in or a valid proof link is required.');
    if (!input.proofId) throw new Error('Choose an artwork proof.');
    row = await readProofById(scope, store.storeSlug, input.proofId, input.includeFile) as ProofRow | ProofFileRow;
    if (!proofOwnedByCustomer(row, customer)) throw new Error('This artwork proof does not belong to the signed-in customer.');
  }
  if (input.proofId && row.id !== clean(input.proofId)) throw new Error('Artwork proof link does not match the requested proof.');
  return { scope, store, row, customer: await customerFromRequest(request, input.tenantSlug, input.storeSlug).catch(() => null) };
}

function proofOwnedByCustomer(row: ProofRow, customer: StorefrontCustomer) {
  return row.tenantId === customer.tenantId && (row.customerId === customer.id || email(row.customerEmail) === email(customer.email));
}

export async function getCustomerArtworkProof(request: Request, input: { tenantSlug: string; storeSlug: string; proofId?: string; token?: string }) {
  const authorised = await authoriseCustomerProof(request, input);
  const row = authorised.row as ProofRow;
  if (activeStatus(row.status) && !row.viewedAt) {
    await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontArtworkProofRevision" SET status=CASE WHEN status=\'sent\' THEN \'viewed\' ELSE status END,"viewedAt"=COALESCE("viewedAt",NOW()) WHERE id=$1', row.id);
    await addEvent(row, event('proof-viewed', { type: authorised.customer ? 'customer-account' : 'secure-link', id: authorised.customer?.id, label: authorised.customer?.name || row.customerName }, 'Proof opened by customer.')).catch(() => null);
    row.status = row.status === 'sent' ? 'viewed' : row.status;
    row.viewedAt = new Date();
  }
  return publicProof(row, await proofEvents(row.id));
}

export async function listCustomerArtworkProofs(request: Request, input: { tenantSlug: string; storeSlug: string }) {
  const { scope, store } = await resolveStore(input.tenantSlug, input.storeSlug);
  const customer = await customerFromRequest(request, input.tenantSlug, input.storeSlug);
  if (!customer) throw new Error('Customer sign-in is required.');
  await ensureTables();
  const rows = await platformPrisma.$queryRawUnsafe<ProofRow[]>(
    `SELECT ${proofSelect} FROM "StorefrontArtworkProofRevision" WHERE "tenantId"=$1 AND "storeSlug"=$2 AND ("customerId"=$3 OR lower("customerEmail")=lower($4)) ORDER BY "createdAt" DESC LIMIT 100`,
    scope.canonicalTenantId, store.storeSlug, customer.id, customer.email,
  );
  const items = [];
  for (const row of rows) items.push(publicProof(row));
  return { customer: { id: customer.id, name: customer.name, email: customer.email }, items };
}

export async function decideArtworkProof(request: Request, input: { tenantSlug: string; storeSlug: string; proofId: string; token?: string; decision: 'approve' | 'request-changes'; note?: string }) {
  const authorised = await authoriseCustomerProof(request, input);
  const row = authorised.row as ProofRow;
  const target: ArtworkProofStatus = input.decision === 'approve' ? 'approved' : 'changes-requested';
  const note = clean(input.note);
  if (target === 'changes-requested' && note.length < 3) throw new Error('Tell the store what needs changing.');
  if (row.status === target) {
    await updateTicketForProof(authorised.scope, row, target, authorised.customer?.name || row.customerName || 'customer', note || row.decisionNote);
    return publicProof(row, await proofEvents(row.id));
  }
  if (!activeStatus(row.status)) throw new Error('This proof revision is no longer awaiting a decision.');
  const now = new Date();
  await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontArtworkProofRevision" SET status=$1,"decisionNote"=$2,"decidedAt"=$3,"tokenHash"=\'\' WHERE id=$4 AND status IN (\'sent\',\'viewed\')', target, note, now, row.id);
  const next = { ...row, status: target, decisionNote: note, decidedAt: now, tokenHash: '' };
  await addEvent(next, event(target === 'approved' ? 'proof-approved' : 'changes-requested', { type: authorised.customer ? 'customer-account' : 'secure-link', id: authorised.customer?.id, label: authorised.customer?.name || row.customerName }, note, { revisionNumber: row.revisionNumber }));
  await updateTicketForProof(authorised.scope, next, target, authorised.customer?.name || row.customerName || 'customer', note);
  return publicProof(next, await proofEvents(next.id));
}

export async function readCustomerArtworkProofFile(request: Request, input: { tenantSlug: string; storeSlug: string; proofId: string; token?: string }) {
  const authorised = await authoriseCustomerProof(request, { ...input, includeFile: true });
  const row = authorised.row as ProofFileRow;
  return { proof: publicProof(row), buffer: Buffer.from(row.fileBytes), mimeType: row.mimeType, fileName: row.fileName, checksum: row.checksum };
}

export async function readAdminArtworkProofFile(tenantSlugOrId: string, input: { storeSlug: string; proofId: string }) {
  const { scope, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const row = await readProofById(scope, store.storeSlug, input.proofId, true) as ProofFileRow;
  return { proof: publicProof(row), buffer: Buffer.from(row.fileBytes), mimeType: row.mimeType, fileName: row.fileName, checksum: row.checksum };
}
