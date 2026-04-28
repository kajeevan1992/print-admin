export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const DISPATCH_KEY = 'storefront-production-dispatch';
const DELIVERY_KEY = 'storefront-production-delivery';

type DeliveryRecord = Record<string, any> & {
  id: string;
  jobId: string;
  status: string;
  method: string;
  trackingReference?: string;
  history?: any[];
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production delivery request failed.' }, { status });
}

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source },
  } as any);
}

function deliveryMethod(job: any) {
  const raw = String(job.deliveryMethod || job.shippingMethod || job.totals?.deliveryMethod || job.deliveryEstimate?.method || '').toLowerCase();
  if (raw.includes('collect')) return 'collection';
  if (raw.includes('local')) return 'local-delivery';
  if (raw.includes('same')) return 'same-day-delivery';
  return 'courier';
}

function buildDelivery(job: any, dispatch: any, existing?: DeliveryRecord): DeliveryRecord {
  const method = existing?.method || deliveryMethod(job);
  const dispatched = String(dispatch?.status || job.dispatchStatus || '') === 'dispatched';
  const status = existing?.status === 'delivered'
    ? 'delivered'
    : existing?.status === 'in-transit'
      ? 'in-transit'
      : dispatched
        ? 'ready-for-delivery'
        : 'delivery-blocked';
  const referenceSeed = String(job.jobNumber || job.id || Date.now()).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
  return {
    id: existing?.id || `delivery-${String(job.id || '')}`,
    jobId: String(job.id || ''),
    jobNumber: job.jobNumber || existing?.jobNumber || null,
    orderNumber: job.orderNumber || existing?.orderNumber || null,
    customer: job.customer || existing?.customer || null,
    totals: job.totals || existing?.totals || null,
    method,
    status,
    trackingReference: existing?.trackingReference || null,
    deliveryEstimate: job.deliveryEstimate || job.totals?.deliveryEstimate || existing?.deliveryEstimate || null,
    dispatchedAt: dispatch?.dispatchedAt || job.dispatchedAt || existing?.dispatchedAt || null,
    deliveredAt: existing?.deliveredAt || null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: Array.isArray(existing?.history) ? existing!.history : [],
    referenceSeed,
  };
}

function summarise(items: DeliveryRecord[]) {
  return {
    total: items.length,
    blocked: items.filter((item) => item.status === 'delivery-blocked').length,
    ready: items.filter((item) => item.status === 'ready-for-delivery').length,
    inTransit: items.filter((item) => item.status === 'in-transit').length,
    delivered: items.filter((item) => item.status === 'delivered').length,
    collection: items.filter((item) => item.method === 'collection').length,
  };
}

function enrich(jobs: any[], dispatchItems: any[], deliveryItems: DeliveryRecord[]) {
  return jobs.map((job) => {
    const dispatch = dispatchItems.find((item) => String(item.jobId || '') === String(job.id || ''));
    const existing = deliveryItems.find((item) => String(item.jobId || '') === String(job.id || ''));
    return buildDelivery(job, dispatch, existing);
  });
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, dispatchItems, deliveryItems] = await Promise.all([
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, DISPATCH_KEY),
      readConfigItems<DeliveryRecord>(request, DELIVERY_KEY),
    ]);
    const items = enrich(jobs, dispatchItems, deliveryItems);
    return NextResponse.json({ ok: true, source: 'internal-production-delivery-db', data: { items, summary: summarise(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = String(body.jobId || '').trim();
    const action = String(body.action || '').trim();
    if (!jobId) return responseError(new Error('jobId is required.'), 400);
    if (!['create-tracking', 'mark-delivered'].includes(action)) return responseError(new Error('Valid action is required.'), 400);

    const now = new Date().toISOString();
    const [jobs, dispatchItems, existingItems] = await Promise.all([
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, DISPATCH_KEY),
      readConfigItems<DeliveryRecord>(request, DELIVERY_KEY),
    ]);
    const job = jobs.find((item) => String(item.id || '') === jobId);
    if (!job) return responseError(new Error('Production job was not found.'), 404);
    const dispatch = dispatchItems.find((item) => String(item.jobId || '') === jobId);
    if (String(dispatch?.status || job.dispatchStatus || '') !== 'dispatched') return responseError(new Error('Delivery tracking requires the job to be dispatched first.'), 400);

    const existing = existingItems.find((item) => String(item.jobId || '') === jobId);
    let nextRecord = buildDelivery(job, dispatch, existing);
    const historyEntry = { at: now, action, note: String(body.note || ''), source: 'production-delivery' };

    if (action === 'create-tracking') {
      nextRecord = {
        ...nextRecord,
        status: nextRecord.method === 'collection' ? 'ready-for-collection' : 'in-transit',
        trackingReference: nextRecord.trackingReference || `TRK-${nextRecord.referenceSeed}`,
        trackingCreatedAt: nextRecord.trackingCreatedAt || now,
        updatedAt: now,
        history: [...(nextRecord.history || []), historyEntry],
      };
    }

    if (action === 'mark-delivered') {
      nextRecord = {
        ...nextRecord,
        status: nextRecord.method === 'collection' ? 'collected' : 'delivered',
        trackingReference: nextRecord.trackingReference || `TRK-${nextRecord.referenceSeed}`,
        deliveredAt: now,
        updatedAt: now,
        history: [...(nextRecord.history || []), historyEntry],
      };
    }

    const nextItems = [nextRecord, ...existingItems.filter((item) => String(item.jobId || '') !== jobId)];
    await saveConfigItems(request, DELIVERY_KEY, 'Storefront production delivery', 'Delivery and collection tracking records for dispatched storefront production jobs.', nextItems, 'StorefrontProductionDelivery');

    const nextJobs = jobs.map((item) => String(item.id || '') === jobId ? { ...item, deliveryStatus: nextRecord.status, trackingReference: nextRecord.trackingReference || item.trackingReference || null, deliveredAt: nextRecord.deliveredAt || item.deliveredAt || null, updatedAt: now, auditTrail: [...(Array.isArray(item.auditTrail) ? item.auditTrail : []), historyEntry] } : item);
    await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', nextJobs, 'StorefrontProductionDelivery');

    return NextResponse.json({ ok: true, source: 'internal-production-delivery-db', data: { items: nextItems, summary: summarise(nextItems) }, item: nextRecord });
  } catch (error) {
    return responseError(error);
  }
}
