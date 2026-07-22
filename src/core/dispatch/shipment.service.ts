import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { listProductionJobTickets, transitionProductionJobTicket } from '@/core/production/internal-production-jobs';
import { syncPlannerFromWorkflow, updatePlannerJob } from '@/core/storefront/production-planner';
import { tenantContextFromRequest } from '@/core/tenant/context';

const MAX_SHIPMENTS = 500;
const MAX_EVENTS = 100;

export type ShipmentStatus = 'ready' | 'manifested' | 'collection-ready' | 'dispatched' | 'in-transit' | 'exception' | 'delivered' | 'collected' | 'cancelled';

type Scope = { canonicalTenantId: string; tenantSlug: string; tenantIds: string[] };
type Store = { slug: string; name: string };
type Actor = { id: string; label: string };
type ShipmentRow = Record<string, any>;

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function uniq(values: string[]) { return Array.from(new Set(values.map(clean).filter(Boolean))); }
function iso(value: unknown) { if (!value) return ''; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function bool(value: unknown) { return value === true || String(value || '').toLowerCase() === 'true'; }
function int(value: unknown, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? Math.max(0, Math.round(next)) : fallback; }
function paymentReleased(value: Record<string, any>) { const status = clean(value.paymentStatus || value.paymentGate).toLowerCase(); return bool(value.paymentReleased) || ['paid', 'captured', 'authorized', 'manual-paid'].includes(status) || clean(value.paymentGate).toLowerCase() === 'paid'; }
function proofReleased(value: Record<string, any>) { return bool(value.proofReleased) || bool(value.canDispatch) || ['approved', 'preflight-pass'].includes(clean(value.artworkStatus).toLowerCase()) || clean(value.customerProofStatus).toLowerCase() === 'approved' || clean(value.handoffState).toLowerCase() === 'ready-for-print'; }
function safeObject(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function compactObject(value: Record<string, any>) { return Object.fromEntries(Object.entries(value).filter(([, item]) => clean(item))); }
function addressText(value: Record<string, any>) { return [value.recipientName || value.name, value.company, value.line1 || value.address1, value.line2 || value.address2, value.town || value.city, value.county, value.postcode, value.country].map(clean).filter(Boolean).join(', '); }
function validHttps(value: string) { if (!value) return true; try { return new URL(value).protocol === 'https:'; } catch { return false; } }

async function ensureTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontShipment" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "productionJobId" TEXT,
    "plannerJobId" TEXT,
    "orderId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerEmail" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "fulfilmentMode" TEXT NOT NULL DEFAULT 'delivery',
    "carrier" TEXT NOT NULL DEFAULT 'DPD',
    "service" TEXT NOT NULL DEFAULT 'tracked-24',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "trackingUrl" TEXT NOT NULL DEFAULT '',
    "manifestNumber" TEXT NOT NULL DEFAULT '',
    "packageCount" INTEGER NOT NULL DEFAULT 1,
    "weightGrams" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "scanStatus" TEXT NOT NULL DEFAULT 'partial',
    "destinationJson" JSONB,
    "senderJson" JSONB,
    "releaseJson" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "manifestedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notificationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontShipmentEvent" (
    "id" TEXT PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'staff',
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorLabel" TEXT NOT NULL DEFAULT '',
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontShipment_tenant_production_uq" ON "StorefrontShipment"("tenantId","productionJobId") WHERE "productionJobId" IS NOT NULL');
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontShipment_tenant_planner_uq" ON "StorefrontShipment"("tenantId","plannerJobId") WHERE "plannerJobId" IS NOT NULL');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontShipment_scope_status_idx" ON "StorefrontShipment"("tenantId","storeSlug","status","updatedAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontShipment_order_idx" ON "StorefrontShipment"("tenantId","orderNumber","customerEmail")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontShipmentEvent_shipment_idx" ON "StorefrontShipmentEvent"("shipmentId","occurredAt")');
}

async function resolveScope(value: string): Promise<Scope> {
  const requested = clean(value);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', requested,
  );
  const tenant = rows[0];
  if (!tenant) throw new Error('Tenant was not found for dispatch.');
  return { canonicalTenantId: tenant.id, tenantSlug: tenant.slug, tenantIds: uniq([requested, tenant.id, tenant.slug, tenant.defaultSubdomain]) };
}

async function loadStores(scope: Scope): Promise<Store[]> {
  const placeholders = scope.tenantIds.map((_, index) => `$${index + 1}`).join(',');
  if (!placeholders) return [];
  const rows = await platformPrisma.$queryRawUnsafe<Array<Record<string, any>>>(
    `SELECT slug,name,"metadataJson" FROM "CoreCatalogRecord" WHERE resource='storefront-stores' AND "tenantId" IN (${placeholders}) ORDER BY "updatedAt" DESC`, ...scope.tenantIds,
  ).catch(() => []);
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const meta = safeObject(row.metadataJson);
    const storeSlug = slug(meta.storeSlug || meta.slug || meta.storeId || row.slug);
    if (!storeSlug || seen.has(storeSlug)) return [];
    seen.add(storeSlug);
    return [{ slug: storeSlug, name: clean(meta.name || meta.title || row.name || storeSlug) }];
  });
}

