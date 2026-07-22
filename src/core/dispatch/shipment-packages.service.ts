import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readAdminShipment } from '@/core/dispatch/shipment.service';

const MAX_PACKAGES = 20;
const MAX_CONTENT_LINES = 20;
const MAX_PACKAGE_WEIGHT_GRAMS = 100_000;
const MAX_DIMENSION_MM = 3_000;

type Actor = { id: string; label: string };
type PackageRow = Record<string, any>;
type ShipmentSummary = Record<string, any> & { id: string; storeSlug: string; status: string; orderNumber: string };

function clean(value: unknown) { return String(value || '').trim(); }
function integer(value: unknown, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? Math.max(0, Math.round(next)) : fallback; }
function iso(value: unknown) { if (!value) return ''; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function safeArray(value: unknown) { return Array.isArray(value) ? value : []; }
function barcode() { return `BX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`; }
function packageLabel(number: number, total: number) { return `Box ${number} of ${total}`; }

async function ensureTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StorefrontShipmentPackage" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "packageNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "contentsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "weightGrams" INTEGER NOT NULL DEFAULT 0,
    "lengthMm" INTEGER NOT NULL DEFAULT 0,
    "widthMm" INTEGER NOT NULL DEFAULT 0,
    "heightMm" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "verifiedBy" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontShipmentPackage_number_uq" ON "StorefrontShipmentPackage"("shipmentId","packageNumber")');
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontShipmentPackage_barcode_uq" ON "StorefrontShipmentPackage"("tenantId","barcode")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StorefrontShipmentPackage_scope_idx" ON "StorefrontShipmentPackage"("tenantId","storeSlug","shipmentId","packageNumber")');
}

async function canonicalTenantId(value: string) {
  const requested = clean(value);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', requested,
  );
  if (!rows[0]) throw new Error('Tenant was not found for packing.');
  return rows[0].id;
}

function editableShipment(shipment: ShipmentSummary) {
  if (!['ready', 'manifested', 'collection-ready'].includes(clean(shipment.status).toLowerCase())) {
    throw new Error('Boxes can only be changed before carrier handover or collection.');
  }
}

function contentsFromInput(input: Record<string, any>) {
  const values = Array.isArray(input.contents)
    ? input.contents
    : clean(input.contentsText).split(/\r?\n/);
  return values.map(clean).filter(Boolean).slice(0, MAX_CONTENT_LINES).map((value) => value.slice(0, 180));
}

