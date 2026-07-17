import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { loadStorefrontCollectionPoints } from '@/core/storefront/collection-points.service';
import { requireEligibleFulfilment, type StorefrontFulfilmentOption } from '@/core/storefront/fulfilment-engine.service';

const METHODS_RESOURCE = 'shipping-methods';
const RESERVATIONS_RESOURCE = 'storefront-fulfilment-reservations';
const DEFAULT_RESERVATION_MINUTES = 45;

type ReservationStatus = 'pending' | 'confirmed' | 'released';
type ReservationInput = {
  tenantSlug: string;
  storeSlug: string;
  selectedMethodId: string;
  orderId: string;
  postcode?: string;
  collectionPointSlug?: string;
  basketGrossMinor?: number;
  basketWeightKg?: number;
  basketLineCount?: number;
  basketItemCount?: number;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function int(value: unknown, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? Math.max(0, Math.round(next)) : fallback; }

async function resolveTenant(tenantSlug: string) {
  const key = slug(tenantSlug);
  const tenant = await platformPrisma.tenant.findFirst({
    where: { OR: [{ id: key }, { slug: key }, { defaultSubdomain: key }] },
    select: { id: true, slug: true, defaultSubdomain: true },
  });
  if (!tenant) throw new Error('Storefront tenant was not found for fulfilment reservation.');
  return tenant;
}

function activeReservation(meta: any) {
  const status = clean(meta?.status);
  if (status === 'confirmed') return true;
  return status === 'pending' && new Date(clean(meta?.expiresAt)).getTime() > Date.now();
}

function reservationUnits(rows: any[], methodId: string, serviceDate: string, collectionPointSlug?: string) {
  const point = slug(collectionPointSlug);
  return rows
    .map((row) => row.metadataJson as any)
    .filter((meta) => clean(meta?.methodId) === methodId && clean(meta?.serviceDate) === serviceDate && activeReservation(meta))
    .filter((meta) => !point || slug(meta?.collectionPointSlug) === point)
    .reduce((sum, meta) => sum + Math.max(1, int(meta?.units, 1)), 0);
}

async function updateReservations(tenantId: string, orderId: string, status: ReservationStatus) {
  const rows = await platformPrisma.coreCatalogRecord.findMany({
    where: { tenantId, resource: RESERVATIONS_RESOURCE },
    take: 1000,
  });
  const matches = rows.filter((row) => clean((row.metadataJson as any)?.orderId) === clean(orderId));
  for (const row of matches) {
    const metadata = row.metadataJson as any;
    await platformPrisma.coreCatalogRecord.update({
      where: { id: row.id },
      data: { metadataJson: { ...metadata, status, updatedAt: new Date().toISOString() } },
    });
  }
  return matches.length;
}

async function methodReservationSettings(tenantId: string, methodId: string) {
  const row = await platformPrisma.coreCatalogRecord.findFirst({
    where: { tenantId, resource: METHODS_RESOURCE, OR: [{ id: methodId }, { slug: methodId }] },
  });
  if (!row) throw new Error('The selected fulfilment method no longer exists.');
  const metadata = row.metadataJson as any;
  return {
    dailyCapacity: int(metadata?.dailyCapacity),
    reservationMinutes: Math.max(5, int(metadata?.reservationMinutes, DEFAULT_RESERVATION_MINUTES)),
  };
}

async function selectedPointCapacity(tenant: { id: string; slug: string; defaultSubdomain: string }, pointSlug: string) {
  if (!pointSlug) return 0;
  const points = await loadStorefrontCollectionPoints([tenant.id, tenant.slug, tenant.defaultSubdomain]);
  const point = points.find((item) => item.slug === pointSlug);
  if (!point || !point.enabled) throw new Error('The selected collection point is no longer available.');
  return int(point.dailyCapacity);
}

export async function reserveFulfilmentCapacity(input: ReservationInput) {
  const tenant = await resolveTenant(input.tenantSlug);
  const { selected } = await requireEligibleFulfilment(input);
  const pointSlug = slug(input.collectionPointSlug);
  const methodSettings = await methodReservationSettings(tenant.id, selected.id);
  const pointCapacity = selected.requiresCollectionPoint ? await selectedPointCapacity(tenant, pointSlug) : 0;
  const reservationId = `fulfilment-${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + methodSettings.reservationMinutes * 60 * 1000).toISOString();
  const lockKey = `${tenant.id}:${selected.id}:${selected.dispatchDate}:${pointSlug || '-'}`;

  await platformPrisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', lockKey);
    const rows = await tx.coreCatalogRecord.findMany({
      where: { tenantId: tenant.id, resource: RESERVATIONS_RESOURCE },
      take: 2000,
    });
    const usedByMethod = reservationUnits(rows, selected.id, selected.dispatchDate);
    const usedByPoint = pointSlug ? reservationUnits(rows, selected.id, selected.dispatchDate, pointSlug) : 0;
    if (methodSettings.dailyCapacity && usedByMethod >= methodSettings.dailyCapacity) {
      throw new Error('This fulfilment method reached capacity while checkout was being prepared. Choose another option.');
    }
    if (pointCapacity && usedByPoint >= pointCapacity) {
      throw new Error('This collection point reached capacity while checkout was being prepared. Choose another point.');
    }
    await tx.coreCatalogRecord.create({
      data: {
        id: reservationId,
        tenantId: tenant.id,
        resource: RESERVATIONS_RESOURCE,
        slug: reservationId,
        name: `Fulfilment reservation ${input.orderId}`,
        description: `${selected.publicLabel} for ${selected.dispatchDate}`,
        metadataJson: {
          orderId: clean(input.orderId),
          methodId: selected.id,
          methodLabel: selected.publicLabel,
          serviceDate: selected.dispatchDate,
          estimatedArrivalDate: selected.estimatedArrivalDate,
          collectionPointSlug: pointSlug,
          units: 1,
          status: 'pending',
          expiresAt,
          priceMinor: selected.priceMinor,
          taxClass: selected.taxClass,
          tenantSlug: slug(input.tenantSlug),
          storeSlug: slug(input.storeSlug),
          createdAt: new Date().toISOString(),
        },
      },
    });
  });

  return { reservationId, expiresAt, method: selected };
}

export async function confirmFulfilmentReservation(tenantSlug: string, orderId: string) {
  const tenant = await resolveTenant(tenantSlug);
  return updateReservations(tenant.id, orderId, 'confirmed');
}

export async function releaseFulfilmentReservation(tenantSlug: string, orderId: string) {
  const tenant = await resolveTenant(tenantSlug);
  return updateReservations(tenant.id, orderId, 'released');
}

export async function syncFulfilmentReservationForPayment(order: any) {
  const resolver = order?.resolver || {};
  const tenantSlug = clean(resolver.tenantSlug);
  const orderId = clean(order?.id);
  if (!tenantSlug || !orderId) return { updated: 0, skipped: true };
  const status = clean(order?.paymentStatus).toLowerCase();
  if (['paid', 'captured', 'authorized'].includes(status)) {
    return { updated: await confirmFulfilmentReservation(tenantSlug, orderId), status: 'confirmed' };
  }
  if (['failed', 'expired', 'cancelled', 'refunded'].includes(status)) {
    return { updated: await releaseFulfilmentReservation(tenantSlug, orderId), status: 'released' };
  }
  return { updated: 0, skipped: true, status };
}

export type { StorefrontFulfilmentOption };