async function resolveStore(tenantSlugOrId: string, requestedStoreSlug?: string) {
  const scope = await resolveScope(tenantSlugOrId);
  const stores = await loadStores(scope);
  const requested = slug(requestedStoreSlug);
  const store = requested ? stores.find((item) => item.slug === requested) || null : stores[0] || null;
  if (!store) throw new Error(requested ? 'Storefront store was not found.' : 'Create a storefront before managing dispatch.');
  return { scope, stores, store };
}

function scopedRequest(request: Request, tenantSlug: string) {
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenantSlug);
  return new Request(request.url, { method: 'GET', headers });
}

function candidateFromTicket(ticket: Record<string, any>) {
  const dispatch = safeObject(ticket.dispatch);
  const destination = compactObject({ ...safeObject(ticket.deliveryAddress), recipientName: ticket.deliveryAddress?.recipientName || ticket.customerName, phone: ticket.deliveryAddress?.phone || ticket.customerPhone });
  const fulfilmentMode = clean(ticket.fulfilmentMode || (clean(ticket.selectedDelivery).toLowerCase().includes('collect') ? 'collection' : 'delivery')).toLowerCase();
  return {
    productionJobId: clean(ticket.id), plannerJobId: '', orderId: clean(ticket.orderId), orderNumber: clean(ticket.orderNumber), customerName: clean(ticket.customerName), customerEmail: email(ticket.customerEmail), customerPhone: clean(ticket.customerPhone), productName: clean(ticket.productName), quantity: int(ticket.quantity, 1), fulfilmentMode,
    carrier: clean(dispatch.carrier || (fulfilmentMode === 'collection' ? 'Collection' : 'DPD')), service: clean(dispatch.service || (fulfilmentMode === 'collection' ? 'collection' : 'tracked-24')), trackingNumber: clean(dispatch.trackingNumber), trackingUrl: clean(dispatch.trackingUrl), manifestNumber: clean(dispatch.manifestNumber), packageCount: int(dispatch.packageCount, 1), weightGrams: int(dispatch.weightGrams), scanStatus: clean(dispatch.scanStatus || (ticket.status === 'dispatched' ? 'complete' : 'partial')), destination,
    status: ticket.status === 'dispatched' ? (fulfilmentMode === 'collection' ? 'collected' : 'dispatched') : 'ready', release: { proofReleased: proofReleased(ticket), paymentReleased: paymentReleased(ticket), releaseGate: ticket.releaseGate || '', sourceStatus: ticket.status || '' }, notes: clean(ticket.operatorNotes || ticket.notes), source: ticket,
  };
}