function rowToPackage(row: PackageRow) {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    packageNumber: Number(row.packageNumber || 1),
    label: clean(row.label),
    contents: safeArray(row.contentsJson).map(clean).filter(Boolean),
    weightGrams: Number(row.weightGrams || 0),
    lengthMm: Number(row.lengthMm || 0),
    widthMm: Number(row.widthMm || 0),
    heightMm: Number(row.heightMm || 0),
    barcode: clean(row.barcode),
    scanStatus: clean(row.scanStatus || 'pending'),
    trackingNumber: clean(row.trackingNumber),
    notes: clean(row.notes),
    verifiedBy: clean(row.verifiedBy),
    verifiedAt: iso(row.verifiedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

async function appendEvent(shipment: ShipmentSummary, tenantId: string, input: { label: string; note?: string; actor: Actor; metadata?: Record<string, unknown> }) {
  await platformPrisma.$executeRawUnsafe(
    'INSERT INTO "StorefrontShipmentEvent" (id,"shipmentId","tenantId",status,label,note,source,"actorId","actorLabel","metadataJson","occurredAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())',
    `shipment-event-${crypto.randomUUID()}`, shipment.id, tenantId, clean(shipment.status), clean(input.label), clean(input.note), 'packing', clean(input.actor.id), clean(input.actor.label), JSON.stringify(input.metadata || {}),
  );
}

async function rowsForShipment(tenantId: string, storeSlug: string, shipmentId: string) {
  await ensureTables();
  return platformPrisma.$queryRawUnsafe<PackageRow[]>(
    'SELECT * FROM "StorefrontShipmentPackage" WHERE "tenantId"=$1 AND "storeSlug"=$2 AND "shipmentId"=$3 ORDER BY "packageNumber" ASC',
    tenantId, clean(storeSlug), clean(shipmentId),
  );
}

async function insertPackage(tenantId: string, storeSlug: string, shipmentId: string, packageNumber: number, label: string, contents: string[] = [], weightGrams = 0) {
  const id = `shipment-package-${crypto.randomUUID()}`;
  await platformPrisma.$executeRawUnsafe(
    'INSERT INTO "StorefrontShipmentPackage" (id,"tenantId","storeSlug","shipmentId","packageNumber",label,"contentsJson","weightGrams",barcode,"scanStatus") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,\'pending\')',
    id, tenantId, clean(storeSlug), clean(shipmentId), packageNumber, clean(label), JSON.stringify(contents), integer(weightGrams), barcode(),
  );
  return id;
}

async function ensureInitialPackages(tenantId: string, shipment: ShipmentSummary) {
  const existing = await rowsForShipment(tenantId, shipment.storeSlug, shipment.id);
  if (existing.length) return existing;
  const total = Math.min(MAX_PACKAGES, Math.max(1, integer(shipment.packageCount, 1)));
  for (let number = 1; number <= total; number += 1) {
    const contents = total === 1 && clean(shipment.productName)
      ? [`${clean(shipment.productName)} · Qty ${Math.max(1, integer(shipment.quantity, 1))}`]
      : [];
    await insertPackage(tenantId, shipment.storeSlug, shipment.id, number, packageLabel(number, total), contents, total === 1 ? integer(shipment.weightGrams) : 0);
  }
  return rowsForShipment(tenantId, shipment.storeSlug, shipment.id);
}

async function syncShipmentPacking(tenantId: string, shipment: ShipmentSummary) {
  const rows = await rowsForShipment(tenantId, shipment.storeSlug, shipment.id);
  const total = rows.length;
  const verified = rows.filter((row) => clean(row.scanStatus) === 'verified').length;
  const totalWeight = rows.reduce((sum, row) => sum + integer(row.weightGrams), 0);
  const scanStatus = total > 0 && verified === total ? 'complete' : verified > 0 ? 'partial' : 'missing';
  await platformPrisma.$executeRawUnsafe(
    'UPDATE "StorefrontShipment" SET "packageCount"=$1,"weightGrams"=$2,"scanStatus"=$3,"updatedAt"=NOW() WHERE id=$4 AND "tenantId"=$5',
    Math.max(1, total), totalWeight, scanStatus, shipment.id, tenantId,
  );
  return { totalPackages: total, verifiedPackages: verified, totalWeightGrams: totalWeight, scanStatus };
}

async function packageSnapshot(tenantSlugOrId: string, storeSlug: string, shipmentId: string) {
  const shipment = await readAdminShipment(tenantSlugOrId, storeSlug, shipmentId) as ShipmentSummary;
  const tenantId = await canonicalTenantId(tenantSlugOrId);
  const rows = await ensureInitialPackages(tenantId, shipment);
  const summary = await syncShipmentPacking(tenantId, shipment);
  return { tenantId, shipment: { ...shipment, packageCount: summary.totalPackages, weightGrams: summary.totalWeightGrams, scanStatus: summary.scanStatus }, items: rows.map(rowToPackage), summary };
}

export async function listShipmentPackages(tenantSlugOrId: string, storeSlug: string, shipmentId: string) {
  return packageSnapshot(tenantSlugOrId, storeSlug, shipmentId);
}

export async function readShipmentPackage(tenantSlugOrId: string, storeSlug: string, shipmentId: string, packageId: string) {
  const snapshot = await packageSnapshot(tenantSlugOrId, storeSlug, shipmentId);
  const item = snapshot.items.find((box) => box.id === clean(packageId));
  if (!item) throw new Error('Box was not found.');
  return { ...snapshot, item };
}

async function renumberPackages(tenantId: string, shipment: ShipmentSummary) {
  const rows = await rowsForShipment(tenantId, shipment.storeSlug, shipment.id);
  for (let index = 0; index < rows.length; index += 1) {
    await platformPrisma.$executeRawUnsafe('UPDATE "StorefrontShipmentPackage" SET "packageNumber"=$1 WHERE id=$2', index + 101, rows[index].id);
  }
  for (let index = 0; index < rows.length; index += 1) {
    await platformPrisma.$executeRawUnsafe(
      'UPDATE "StorefrontShipmentPackage" SET "packageNumber"=$1,label=$2,"updatedAt"=NOW() WHERE id=$3',
      index + 1, packageLabel(index + 1, rows.length), rows[index].id,
    );
  }
}

export async function runShipmentPackageAction(tenantSlugOrId: string, storeSlug: string, shipmentId: string, input: Record<string, any>, actor: Actor) {
  const snapshot = await packageSnapshot(tenantSlugOrId, storeSlug, shipmentId);
  const { shipment, tenantId } = snapshot;
  editableShipment(shipment);
  const action = clean(input.action).toLowerCase();

  if (action === 'add') {
    if (snapshot.items.length >= MAX_PACKAGES) throw new Error(`A shipment can contain up to ${MAX_PACKAGES} boxes.`);
    const number = snapshot.items.length + 1;
    const id = await insertPackage(tenantId, shipment.storeSlug, shipment.id, number, packageLabel(number, number));
    await renumberPackages(tenantId, shipment);
    await appendEvent(shipment, tenantId, { label: `Box ${number} added`, actor, metadata: { packageId: id, packageNumber: number } });
  } else {
    const packageId = clean(input.packageId);
    const current = snapshot.items.find((item) => item.id === packageId);
    if (!current) throw new Error('Box was not found.');

    if (action === 'save') {
      const contents = contentsFromInput(input);
      const weightGrams = Math.min(MAX_PACKAGE_WEIGHT_GRAMS, integer(input.weightGrams));
      const lengthMm = Math.min(MAX_DIMENSION_MM, integer(input.lengthMm));
      const widthMm = Math.min(MAX_DIMENSION_MM, integer(input.widthMm));
      const heightMm = Math.min(MAX_DIMENSION_MM, integer(input.heightMm));
      const label = clean(input.label).slice(0, 100) || packageLabel(current.packageNumber, snapshot.items.length);
      const trackingNumber = clean(input.trackingNumber).slice(0, 120);
      const notes = clean(input.notes).slice(0, 1_000);
      const changed = label !== current.label || JSON.stringify(contents) !== JSON.stringify(current.contents) || weightGrams !== current.weightGrams || lengthMm !== current.lengthMm || widthMm !== current.widthMm || heightMm !== current.heightMm || trackingNumber !== current.trackingNumber || notes !== current.notes;
      await platformPrisma.$executeRawUnsafe(
        'UPDATE "StorefrontShipmentPackage" SET label=$1,"contentsJson"=$2::jsonb,"weightGrams"=$3,"lengthMm"=$4,"widthMm"=$5,"heightMm"=$6,"trackingNumber"=$7,notes=$8,"scanStatus"=$9,"verifiedBy"=$10,"verifiedAt"=$11,"updatedAt"=NOW() WHERE id=$12 AND "tenantId"=$13 AND "shipmentId"=$14',
        label, JSON.stringify(contents), weightGrams, lengthMm, widthMm, heightMm, trackingNumber, notes, changed ? 'pending' : current.scanStatus, changed ? '' : current.verifiedBy, changed ? null : current.verifiedAt || null, current.id, tenantId, shipment.id,
      );
      await appendEvent(shipment, tenantId, { label: `Box ${current.packageNumber} packing details updated`, note: changed && current.scanStatus === 'verified' ? 'Verification was reset because packing details changed.' : '', actor, metadata: { packageId: current.id, packageNumber: current.packageNumber } });
    } else if (action === 'verify') {
      if (!current.contents.length) throw new Error('Add box contents before verification.');
      if (current.weightGrams <= 0) throw new Error('Add the packed box weight before verification.');
      if (clean(input.barcode).toUpperCase() !== current.barcode.toUpperCase()) throw new Error('Scanned box code does not match.');
      await platformPrisma.$executeRawUnsafe(
        'UPDATE "StorefrontShipmentPackage" SET "scanStatus"=\'verified\',"verifiedBy"=$1,"verifiedAt"=NOW(),"updatedAt"=NOW() WHERE id=$2 AND "tenantId"=$3 AND "shipmentId"=$4',
        clean(actor.label || actor.id), current.id, tenantId, shipment.id,
      );
      await appendEvent(shipment, tenantId, { label: `Box ${current.packageNumber} verified`, actor, metadata: { packageId: current.id, packageNumber: current.packageNumber, barcode: current.barcode } });
    } else if (action === 'unverify') {
      await platformPrisma.$executeRawUnsafe(
        'UPDATE "StorefrontShipmentPackage" SET "scanStatus"=\'pending\',"verifiedBy"=\'\',"verifiedAt"=NULL,"updatedAt"=NOW() WHERE id=$1 AND "tenantId"=$2 AND "shipmentId"=$3',
        current.id, tenantId, shipment.id,
      );
      await appendEvent(shipment, tenantId, { label: `Box ${current.packageNumber} verification reopened`, actor, metadata: { packageId: current.id, packageNumber: current.packageNumber } });
    } else if (action === 'delete') {
      if (snapshot.items.length <= 1) throw new Error('A shipment must keep at least one box.');
      await platformPrisma.$executeRawUnsafe('DELETE FROM "StorefrontShipmentPackage" WHERE id=$1 AND "tenantId"=$2 AND "shipmentId"=$3', current.id, tenantId, shipment.id);
      await renumberPackages(tenantId, shipment);
      await appendEvent(shipment, tenantId, { label: `Box ${current.packageNumber} removed`, actor, metadata: { packageId: current.id, packageNumber: current.packageNumber } });
    } else {
      throw new Error('Unsupported box action.');
    }
  }

  return packageSnapshot(tenantSlugOrId, shipment.storeSlug, shipment.id);
}

export async function customerPackageSummaryForShipment(request: Request, shipmentId: string) {
  await ensureTables();
  const context = tenantContextFromRequest(request);
  const tenantId = await canonicalTenantId(clean(context.tenantId));
  const rows = await platformPrisma.$queryRawUnsafe<PackageRow[]>(
    'SELECT id,"packageNumber",label,"weightGrams","lengthMm","widthMm","heightMm","scanStatus","trackingNumber","verifiedAt" FROM "StorefrontShipmentPackage" WHERE "tenantId"=$1 AND "shipmentId"=$2 ORDER BY "packageNumber" ASC',
    tenantId, clean(shipmentId),
  ).catch(() => []);
  const items = rows.map((row) => ({
    id: row.id,
    packageNumber: Number(row.packageNumber || 1),
    label: clean(row.label),
    weightGrams: Number(row.weightGrams || 0),
    dimensionsMm: { length: Number(row.lengthMm || 0), width: Number(row.widthMm || 0), height: Number(row.heightMm || 0) },
    scanStatus: clean(row.scanStatus),
    trackingNumber: clean(row.trackingNumber),
    verifiedAt: iso(row.verifiedAt),
  }));
  return {
    items,
    summary: {
      totalPackages: items.length,
      verifiedPackages: items.filter((item) => item.scanStatus === 'verified').length,
      totalWeightGrams: items.reduce((sum, item) => sum + item.weightGrams, 0),
    },
  };
}
