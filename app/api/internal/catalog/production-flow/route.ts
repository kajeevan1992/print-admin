export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const ORDER_PIPELINE_KEY = 'storefront-order-pipeline';
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';

type PipelineOrderRecord = Record<string, any> & {
  id: string;
  orderNumber?: string;
  status?: string;
  productionStatus?: string;
  items?: any[];
  totals?: Record<string, any>;
};

type ProductionJobRecord = Record<string, any> & {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  status: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production flow request failed.' }, { status });
}

function compactTimestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function makeId(prefix = 'production-job') {
  return `${prefix}-${compactTimestamp()}`;
}

function makeJobNumber() {
  return `JOB-${compactTimestamp()}`;
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
    metadataJson: {
      items,
      savedAt: new Date().toISOString(),
      storageKey: key,
      source,
    },
  } as any);
}

function orderArtworkStatus(order: PipelineOrderRecord) {
  const uploads = Array.isArray(order.artworkUploads) ? order.artworkUploads : [];
  if (order.artworkStatus) return String(order.artworkStatus);
  return uploads.length > 0 ? 'artwork-received' : 'missing-artwork';
}

function normaliseProductionJob(order: PipelineOrderRecord): ProductionJobRecord {
  const now = new Date().toISOString();
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    id: makeId(),
    jobNumber: makeJobNumber(),
    orderId: String(order.id || ''),
    orderNumber: String(order.orderNumber || order.id || ''),
    draftOrderId: String(order.draftOrderId || ''),
    quoteReference: String(order.quoteReference || ''),
    status: 'production-ready',
    productionStage: 'prepress-queue',
    artworkStatus: orderArtworkStatus(order),
    paymentStatus: String(order.paymentStatus || 'not-required-yet'),
    customer: order.customer || {},
    items,
    lineCount: items.length,
    totals: order.totals || {},
    turnaround: order.turnaround || [],
    deliveryEstimate: order.deliveryEstimate || [],
    checks: {
      hasArtwork: orderArtworkStatus(order) === 'artwork-received',
      hasPricing: items.every((item: any) => item.pricing || Number(item.grossTotalMinor || 0) > 0),
      hasCustomer: Boolean(order.customer?.name && order.customer?.email),
    },
    auditTrail: [
      ...((Array.isArray(order.auditTrail) ? order.auditTrail : [])),
      { status: 'production-job-created', at: now, source: 'production-flow' },
    ],
    createdAt: now,
    updatedAt: now,
    source: 'StorefrontOrderToProductionFlow',
  };
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    return NextResponse.json({ ok: true, source: 'internal-production-flow-db', data: { items } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || body.pipelineOrderId || '').trim();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);

    const orders = await readConfigItems<PipelineOrderRecord>(request, ORDER_PIPELINE_KEY);
    const order = orders.find((item) => String(item.id || '') === orderId);
    if (!order) return responseError(new Error('Pipeline order was not found.'), 404);

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return responseError(new Error('Pipeline order has no production line items.'), 400);
    if (!order.customer?.name || !order.customer?.email) return responseError(new Error('Pipeline order customer details are incomplete.'), 400);
    if (items.some((item: any) => !item.pricing && !Number(item.grossTotalMinor || 0))) return responseError(new Error('Pipeline order line items must include pricing before production.'), 400);
    if (orderArtworkStatus(order) !== 'artwork-received') return responseError(new Error('Artwork must be received before creating a production job.'), 400);

    const existingJobs = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    const existing = existingJobs.find((item) => String(item.orderId || '') === orderId);
    if (existing) return NextResponse.json({ ok: true, source: 'internal-production-flow-db', item: existing, duplicate: true });

    const job = normaliseProductionJob(order);
    const record = await saveConfigItems(
      request,
      PRODUCTION_FLOW_KEY,
      'Storefront production flow',
      'Production job records generated from storefront order pipeline records.',
      [job, ...existingJobs],
      'StorefrontProductionFlowWorkflow',
    );

    const updatedOrders = orders.map((item) => String(item.id || '') === orderId ? {
      ...item,
      status: 'in-production',
      pipelineStage: 'production',
      productionStatus: 'prepress-queue',
      productionJobId: job.id,
      jobNumber: job.jobNumber,
      updatedAt: new Date().toISOString(),
    } : item);
    await saveConfigItems(
      request,
      ORDER_PIPELINE_KEY,
      'Storefront order pipeline',
      'Order pipeline records generated from confirmed storefront checkout draft orders.',
      updatedOrders,
      'StorefrontOrderPipelineWorkflow',
    );

    return NextResponse.json({ ok: true, source: 'internal-production-flow-db', data: record, item: job });
  } catch (error) {
    return responseError(error);
  }
}