function candidateFromPlanner(job: Record<string, any>) {
  const destination = compactObject({ ...safeObject(job.deliveryAddress), recipientName: job.deliveryAddress?.recipientName || job.customerName || job.customer, phone: job.deliveryAddress?.phone || job.customerPhone });
  const fulfilmentMode = clean(job.fulfilmentMode || (clean(job.selectedDelivery || job.dispatchMethod).toLowerCase().includes('collect') ? 'collection' : 'delivery')).toLowerCase();
  return {
    productionJobId: clean(job.productionJobId || job.id), plannerJobId: clean(job.id), orderId: clean(job.orderId), orderNumber: clean(job.orderNumber), customerName: clean(job.customerName || job.customer), customerEmail: email(job.customerEmail), customerPhone: clean(job.customerPhone), productName: clean(job.productName || job.product || job.productSlug), quantity: int(job.quantity, 1), fulfilmentMode,
    carrier: clean(job.carrier || (fulfilmentMode === 'collection' ? 'Collection' : 'DPD')), service: clean(job.service || (fulfilmentMode === 'collection' ? 'collection' : 'tracked-24')), trackingNumber: clean(job.trackingNumber), trackingUrl: clean(job.trackingUrl), manifestNumber: clean(job.manifestNumber), packageCount: int(job.packageCount, 1), weightGrams: int(job.weightGrams), scanStatus: clean(job.scanStatus || (job.stage === 'completed' ? 'complete' : 'partial')), destination,
    status: job.stage === 'completed' ? (fulfilmentMode === 'collection' ? 'collected' : 'dispatched') : 'ready', release: { proofReleased: proofReleased(job), paymentReleased: paymentReleased(job), releaseGate: job.releaseGate || job.handoffState || '', sourceStatus: job.stage || '' }, notes: clean(job.productionNotes || job.notes || job.blockReason), source: job,
  };
}

async function releasedCandidates(request: Request, tenantSlug: string) {
  const scoped = scopedRequest(request, tenantSlug);
  const [tickets, planner] = await Promise.all([listProductionJobTickets(scoped).catch(() => []), syncPlannerFromWorkflow(scoped).catch(() => ({ jobs: [] }))]);
  const ticketCandidates = tickets.filter((ticket: any) => ['packing', 'dispatched'].includes(clean(ticket.status).toLowerCase()) && paymentReleased(ticket) && proofReleased(ticket)).map(candidateFromTicket);
  const plannerJobs = Array.isArray((planner as any).jobs) ? (planner as any).jobs : [];
  const held = plannerJobs.filter((job: any) => job.stage === 'blocked' || job.productionBlocked || job.handoffState === 'blocked');
  const plannerCandidates = plannerJobs.filter((job: any) => ['dispatch', 'completed'].includes(clean(job.stage).toLowerCase()) && !(job.productionBlocked || job.handoffState === 'blocked') && paymentReleased(job)).map(candidateFromPlanner);
  const map = new Map<string, any>();
  for (const item of [...plannerCandidates, ...ticketCandidates]) {
    const key = clean(item.orderNumber || item.productionJobId || item.plannerJobId);
    const current = map.get(key);
    map.set(key, current ? { ...current, ...item, plannerJobId: current.plannerJobId || item.plannerJobId, productionJobId: item.productionJobId || current.productionJobId, destination: Object.keys(item.destination || {}).length ? item.destination : current.destination } : item);
  }
  return { items: Array.from(map.values()), heldByPaymentGate: held.filter((job: any) => clean(job.blockReason).toLowerCase().includes('payment')).length, heldByArtworkGate: held.filter((job: any) => !clean(job.blockReason).toLowerCase().includes('payment')).length };
}

async function addEvent(row: Pick<ShipmentRow, 'id' | 'tenantId'>, input: { status: string; label: string; note?: string; source?: string; actor?: Actor; metadata?: Record<string, unknown> }) {
  await platformPrisma.$executeRawUnsafe(
    'INSERT INTO "StorefrontShipmentEvent" (id,"shipmentId","tenantId",status,label,note,source,"actorId","actorLabel","metadataJson","occurredAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())',
    `shipment-event-${crypto.randomUUID()}`, row.id, row.tenantId, input.status, input.label, clean(input.note), input.source || 'staff', clean(input.actor?.id), clean(input.actor?.label), JSON.stringify(input.metadata || {}),
  );
}

async function shipmentEvents(shipmentId: string) {
  return platformPrisma.$queryRawUnsafe<Array<Record<string, any>>>(
    'SELECT id,status,label,note,source,"actorLabel","metadataJson","occurredAt" FROM "StorefrontShipmentEvent" WHERE "shipmentId"=$1 ORDER BY "occurredAt" ASC LIMIT $2', shipmentId, MAX_EVENTS,
  ).catch(() => []);
}

