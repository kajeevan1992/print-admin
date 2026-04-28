export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const QUALITY_KEY = 'storefront-production-quality';
const DISPATCH_KEY = 'storefront-production-dispatch';

type DispatchRecord = Record<string, any> & {
  id: string;
  jobId: string;
  status: string;
  checklist: any[];
  history?: any[];
};

const DISPATCH_CHECKS = [
  { key: 'qc-passed', label: 'QC passed' },
  { key: 'job-completed', label: 'Production completed' },
  { key: 'customer-details', label: 'Customer details captured' },
  { key: 'delivery-estimate', label: 'Delivery estimate available' },
  { key: 'packing-slip', label: 'Packing slip prepared' },
];

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production dispatch request failed.' }, { status });
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

function buildChecklist(job: any, quality: any, existing?: DispatchRecord) {
  const packingPrepared = Boolean(existing?.packingSlipPreparedAt);
  const completed = String(job.status || '') === 'completed' || String(job.productionStage || '') === 'completed';
  const qcPassed = String(quality?.status || job.qualityStatus || '') === 'qc-passed';
  const customer = job.customer || {};
  return DISPATCH_CHECKS.map((check) => {
    let ok = false;
    if (check.key === 'qc-passed') ok = qcPassed;
    if (check.key === 'job-completed') ok = completed;
    if (check.key === 'customer-details') ok = Boolean(customer.name && (customer.email || customer.phone));
    if (check.key === 'delivery-estimate') ok = Boolean(job.deliveryEstimate || job.turnaround || job.totals?.deliveryEstimate);
    if (check.key === 'packing-slip') ok = packingPrepared;
    return { ...check, ok };
  });
}

function buildDispatch(job: any, quality: any, existing?: DispatchRecord): DispatchRecord {
  const checklist = buildChecklist(job, quality, existing);
  const ready = checklist.every((item) => item.ok);
  return {
    id: existing?.id || `dispatch-${String(job.id || '')}`,
    jobId: String(job.id || ''),
    jobNumber: job.jobNumber || existing?.jobNumber || null,
    orderNumber: job.orderNumber || existing?.orderNumber || null,
    customer: job.customer || existing?.customer || null,
    totals: job.totals || existing?.totals || null,
    status: existing?.status === 'dispatched' ? 'dispatched' : ready ? 'ready-for-dispatch' : 'dispatch-blocked',
    checklist,
    packingSlipPreparedAt: existing?.packingSlipPreparedAt || null,
    dispatchedAt: existing?.dispatchedAt || null,
    deliveryEstimate: job.deliveryEstimate || job.totals?.deliveryEstimate || existing?.deliveryEstimate || null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: Array.isArray(existing?.history) ? existing!.history : [],
  };
}

function summarise(items: DispatchRecord[]) {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === 'ready-for-dispatch').length,
    blocked: items.filter((item) => item.status === 'dispatch-blocked').length,
    dispatched: items.filter((item) => item.status === 'dispatched').length,
    packingPrepared: items.filter((item) => Boolean(item.packingSlipPreparedAt)).length,
  };
}

function enrich(jobs: any[], qualityItems: any[], dispatchItems: DispatchRecord[]) {
  return jobs.map((job) => {
    const quality = qualityItems.find((item) => String(item.jobId || '') === String(job.id || ''));
    const existing = dispatchItems.find((item) => String(item.jobId || '') === String(job.id || ''));
    return buildDispatch(job, quality, existing);
  });
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, qualityItems, dispatchItems] = await Promise.all([
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, QUALITY_KEY),
      readConfigItems<DispatchRecord>(request, DISPATCH_KEY),
    ]);
    const items = enrich(jobs, qualityItems, dispatchItems);
    return NextResponse.json({ ok: true, source: 'internal-production-dispatch-db', data: { items, checks: DISPATCH_CHECKS, summary: summarise(items) } });
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
    if (!['prepare-packing', 'mark-dispatched'].includes(action)) return responseError(new Error('Valid action is required.'), 400);

    const now = new Date().toISOString();
    const [jobs, qualityItems, existingItems] = await Promise.all([
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, QUALITY_KEY),
      readConfigItems<DispatchRecord>(request, DISPATCH_KEY),
    ]);
    const job = jobs.find((item) => String(item.id || '') === jobId);
    if (!job) return responseError(new Error('Production job was not found.'), 404);
    const quality = qualityItems.find((item) => String(item.jobId || '') === jobId);
    const existing = existingItems.find((item) => String(item.jobId || '') === jobId);
    let nextRecord = buildDispatch(job, quality, existing);
    const historyEntry = { at: now, action, note: String(body.note || ''), source: 'production-dispatch' };

    if (action === 'prepare-packing') {
      nextRecord = buildDispatch(job, quality, { ...nextRecord, packingSlipPreparedAt: now, history: [...(nextRecord.history || []), historyEntry] });
    }

    if (action === 'mark-dispatched') {
      const prepared = buildDispatch(job, quality, { ...nextRecord, packingSlipPreparedAt: nextRecord.packingSlipPreparedAt || now });
      if (prepared.checklist.some((item: any) => !item.ok)) return responseError(new Error('Dispatch is blocked until all checks are ready.'), 400);
      nextRecord = { ...prepared, status: 'dispatched', dispatchedAt: now, updatedAt: now, history: [...(prepared.history || []), historyEntry] };
    }

    const nextItems = [nextRecord, ...existingItems.filter((item) => String(item.jobId || '') !== jobId)];
    await saveConfigItems(request, DISPATCH_KEY, 'Storefront production dispatch', 'Dispatch readiness and packing handoff records for storefront production jobs.', nextItems, 'StorefrontProductionDispatch');

    const nextJobs = jobs.map((item) => String(item.id || '') === jobId ? { ...item, dispatchStatus: nextRecord.status, dispatchedAt: nextRecord.dispatchedAt || item.dispatchedAt || null, updatedAt: now, auditTrail: [...(Array.isArray(item.auditTrail) ? item.auditTrail : []), historyEntry] } : item);
    await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', nextJobs, 'StorefrontProductionDispatch');

    return NextResponse.json({ ok: true, source: 'internal-production-dispatch-db', data: { items: nextItems, summary: summarise(nextItems) }, item: nextRecord });
  } catch (error) {
    return responseError(error);
  }
}
