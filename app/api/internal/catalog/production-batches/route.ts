export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const ROUTING_KEY = 'storefront-production-routing';
const SCHEDULE_KEY = 'storefront-production-schedule';
const BATCH_KEY = 'storefront-production-batches';

type ProductionJobRecord = Record<string, any> & { id: string; jobNumber?: string; auditTrail?: any[] };
type BatchRecord = Record<string, any> & { id: string; batchNumber: string; jobIds: string[]; status: string; history?: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production batching request failed.' }, { status });
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

function keyForJob(job: any) {
  const product = String(job.productName || job.items?.[0]?.productName || job.order?.items?.[0]?.productName || 'mixed-product');
  const machine = String(job.routing?.machineId || job.assignedMachineId || 'unassigned-machine');
  const stage = String(job.routing?.stage || job.assignedProductionStage || job.productionStage || 'prepress');
  return `${machine}::${stage}::${product}`.toLowerCase();
}

function batchSummary(items: BatchRecord[]) {
  return {
    total: items.length,
    open: items.filter((item) => item.status === 'open').length,
    released: items.filter((item) => item.status === 'released').length,
    completed: items.filter((item) => item.status === 'completed').length,
    jobs: items.reduce((sum, item) => sum + (Array.isArray(item.jobIds) ? item.jobIds.length : 0), 0),
  };
}

function enrichJobs(jobs: ProductionJobRecord[], batches: BatchRecord[]) {
  return jobs.map((job) => {
    const batch = batches.find((item) => Array.isArray(item.jobIds) && item.jobIds.includes(String(job.id || ''))) || null;
    return { ...job, batch };
  });
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, routing, schedule, batches] = await Promise.all([
      readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, ROUTING_KEY),
      readConfigItems<any>(request, SCHEDULE_KEY),
      readConfigItems<BatchRecord>(request, BATCH_KEY),
    ]);
    const routedJobs = jobs.map((job) => {
      const route = routing.find((item) => String(item.jobId || '') === String(job.id || '')) || job.routing || null;
      const slot = schedule.find((item) => String(item.jobId || '') === String(job.id || '')) || job.schedule || null;
      return { ...job, routing: route, schedule: slot };
    });
    return NextResponse.json({ ok: true, source: 'internal-production-batches-db', data: { items: batches, jobs: enrichJobs(routedJobs, batches), summary: batchSummary(batches) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'auto-batch').trim();
    const now = new Date().toISOString();
    const jobs = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    const routing = await readConfigItems<any>(request, ROUTING_KEY);
    const schedule = await readConfigItems<any>(request, SCHEDULE_KEY);
    const batches = await readConfigItems<BatchRecord>(request, BATCH_KEY);

    if (action === 'release' || action === 'complete') {
      const batchId = String(body.batchId || '').trim();
      if (!batchId) return responseError(new Error('batchId is required.'), 400);
      const existing = batches.find((item) => String(item.id || '') === batchId);
      if (!existing) return responseError(new Error('Batch was not found.'), 404);
      const nextStatus = action === 'complete' ? 'completed' : 'released';
      const historyEntry = { at: now, action, note: String(body.note || ''), source: 'production-batches' };
      const nextBatch = { ...existing, status: nextStatus, updatedAt: now, history: [...(Array.isArray(existing.history) ? existing.history : []), historyEntry] };
      const nextBatches = batches.map((item) => String(item.id || '') === batchId ? nextBatch : item);
      await saveConfigItems(request, BATCH_KEY, 'Storefront production batches', 'Batch groups for scheduled/routed production jobs.', nextBatches, 'StorefrontProductionBatches');
      return NextResponse.json({ ok: true, source: 'internal-production-batches-db', data: { items: nextBatches, summary: batchSummary(nextBatches) }, item: nextBatch });
    }

    const alreadyBatched = new Set(batches.flatMap((batch) => Array.isArray(batch.jobIds) ? batch.jobIds.map(String) : []));
    const candidateJobs = jobs
      .filter((job) => !alreadyBatched.has(String(job.id || '')))
      .map((job) => {
        const route = routing.find((item) => String(item.jobId || '') === String(job.id || '')) || job.routing || null;
        const slot = schedule.find((item) => String(item.jobId || '') === String(job.id || '')) || job.schedule || null;
        return { ...job, routing: route, schedule: slot };
      })
      .filter((job) => job.routing || job.assignedMachineId)
      .filter((job) => String(job.status || '') !== 'completed');

    if (candidateJobs.length === 0) return responseError(new Error('No routed, unbatched production jobs are ready for batching.'), 400);

    const groups = candidateJobs.reduce<Record<string, any[]>>((acc, job) => {
      const key = keyForJob(job);
      acc[key] = acc[key] || [];
      acc[key].push(job);
      return acc;
    }, {});

    const created = Object.entries(groups).map(([key, group], index) => {
      const first = group[0] || {};
      const historyEntry = { at: now, action: 'auto-batch', key, jobCount: group.length, source: 'production-batches' };
      return {
        id: `batch-${Date.now()}-${index + 1}`,
        batchNumber: `BATCH-${Date.now()}-${index + 1}`,
        status: 'open',
        key,
        machineId: first.routing?.machineId || first.assignedMachineId || null,
        machineName: first.routing?.machineName || first.assignedMachineName || null,
        stage: first.routing?.stage || first.assignedProductionStage || first.productionStage || 'prepress',
        productName: first.productName || first.items?.[0]?.productName || 'Mixed product',
        jobIds: group.map((job) => String(job.id || '')).filter(Boolean),
        jobNumbers: group.map((job) => String(job.jobNumber || job.id || '')).filter(Boolean),
        totalQuantity: group.reduce((sum, job) => sum + Number(job.quantity || job.items?.[0]?.quantity || 0), 0),
        scheduledStart: group.map((job) => job.schedule?.scheduledStart).filter(Boolean).sort()[0] || null,
        createdAt: now,
        updatedAt: now,
        history: [historyEntry],
      };
    });

    const nextBatches = [...created, ...batches];
    await saveConfigItems(request, BATCH_KEY, 'Storefront production batches', 'Batch groups for scheduled/routed production jobs.', nextBatches, 'StorefrontProductionBatches');

    const batchByJobId = new Map(created.flatMap((batch) => batch.jobIds.map((jobId: string) => [jobId, batch])) as any);
    const updatedJobs = jobs.map((job) => {
      const batch = batchByJobId.get(String(job.id || ''));
      if (!batch) return job;
      const historyEntry = { at: now, action: 'batched', batchId: batch.id, batchNumber: batch.batchNumber, source: 'production-batches' };
      return { ...job, batchId: batch.id, batchNumber: batch.batchNumber, updatedAt: now, auditTrail: [...(Array.isArray(job.auditTrail) ? job.auditTrail : []), historyEntry] };
    });
    await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', updatedJobs, 'StorefrontProductionBatches');

    return NextResponse.json({ ok: true, source: 'internal-production-batches-db', data: { items: nextBatches, summary: batchSummary(nextBatches) }, item: created[0] || null });
  } catch (error) {
    return responseError(error);
  }
}