function rowToShipment(row: ShipmentRow, events: Array<Record<string, any>> = []) {
  return {
    id: row.id, storeSlug: row.storeSlug, productionJobId: row.productionJobId || '', plannerJobId: row.plannerJobId || '', orderId: row.orderId || '', orderNumber: row.orderNumber, customerName: row.customerName, customerEmail: row.customerEmail, customerPhone: row.customerPhone, productName: row.productName, quantity: Number(row.quantity || 1), fulfilmentMode: row.fulfilmentMode,
    carrier: row.carrier, service: row.service, trackingNumber: row.trackingNumber, trackingUrl: row.trackingUrl, manifestNumber: row.manifestNumber, packageCount: Number(row.packageCount || 1), weightGrams: Number(row.weightGrams || 0), status: row.status as ShipmentStatus, scanStatus: row.scanStatus, destination: safeObject(row.destinationJson), destinationLabel: addressText(safeObject(row.destinationJson)), sender: safeObject(row.senderJson), release: safeObject(row.releaseJson), notes: row.notes,
    manifestedAt: iso(row.manifestedAt), dispatchedAt: iso(row.dispatchedAt), deliveredAt: iso(row.deliveredAt), notificationSentAt: iso(row.notificationSentAt), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
    events: events.map((item) => ({ id: item.id, status: item.status, label: item.label, note: item.note, source: item.source, actorLabel: item.actorLabel, occurredAt: iso(item.occurredAt), metadata: safeObject(item.metadataJson) })),
  };
}

async function syncReleasedShipments(request: Request, scope: Scope, store: Store) {
  await ensureTables();
  const feed = await releasedCandidates(request, scope.tenantSlug);
  for (const item of feed.items) {
    const existing = await platformPrisma.$queryRawUnsafe<Array<{ id: string; destinationJson: any; trackingNumber: string; trackingUrl: string; manifestNumber: string; carrier: string; service: string; status: string }>>(
      'SELECT id,"destinationJson","trackingNumber","trackingUrl","manifestNumber",carrier,service,status FROM "StorefrontShipment" WHERE "tenantId"=$1 AND (("productionJobId" IS NOT NULL AND "productionJobId"=$2) OR ("plannerJobId" IS NOT NULL AND "plannerJobId"=$3) OR ("orderNumber"=$4 AND status<>\'cancelled\')) LIMIT 1',
      scope.canonicalTenantId, item.productionJobId || null, item.plannerJobId || null, item.orderNumber,
    );
    if (existing[0]) {
      await platformPrisma.$executeRawUnsafe(
        'UPDATE "StorefrontShipment" SET "productionJobId"=COALESCE("productionJobId",$1),"plannerJobId"=COALESCE("plannerJobId",$2),"orderId"=COALESCE("orderId",NULLIF($3,\'\')),"customerName"=$4,"customerEmail"=$5,"customerPhone"=$6,"productName"=$7,quantity=$8,"fulfilmentMode"=$9,"destinationJson"=CASE WHEN "destinationJson" IS NULL OR "destinationJson"=\'{}\'::jsonb THEN $10::jsonb ELSE "destinationJson" END,"releaseJson"=$11::jsonb,"updatedAt"=NOW() WHERE id=$12',
        item.productionJobId || null, item.plannerJobId || null, item.orderId, item.customerName, item.customerEmail, item.customerPhone, item.productName, item.quantity, item.fulfilmentMode, JSON.stringify(item.destination || {}), JSON.stringify(item.release || {}), existing[0].id,
      );
      continue;
    }
    const id = `shipment-${crypto.randomUUID()}`;
    await platformPrisma.$executeRawUnsafe(
      `INSERT INTO "StorefrontShipment" (id,"tenantId","storeSlug","productionJobId","plannerJobId","orderId","orderNumber","customerName","customerEmail","customerPhone","productName",quantity,"fulfilmentMode",carrier,service,"trackingNumber","trackingUrl","manifestNumber","packageCount","weightGrams",status,"scanStatus","destinationJson","releaseJson",notes,"createdBy","updatedBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24::jsonb,$25,'system','system')`,
      id, scope.canonicalTenantId, store.slug, item.productionJobId || null, item.plannerJobId || null, item.orderId || null, item.orderNumber, item.customerName, item.customerEmail, item.customerPhone, item.productName, item.quantity, item.fulfilmentMode, item.carrier, item.service, item.trackingNumber, item.trackingUrl, item.manifestNumber, item.packageCount, item.weightGrams, item.status, item.scanStatus, JSON.stringify(item.destination || {}), JSON.stringify(item.release || {}), item.notes,
    );
    await addEvent({ id, tenantId: scope.canonicalTenantId }, { status: item.status, label: item.status === 'dispatched' ? 'Shipment imported as dispatched' : 'Shipment ready for dispatch', source: 'production', actor: { label: 'Production workflow' }, metadata: { productionJobId: item.productionJobId, plannerJobId: item.plannerJobId } });
  }
  return feed;
}

