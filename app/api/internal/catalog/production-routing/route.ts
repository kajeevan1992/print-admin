export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const ROUTING_KEY = 'storefront-production-routing';

const DEFAULT_MACHINES = [
  { id: 'digital-press-1', name: 'Digital Press 1', stage: 'print', capacityMinutesPerDay: 420 },
  { id: 'wide-format-1', name: 'Wide Format 1', stage: 'print', capacityMinutesPerDay: 360 },
  { id: 'finishing-bench-1', name: 'Finishing Bench 1', stage: 'finishing', capacityMinutesPerDay: 300 },
  { id: 'prepress-desk-1', name: 'Prepress Desk 1', stage: 'prepress', capacityMinutesPerDay: 420 },
];

const ALLOWED_STAGES = new Set(['prepress', 'print', 'finishing', 'dispatch']);

type ProductionJobRecord = Record<string, any> & { id: string; jobNumber?: string; auditTrail?: any[] };
type RoutingRecord = Record<string, any> & { id: string; jobId: string; machineId: string; stage: string; history?: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production routing request failed.' }, { status });
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

function routingSummary(items: RoutingRecord[]) {
  return {
    total: items.length,
    prepress: items.filter((item) => item.stage === 'prepress').length,
    print: items.filter((item) => item.stage === 'print').length,
    finishing: items.filter((item) => item.stage === 'finishing').length,
    dispatch: items.filter((item) => item.stage === 'dispatch').length,
    assignedMachines: Array.from(new Set(items.map((item) => item.machineId).filter(Boolean))).length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, routing] = await Promise.all([
      readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<RoutingRecord>(request, ROUTING_KEY),
    ]);
    const items = jobs.map((job) => {
      const assignment = routing.find((item) => String(item.jobId || '') === String(job.id || '')) || null;
      return { ...job, routing: assignment };
    });
    return NextResponse.json({ ok: true, source: 'internal-production-routing-db', data: { items, routing, machines: DEFAULT_MACHINES, summary: routingSummary(routing) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = String(body.jobId || '').trim();
    const machineId = String(body.machineId || '').trim();
    const stage = String(body.stage || '').trim();
    const note = String(body.note || '').trim();

    if (!jobId) return responseError(new Error('jobId is required.'), 400);
    if (!machineId) return responseError(new Error('machineId is required.'), 400);
    if (!ALLOWED_STAGES.has(stage)) return responseError(new Error('stage must be prepress, print, finishing or dispatch.'), 400);

    const machine = DEFAULT_MACHINES.find((item) => item.id === machineId);
    if (!machine) return responseError(new Error('Selected machine was not found.'), 400);

    const jobs = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    const job = jobs.find((item) => String(item.id || '') === jobId);
    if (!job) return responseError(new Error('Production job was not found.'), 404);

    const now = new Date().toISOString();
    const routing = await readConfigItems<RoutingRecord>(request, ROUTING_KEY);
    const existing = routing.find((item) => String(item.jobId || '') === jobId);
    const historyEntry = { at: now, stage, machineId, machineName: machine.name, note, source: 'production-routing' };
    const nextAssignment: RoutingRecord = {
      ...(existing || {}),
      id: existing?.id || `route-${Date.now()}`,
      jobId,
      jobNumber: job.jobNumber || null,
      orderNumber: job.orderNumber || null,
      customer: job.customer || null,
      machineId,
      machineName: machine.name,
      machineStage: machine.stage,
      stage,
      status: 'assigned',
      assignedAt: existing?.assignedAt || now,
      updatedAt: now,
      history: [...(Array.isArray(existing?.history) ? existing.history : []), historyEntry],
    };

    const nextRouting = existing ? routing.map((item) => String(item.jobId || '') === jobId ? nextAssignment : item) : [nextAssignment, ...routing];
    await saveConfigItems(request, ROUTING_KEY, 'Storefront production routing', 'Machine and production-stage assignments for storefront production jobs.', nextRouting, 'StorefrontProductionRouting');

    const updatedJobs = jobs.map((item) => String(item.id || '') === jobId ? {
      ...item,
      routing: nextAssignment,
      assignedMachineId: machineId,
      assignedMachineName: machine.name,
      assignedProductionStage: stage,
      updatedAt: now,
      auditTrail: [...(Array.isArray(item.auditTrail) ? item.auditTrail : []), historyEntry],
    } : item);
    await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', updatedJobs, 'StorefrontProductionRouting');

    return NextResponse.json({ ok: true, source: 'internal-production-routing-db', data: { routing: nextRouting, summary: routingSummary(nextRouting), machines: DEFAULT_MACHINES }, item: nextAssignment });
  } catch (error) {
    return responseError(error);
  }
}
