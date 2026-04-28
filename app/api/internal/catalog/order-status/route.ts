export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const ORDER_PIPELINE_KEY = 'storefront-order-pipeline';
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const DELIVERY_KEY = 'storefront-production-delivery';
const ORDER_STATUS_KEY = 'storefront-order-status-audit';

type StatusRecord = Record<string, any> & {
  id: string;
  orderId?: string;
  jobId?: string;
  customerVisibleStatus: string;
  lastMessage: string;
  history: any[];
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Order status request failed.' }, { status });
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

function customerStatus(order: any, job: any, delivery: any, audit?: StatusRecord) {
  if (audit?.customerVisibleStatus) return audit.customerVisibleStatus;
  const deliveryStatus = String(delivery?.status || job?.deliveryStatus || '').toLowerCase();
  const jobStatus = String(job?.status || order?.productionStatus || '').toLowerCase();
  const orderStatus = String(order?.status || '').toLowerCase();

  if (['delivered', 'collected'].includes(deliveryStatus)) return deliveryStatus === 'collected' ? 'collected' : 'delivered';
  if (['in-transit', 'ready-for-collection', 'ready-for-delivery'].includes(deliveryStatus)) return deliveryStatus;
  if (jobStatus.includes('completed')) return 'production-complete';
  if (jobStatus.includes('hold')) return 'on-hold';
  if (jobStatus.includes('production') || jobStatus.includes('prepress')) return 'in-production';
  if (orderStatus.includes('received')) return 'order-received';
  return 'draft-confirmed';
}

function statusMessage(status: string) {
  if (status === 'order-received') return 'Your order has been received and is waiting for production setup.';
  if (status === 'in-production') return 'Your order is currently in production.';
  if (status === 'on-hold') return 'Your order is on hold and needs attention before production continues.';
  if (status === 'production-complete') return 'Production is complete and the order is being prepared for dispatch.';
  if (status === 'ready-for-delivery') return 'Your order is ready for delivery handoff.';
  if (status === 'in-transit') return 'Your order is on the way.';
  if (status === 'ready-for-collection') return 'Your order is ready for collection.';
  if (status === 'collected') return 'Your order has been collected.';
  if (status === 'delivered') return 'Your order has been delivered.';
  return 'Your order status has been updated.';
}

function buildStatusRecord(order: any, job: any, delivery: any, audit?: StatusRecord): StatusRecord {
  const now = new Date().toISOString();
  const status = customerStatus(order, job, delivery, audit);
  const id = audit?.id || `status-${String(order?.id || job?.orderId || job?.id || Date.now())}`;
  return {
    id,
    orderId: String(order?.id || job?.orderId || ''),
    orderNumber: order?.orderNumber || job?.orderNumber || audit?.orderNumber || null,
    jobId: String(job?.id || audit?.jobId || ''),
    jobNumber: job?.jobNumber || audit?.jobNumber || null,
    customer: order?.customer || job?.customer || audit?.customer || null,
    totals: order?.totals || job?.totals || audit?.totals || null,
    customerVisibleStatus: status,
    lastMessage: audit?.lastMessage || statusMessage(status),
    trackingReference: delivery?.trackingReference || job?.trackingReference || audit?.trackingReference || null,
    deliveryMethod: delivery?.method || audit?.deliveryMethod || null,
    deliveryEstimate: delivery?.deliveryEstimate || job?.deliveryEstimate || order?.deliveryEstimate || audit?.deliveryEstimate || null,
    sourceStatus: { order: order?.status || null, production: job?.status || null, delivery: delivery?.status || null },
    createdAt: audit?.createdAt || now,
    updatedAt: now,
    history: Array.isArray(audit?.history) ? audit.history : [],
  };
}

function summarise(items: StatusRecord[]) {
  return {
    total: items.length,
    received: items.filter((item) => item.customerVisibleStatus === 'order-received').length,
    production: items.filter((item) => ['in-production', 'production-complete'].includes(item.customerVisibleStatus)).length,
    attention: items.filter((item) => item.customerVisibleStatus === 'on-hold').length,
    transit: items.filter((item) => ['ready-for-delivery', 'in-transit', 'ready-for-collection'].includes(item.customerVisibleStatus)).length,
    complete: items.filter((item) => ['delivered', 'collected'].includes(item.customerVisibleStatus)).length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const [orders, jobs, deliveries, audits] = await Promise.all([
      readConfigItems<any>(request, ORDER_PIPELINE_KEY),
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, DELIVERY_KEY),
      readConfigItems<StatusRecord>(request, ORDER_STATUS_KEY),
    ]);

    const items = orders.map((order) => {
      const job = jobs.find((item) => String(item.orderId || '') === String(order.id || '') || String(item.id || '') === String(order.productionJobId || ''));
      const delivery = deliveries.find((item) => String(item.jobId || '') === String(job?.id || ''));
      const audit = audits.find((item) => String(item.orderId || '') === String(order.id || ''));
      return buildStatusRecord(order, job, delivery, audit);
    });

    return NextResponse.json({ ok: true, source: 'internal-order-status-db', data: { items, summary: summarise(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    const customerVisibleStatus = String(body.customerVisibleStatus || body.status || '').trim();
    const message = String(body.message || '').trim();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);
    if (!customerVisibleStatus) return responseError(new Error('customerVisibleStatus is required.'), 400);

    const now = new Date().toISOString();
    const [orders, jobs, deliveries, audits] = await Promise.all([
      readConfigItems<any>(request, ORDER_PIPELINE_KEY),
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, DELIVERY_KEY),
      readConfigItems<StatusRecord>(request, ORDER_STATUS_KEY),
    ]);
    const order = orders.find((item) => String(item.id || '') === orderId);
    if (!order) return responseError(new Error('Pipeline order was not found.'), 404);
    const job = jobs.find((item) => String(item.orderId || '') === orderId || String(item.id || '') === String(order.productionJobId || ''));
    const delivery = deliveries.find((item) => String(item.jobId || '') === String(job?.id || ''));
    const existing = audits.find((item) => String(item.orderId || '') === orderId);
    const base = buildStatusRecord(order, job, delivery, existing);
    const entry = { at: now, customerVisibleStatus, message: message || statusMessage(customerVisibleStatus), source: 'order-status' };
    const updated: StatusRecord = { ...base, customerVisibleStatus, lastMessage: entry.message, updatedAt: now, history: [...(base.history || []), entry] };
    const nextItems = [updated, ...audits.filter((item) => String(item.orderId || '') !== orderId)];
    await saveConfigItems(request, ORDER_STATUS_KEY, 'Storefront order status audit', 'Customer-visible order status records and manual status notes.', nextItems, 'StorefrontOrderStatus');
    return NextResponse.json({ ok: true, source: 'internal-order-status-db', data: { items: nextItems, summary: summarise(nextItems) }, item: updated });
  } catch (error) {
    return responseError(error);
  }
}