export async function listAdminShipments(request: Request, tenantSlugOrId: string, storeSlug?: string) {
  const { scope, stores, store } = await resolveStore(tenantSlugOrId, storeSlug);
  const feed = await syncReleasedShipments(request, scope, store);
  const rows = await platformPrisma.$queryRawUnsafe<ShipmentRow[]>(
    'SELECT * FROM "StorefrontShipment" WHERE "tenantId"=$1 AND "storeSlug"=$2 ORDER BY CASE status WHEN \'exception\' THEN 0 WHEN \'ready\' THEN 1 WHEN \'manifested\' THEN 2 WHEN \'collection-ready\' THEN 3 WHEN \'dispatched\' THEN 4 WHEN \'in-transit\' THEN 5 ELSE 6 END,"updatedAt" DESC LIMIT $3',
    scope.canonicalTenantId, store.slug, MAX_SHIPMENTS,
  );
  const items = [];
  for (const row of rows) items.push(rowToShipment(row, await shipmentEvents(row.id)));
  return { tenant: { id: scope.canonicalTenantId, slug: scope.tenantSlug }, stores, selectedStore: store, items, heldByArtworkGate: feed.heldByArtworkGate, heldByPaymentGate: feed.heldByPaymentGate };
}

async function readShipment(scope: Scope, storeSlug: string, shipmentId: string) {
  await ensureTables();
  const rows = await platformPrisma.$queryRawUnsafe<ShipmentRow[]>('SELECT * FROM "StorefrontShipment" WHERE id=$1 AND "tenantId"=$2 AND "storeSlug"=$3 LIMIT 1', clean(shipmentId), scope.canonicalTenantId, slug(storeSlug));
  if (!rows[0]) throw new Error('Shipment was not found.');
  return rows[0];
}

export async function readAdminShipment(tenantSlugOrId: string, storeSlug: string, shipmentId: string) {
  const { scope } = await resolveStore(tenantSlugOrId, storeSlug);
  const row = await readShipment(scope, storeSlug, shipmentId);
  return rowToShipment(row, await shipmentEvents(row.id));
}

const CARRIERS = ['DPD', 'DHL', 'Royal Mail', 'UPS', 'Other', 'Collection'];
const SERVICES = ['next-day', 'tracked-24', 'tracked-48', 'economy', 'same-day', 'collection', 'other'];
const SCANS = ['complete', 'partial', 'missing'];

