export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const ROUTING_KEY = 'storefront-production-routing';
const SCHEDULE_KEY = 'storefront-production-schedule';

type ProductionJobRecord = Record<string, any> & { id: string; jobNumber?: string; auditTrail?: any[] };
type RoutingRecord = Record<string, any> & { jobId: string; machineId?: string; machineName?: string; stage?: string };
type ScheduleRecord = Record<string, any> & { id: string; jobId: string; scheduledStart: string; scheduledEnd: string; durationMinutes: number; history?: any[] };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production schedule request failed.' }, { status });
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

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

function scheduleSummary(items: ScheduleRecord[]) {
  const now = Date.now();
  return {
    total: items.length,
    scheduledToday: items.filter((item) => new Date(item.scheduledStart).toDateString() === new Date().toDateString()).length,
    overdue: items.filter((item) => new Date(item.scheduledEnd).getTime() < now && String(item.status || '') !== 'completed').length,
    totalMinutes: items.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0),
  };
}

function estimateDurationMinutes(job: ProductionJobRecord) {
  const itemCount = Array.isArray(job.items) ? job.items.length : 1;
  const quantity = (Array.isArray(job.items) ? job.items : []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  return Math.max(30, Math.min(480, 30 + itemCount * 20 + Math.ceil(quantity / 250) * 10));
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, routing, schedule] = await Promise.all([
      readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<RoutingRecord>(request, ROUTING_KEY),
      readConfigItems<ScheduleRecord>(request, SCHEDULE_KEY),
    ]);
    const items = schedule.map((slot) => {
      const job = jobs.find((item) => String(item.id || '') === String(slot.jobId || '')) || null;
      const route = routing.find((item) => String(item.jobId || '') === String(slot.jobId || '')) || null;
      return { ...slot, job, routing: route };
    });
    return NextResponse.json({ ok: true, source: 'internal-production-schedule-db', data: { items, summary: scheduleSummary(schedule) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = String(body.jobId || '').trim();
    const scheduledStart = String(body.scheduledStart || '').trim();
    const durationMinutes = Number(body.durationMinutes || 0);
    const note = String(body.note || '').trim();

    if (!jobId) return responseError(new Error('jobId is required.'), 400);
    if (!scheduledStart || Number.isNaN(new Date(scheduledStart).getTime())) return responseError(new Error('scheduledStart must be a valid date.'), 400);

    const jobs = await readConfigItems<ProductionJobRecord>(request, PRODUCTION_FLOW_KEY);
    const job = jobs.find((item) => String(item.id || '') === jobId);
    if (!job) return responseError(new Error('Production job was not found.'), 404);

    const routing = await readConfigItems<RoutingRecord>(request, ROUTING_KEY);
    const route = routing.find((item) => String(item.jobId || '') === jobId);
    if (!route) return responseError(new Error('Assign production routing before scheduling.'), 400);

    const now = new Date().toISOString();
    const minutes = Math.max(15, Math.min(960, Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : estimateDurationMinutes(job)));
    const startIso = new Date(scheduledStart).toISOString();
    const endIso = addMinutes(startIso, minutes);
    const schedule = await readConfigItems<ScheduleRecord>(request, SCHEDULE_KEY);
    const existing = schedule.find((item) => String(item.jobId || '') === jobId);
    const historyEntry = { at: now, scheduledStart: startIso, scheduledEnd: endIso, durationMinutes: minutes, note, source: 'production-schedule' };
    const nextSlot: ScheduleRecord = {
      ...(existing || {}),
      id: existing?.id || `schedule-${Date.now()}`,
      jobId,
      jobNumber: job.jobNumber || null,
      orderNumber: job.orderNumber || null,
      customer: job.customer || null,
      machineId: route.machineId || null,
      machineName: route.machineName || null,
      stage: route.stage || null,
      scheduledStart: startIso,
      scheduledEnd: endIso,
      durationMinutes: minutes,
      status: 'scheduled',
      updatedAt: now,
      history: [...(Array.isArray(existing?.history) ? existing.history : []), historyEntry],
    };
    const nextSchedule = existing ? schedule.map((item) => String(item.jobId || '') === jobId ? nextSlot : item) : [nextSlot, ...schedule];
    await saveConfigItems(request, SCHEDULE_KEY, 'Storefront production schedule', 'Scheduled production windows for routed storefront production jobs.', nextSchedule, 'StorefrontProductionSchedule');

    const updatedJobs = jobs.map((item) => String(item.id || '') === jobId ? {
      ...item,
      schedule: nextSlot,
      scheduledStart: startIso,
      scheduledEnd: endIso,
      scheduledDurationMinutes: minutes,
      updatedAt: now,
      auditTrail: [...(Array.isArray(item.auditTrail) ? item.auditTrail : []), historyEntry],
    } : item);
    await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', updatedJobs, 'StorefrontProductionSchedule');

    return NextResponse.json({ ok: true, source: 'internal-production-schedule-db', data: { items: nextSchedule, summary: scheduleSummary(nextSchedule) }, item: nextSlot });
  } catch (error) {
    return responseError(error);
  }
}
