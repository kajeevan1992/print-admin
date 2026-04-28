export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const BATCH_KEY = 'storefront-production-batches';
const QUALITY_KEY = 'storefront-production-quality';

type QualityRecord = Record<string, any> & {
  id: string;
  jobId: string;
  status: string;
  checkpoints: Record<string, any>;
  history?: any[];
};

const CHECKPOINTS = [
  { key: 'artwork-approved', label: 'Artwork approved' },
  { key: 'prepress-checked', label: 'Prepress checked' },
  { key: 'colour-size-checked', label: 'Colour / size checked' },
  { key: 'finishing-checked', label: 'Finishing checked' },
  { key: 'ready-for-dispatch', label: 'Ready for dispatch' },
];

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production quality request failed.' }, { status });
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

function buildDefaultQuality(job: any): QualityRecord {
  return {
    id: `qc-${String(job.id || '')}`,
    jobId: String(job.id || ''),
    jobNumber: job.jobNumber || null,
    orderNumber: job.orderNumber || null,
    customer: job.customer || null,
    batchId: job.batchId || null,
    batchNumber: job.batchNumber || null,
    status: 'pending-qc',
    checkpoints: CHECKPOINTS.reduce<Record<string, any>>((acc, checkpoint) => {
      acc[checkpoint.key] = { key: checkpoint.key, label: checkpoint.label, status: 'pending' };
      return acc;
    }, {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
  };
}

function summariseQuality(items: QualityRecord[]) {
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'pending-qc').length,
    passed: items.filter((item) => item.status === 'qc-passed').length,
    failed: items.filter((item) => item.status === 'qc-failed').length,
    blocked: items.filter((item) => item.status === 'qc-blocked').length,
  };
}

function enrichQuality(jobs: any[], batches: any[], quality: QualityRecord[]) {
  return jobs.map((job) => {
    const existing = quality.find((item) => String(item.jobId || '') === String(job.id || ''));
    const batch = batches.find((item) => String(item.id || '') === String(job.batchId || '') || (Array.isArray(item.jobIds) && item.jobIds.includes(String(job.id || ''))));
    const base = existing || buildDefaultQuality({ ...job, batchId: batch?.id || job.batchId, batchNumber: batch?.batchNumber || job.batchNumber });
    const checkpointValues = Object.values(base.checkpoints || {});
    const passedCount = checkpointValues.filter((item: any) => item.status === 'passed').length;
    const failedCount = checkpointValues.filter((item: any) => item.status === 'failed').length;
    return {
      ...base,
      jobNumber: job.jobNumber || base.jobNumber,
      orderNumber: job.orderNumber || base.orderNumber,
      customer: job.customer || base.customer,
      batchId: batch?.id || base.batchId || null,
      batchNumber: batch?.batchNumber || base.batchNumber || null,
      productionStatus: job.status || null,
      productionStage: job.productionStage || null,
      passedCount,
      failedCount,
      checkpointCount: CHECKPOINTS.length,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, batches, quality] = await Promise.all([
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, BATCH_KEY),
      readConfigItems<QualityRecord>(request, QUALITY_KEY),
    ]);
    const items = enrichQuality(jobs, batches, quality);
    return NextResponse.json({ ok: true, source: 'internal-production-quality-db', data: { items, checkpoints: CHECKPOINTS, summary: summariseQuality(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = String(body.jobId || '').trim();
    if (!jobId) return responseError(new Error('jobId is required.'), 400);
    const checkpointKey = String(body.checkpointKey || '').trim();
    const action = String(body.action || 'pass').trim();
    const now = new Date().toISOString();
    const jobs = await readConfigItems<any>(request, PRODUCTION_FLOW_KEY);
    const job = jobs.find((item) => String(item.id || '') === jobId);
    if (!job) return responseError(new Error('Production job was not found.'), 404);
    const existingItems = await readConfigItems<QualityRecord>(request, QUALITY_KEY);
    const existing = existingItems.find((item) => String(item.jobId || '') === jobId) || buildDefaultQuality(job);
    const nextCheckpoints = { ...(existing.checkpoints || {}) };

    if (checkpointKey) {
      if (!nextCheckpoints[checkpointKey]) return responseError(new Error('Unknown quality checkpoint.'), 400);
      nextCheckpoints[checkpointKey] = {
        ...nextCheckpoints[checkpointKey],
        status: action === 'fail' ? 'failed' : 'passed',
        note: String(body.note || ''),
        checkedAt: now,
      };
    } else if (action === 'pass-all') {
      CHECKPOINTS.forEach((checkpoint) => {
        nextCheckpoints[checkpoint.key] = { ...nextCheckpoints[checkpoint.key], status: 'passed', checkedAt: now };
      });
    }

    const checkpointValues = Object.values(nextCheckpoints);
    const hasFailed = checkpointValues.some((item: any) => item.status === 'failed');
    const allPassed = checkpointValues.length > 0 && checkpointValues.every((item: any) => item.status === 'passed');
    const nextStatus = hasFailed ? 'qc-failed' : allPassed ? 'qc-passed' : action === 'block' ? 'qc-blocked' : 'pending-qc';
    const historyEntry = { at: now, action, checkpointKey: checkpointKey || null, note: String(body.note || ''), source: 'production-quality' };
    const nextRecord: QualityRecord = {
      ...existing,
      jobId,
      jobNumber: job.jobNumber || existing.jobNumber,
      orderNumber: job.orderNumber || existing.orderNumber,
      customer: job.customer || existing.customer,
      status: nextStatus,
      checkpoints: nextCheckpoints,
      updatedAt: now,
      history: [...(Array.isArray(existing.history) ? existing.history : []), historyEntry],
    };
    const nextItems = [nextRecord, ...existingItems.filter((item) => String(item.jobId || '') !== jobId)];
    await saveConfigItems(request, QUALITY_KEY, 'Storefront production quality', 'Quality checkpoint records for storefront production jobs.', nextItems, 'StorefrontProductionQuality');

    const nextJobs = jobs.map((item) => String(item.id || '') === jobId ? { ...item, qualityStatus: nextStatus, updatedAt: now, auditTrail: [...(Array.isArray(item.auditTrail) ? item.auditTrail : []), historyEntry] } : item);
    await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', nextJobs, 'StorefrontProductionQuality');

    return NextResponse.json({ ok: true, source: 'internal-production-quality-db', data: { items: nextItems, summary: summariseQuality(nextItems) }, item: nextRecord });
  } catch (error) {
    return responseError(error);
  }
}