export async function saveShipmentDetails(tenantSlugOrId: string, input: Record<string, any>, actor: Actor) {
  const { scope, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const row = await readShipment(scope, store.slug, input.shipmentId);
  const carrier = CARRIERS.includes(clean(input.carrier)) ? clean(input.carrier) : row.carrier;
  const service = SERVICES.includes(clean(input.service)) ? clean(input.service) : row.service;
  const scanStatus = SCANS.includes(clean(input.scanStatus)) ? clean(input.scanStatus) : row.scanStatus;
  const trackingUrl = clean(input.trackingUrl);
  if (!validHttps(trackingUrl)) throw new Error('Tracking URL must use HTTPS.');
  const destination = compactObject({ ...safeObject(row.destinationJson), ...safeObject(input.destination) });
  const sender = compactObject({ ...safeObject(row.senderJson), ...safeObject(input.sender) });
  await platformPrisma.$executeRawUnsafe(
    'UPDATE "StorefrontShipment" SET carrier=$1,service=$2,"trackingNumber"=$3,"trackingUrl"=$4,"manifestNumber"=$5,"packageCount"=$6,"weightGrams"=$7,"scanStatus"=$8,"destinationJson"=$9::jsonb,"senderJson"=$10::jsonb,notes=$11,"updatedBy"=$12,"updatedAt"=NOW() WHERE id=$13',
    carrier, service, clean(input.trackingNumber), trackingUrl, clean(input.manifestNumber), Math.max(1, int(input.packageCount, 1)), int(input.weightGrams), scanStatus, JSON.stringify(destination), JSON.stringify(sender), clean(input.notes), actor.id, row.id,
  );
  await addEvent(row, { status: row.status, label: 'Shipment details updated', note: clean(input.note), actor, metadata: { carrier, service, scanStatus } });
  return readAdminShipment(tenantSlugOrId, store.slug, row.id);
}

async function currentReleaseCandidate(request: Request, scope: Scope, row: ShipmentRow) {
  const feed = await releasedCandidates(request, scope.tenantSlug);
  return feed.items.find((item) => clean(item.productionJobId) === clean(row.productionJobId) || clean(item.plannerJobId) === clean(row.plannerJobId) || clean(item.orderNumber) === clean(row.orderNumber)) || null;
}

async function markSourceDispatched(request: Request, scope: Scope, row: ShipmentRow, note: string, actor: Actor) {
  const scoped = scopedRequest(request, scope.tenantSlug);
  if (row.plannerJobId) {
    await updatePlannerJob(scoped, { jobId: row.plannerJobId, action: 'complete', note: note || `Dispatched by ${actor.label || actor.id}.` });
    return;
  }
  if (row.productionJobId) {
    await transitionProductionJobTicket(row.productionJobId, 'mark-dispatched', { actor: actor.label || actor.id, note, dispatch: { carrier: row.carrier, service: row.service, trackingNumber: row.trackingNumber, trackingUrl: row.trackingUrl, manifestNumber: row.manifestNumber, packageCount: row.packageCount, weightGrams: row.weightGrams, scanStatus: row.scanStatus, dispatchedAt: new Date().toISOString(), dispatchedBy: actor.label || actor.id } }, scoped);
    return;
  }
  throw new Error('Shipment is not linked to a production job.');
}

export async function runShipmentAction(request: Request, tenantSlugOrId: string, input: Record<string, any>, actor: Actor) {
  const { scope, store } = await resolveStore(tenantSlugOrId, input.storeSlug);
  const row = await readShipment(scope, store.slug, input.shipmentId);
  const action = clean(input.action).toLowerCase();
  const note = clean(input.note);
  let status: ShipmentStatus = row.status;
  let label = '';
  let timestamps = { manifestedAt: row.manifestedAt, dispatchedAt: row.dispatchedAt, deliveredAt: row.deliveredAt };

  if (action === 'manifest') {
    if (!addressText(safeObject(row.destinationJson)) && clean(row.fulfilmentMode) !== 'collection') throw new Error('Add a delivery address before manifesting.');
    status = 'manifested'; label = 'Shipment manifested'; timestamps.manifestedAt = new Date();
  } else if (action === 'collection-ready') {
    if (clean(row.fulfilmentMode) !== 'collection') throw new Error('Only collection orders can be marked ready for collection.');
    status = 'collection-ready'; label = 'Order ready for collection';
  } else if (action === 'dispatch' || action === 'collected') {
    const collection = clean(row.fulfilmentMode) === 'collection';
    if (action === 'collected' && !collection) throw new Error('Only collection orders can be marked collected.');
    if (action === 'dispatch' && collection) throw new Error('Use the collected action for collection orders.');
    if (clean(row.scanStatus) !== 'complete') throw new Error('Complete package scans before handover.');
    if (!collection && !clean(row.trackingNumber)) throw new Error('Add a tracking number before dispatch.');
    const released = await currentReleaseCandidate(request, scope, row);
    if (!released || !released.release?.paymentReleased || !released.release?.proofReleased) throw new Error('Proof approval and captured payment are required before dispatch.');
    await markSourceDispatched(request, scope, row, note, actor);
    status = collection ? 'collected' : 'dispatched'; label = collection ? 'Order collected' : 'Shipment handed to carrier'; timestamps.dispatchedAt = new Date(); if (collection) timestamps.deliveredAt = new Date();
  } else if (action === 'in-transit') {
    if (!['dispatched', 'exception', 'in-transit'].includes(clean(row.status))) throw new Error('Only dispatched shipments can move in transit.');
    status = 'in-transit'; label = 'Shipment in transit';
  } else if (action === 'exception') {
    if (['delivered', 'collected', 'cancelled'].includes(clean(row.status))) throw new Error('Completed shipments cannot be moved to exception.');
    if (note.length < 3) throw new Error('Describe the dispatch exception.');
    status = 'exception'; label = 'Dispatch exception recorded';
  } else if (action === 'delivered') {
    if (!['dispatched', 'in-transit', 'exception'].includes(clean(row.status))) throw new Error('Only handed-over shipments can be marked delivered.');
    status = 'delivered'; label = 'Shipment delivered'; timestamps.deliveredAt = new Date();
  } else if (action === 'cancel') {
    if (['dispatched', 'in-transit', 'delivered', 'collected'].includes(clean(row.status))) throw new Error('A handed-over shipment cannot be cancelled here.');
    status = 'cancelled'; label = 'Shipment cancelled';
  } else {
    throw new Error('Unsupported shipment action.');
  }

  await platformPrisma.$executeRawUnsafe(
    'UPDATE "StorefrontShipment" SET status=$1,"manifestedAt"=$2,"dispatchedAt"=$3,"deliveredAt"=$4,"updatedBy"=$5,"updatedAt"=NOW() WHERE id=$6',
    status, timestamps.manifestedAt || null, timestamps.dispatchedAt || null, timestamps.deliveredAt || null, actor.id, row.id,
  );
  await addEvent(row, { status, label, note, actor, metadata: safeObject(input.metadata) });
  return readAdminShipment(tenantSlugOrId, store.slug, row.id);
}

export async function recordShipmentNotification(tenantSlugOrId: string, storeSlug: string, shipmentId: string, actor: Actor, outcome: { sent: boolean; message?: string }) {
  const { scope } = await resolveStore(tenantSlugOrId, storeSlug);
  const row = await readShipment(scope, storeSlug, shipmentId);
  if (outcome.sent) await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontShipment" SET "notificationSentAt"=NOW(),"updatedAt"=NOW() WHERE id=$1', row.id);
  await addEvent(row, { status: row.status, label: outcome.sent ? 'Customer dispatch notification sent' : 'Customer notification could not be sent', note: outcome.message || '', source: 'notification', actor });
}

export async function customerShipmentForOrder(request: Request, orderId: string, customerEmail: string) {
  await ensureTables();
  const context = tenantContextFromRequest(request);
  const scope = await resolveScope(clean(context.tenantId));
  const rows = await platformPrisma.$queryRawUnsafe<ShipmentRow[]>(
    'SELECT * FROM "StorefrontShipment" WHERE "tenantId"=$1 AND ("orderId"=$2 OR "orderNumber"=$2) AND lower("customerEmail")=lower($3) ORDER BY "updatedAt" DESC LIMIT 1', scope.canonicalTenantId, clean(orderId), email(customerEmail),
  );
  if (!rows[0]) return null;
  const shipment = rowToShipment(rows[0], await shipmentEvents(rows[0].id));
  const destination = safeObject(shipment.destination);
  return {
    id: shipment.id, orderNumber: shipment.orderNumber, status: shipment.status, fulfilmentMode: shipment.fulfilmentMode, carrier: shipment.carrier, service: shipment.service, trackingNumber: shipment.trackingNumber, trackingUrl: shipment.trackingUrl, manifestNumber: shipment.manifestNumber, packageCount: shipment.packageCount, scanStatus: shipment.scanStatus,
    destination: { town: clean(destination.town || destination.city), postcode: clean(destination.postcode), country: clean(destination.country) }, manifestedAt: shipment.manifestedAt, dispatchedAt: shipment.dispatchedAt, deliveredAt: shipment.deliveredAt, updatedAt: shipment.updatedAt,
    events: shipment.events.map((item: any) => ({ id: item.id, status: item.status, label: item.label, note: item.note, occurredAt: item.occurredAt })),
  };
}
