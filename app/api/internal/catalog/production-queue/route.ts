export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const ORDER_PIPELINE_KEY = 'storefront-order-pipeline';

const ALLOWED_STATUSES = new Set(['production-ready', 'in-production', 'on-hold', 'prepress-complete', 'completed']);
const ALLOWED_STAGES = new Set(['prepress-queue', 'prepress-active', 'awaiting-customer', 'print-queue', 'production-complete']);

type ProductionJobRecord = Record<string, any> & {
  id: string;
  jobNumber?: string;
  orderId?: string;
  status?: string;
  productionStage?: string;
  auditTrail?: any[];
};

type PipelineOrderRecord = Record<string, any> & {
  id: string;
  productionJobId?: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production queue request failed.' }, { status });
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

function queueSummary(items: ProductionJobRecord[]) {
  return {
    total: items.length,
    ready: items.filter((item) => String(item.status || '') === 'production-ready').length,
    active: items.filter((item) => String(item.status || '') === 'in-production').length,
    hold: items.filter((item) => String(item.status || '') === 'on-hold').length,
    complete: items.filter((item) => ['prepress-complete', 'completed'].includes(String(item.status || ''))).length,
  };
}

function nextPatchForAction(action: string) {
  if (action === 'start-prepress') return { status: 'in-production', productionStage: 'prepress-active', pipelineStatus: 'in-production', pipelineStage: 'prepress-active' };
  if (action === 'hold') return { status: 'on-hold', productionStage: 'awaiting-customer', pipelineStatus: 'on-hold', pipelineStage: 'awaiting-customer' };
  if (action === 'complete-prepress') return { status: 'prepress-complete', productionStage: 'print-queue', pipelineStatus: 'prepress-complete', pipelineStage: 'print-queue' };
  if (action === 'complete-production') return { status: 'completed', productionStage: 'production-complete', pipelineStatus: 'completed', pipelineStage: 'production-complete' };
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    return NextResponse.json({ ok: true, source: 'internal-production-queue-db', data: { items, summary: queueSummary(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = String(body.jobId || body.id || '').trim();
    const action = String(body.action || '').trim();
    const note = String(body.note || '').trim();
    const patch = nextPatchForAction(action);

    if (!jobId) return responseError(new Error('jobId is required.'), 400);
    if (!patch) return responseError(new Error('Unsupported production queue action.'), 400);
    if (!ALLOWED_STATUSES.has(patch.status) || !ALLOWED_STAGES.has(patch.productionStage)) return responseError(new Error('Invalid production status transition.'), 400);

    const jobs = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    const job = jobs.find((item) => String(item.id || '') === jobId);
    if (!job) return responseError(new Error('Production job was not found.'), 404);

    const now = new Date().toISOString();
    const updatedJob = {
      ...job,
      status: patch.status,
      productionStage: patch.productionStage,
      updatedAt: now,
      auditTrail: [
        ...((Array.isArray(job.auditTrail) ? job.auditTrail : [])),
        { status: patch.status, productionStage: patch.productionStage, action, note, at: now, source: 'production-queue' },
      ],
    };

    const updatedJobs = jobs.map((item) => String(item.id || '') === jobId ? updatedJob : item);
    await saveConfigItems(
      request,
      PRODUCTION_FLOW_KEY,
      'Storefront production flow',
      'Production job records generated from storefront order pipeline records.',
      updatedJobs,
      'StorefrontProductionQueueWorkflow',
    );

    const orders = await readConfigItems<PipelineOrderRecord>(request, ORDER_PIPELINE_KEY);
    if (orders.length > 0) {
      const updatedOrders = orders.map((order) => String(order.productionJobId || '') === jobId || String(order.id || '') === String(job.orderId || '') ? {
        ...order,
        status: patch.pipelineStatus,
        pipelineStage: patch.pipelineStage,
        productionStatus: patch.productionStage,
        updatedAt: now,
      } : order);
      await saveConfigItems(
        request,
        ORDER_PIPELINE_KEY,
        'Storefront order pipeline',
        'Order pipeline records generated from confirmed storefront checkout draft orders.',
        updatedOrders,
        'StorefrontProductionQueueWorkflow',
      );
    }

    return NextResponse.json({ ok: true, source: 'internal-production-queue-db', data: { items: updatedJobs, summary: queueSummary(updatedJobs) }, item: updatedJob });
  } catch (error) {
    return responseError(error);
  }
}
