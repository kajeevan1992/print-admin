export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const ROUTING_KEY = 'storefront-production-routing';
const SCHEDULE_KEY = 'storefront-production-schedule';
const BATCH_KEY = 'storefront-production-batches';
const TIMELINE_KEY = 'storefront-production-timeline';

type TimelineEvent = Record<string, any> & { id: string; entityId: string; eventType: string; at: string };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production timeline request failed.' }, { status });
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

function summary(events: TimelineEvent[]) {
  const byType = events.reduce<Record<string, number>>((acc, event) => {
    const key = String(event.eventType || 'event');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    total: events.length,
    jobEvents: events.filter((event) => event.entityType === 'job').length,
    batchEvents: events.filter((event) => event.entityType === 'batch').length,
    latestAt: events.map((event) => event.at).filter(Boolean).sort().reverse()[0] || null,
    byType,
  };
}

function derivedEvents(jobs: any[], routing: any[], schedule: any[], batches: any[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  jobs.forEach((job) => {
    const jobId = String(job.id || '');
    if (!jobId) return;
    events.push({
      id: `job-created-${jobId}`,
      entityType: 'job',
      entityId: jobId,
      eventType: 'job-created',
      title: `Job created ${job.jobNumber || jobId}`,
      at: String(job.createdAt || job.updatedAt || new Date().toISOString()),
      status: job.status || null,
      jobNumber: job.jobNumber || null,
      orderNumber: job.orderNumber || null,
      customer: job.customer || null,
    });
    (Array.isArray(job.auditTrail) ? job.auditTrail : []).forEach((entry: any, index: number) => {
      events.push({
        id: `job-audit-${jobId}-${index}`,
        entityType: 'job',
        entityId: jobId,
        eventType: String(entry.action || 'job-update'),
        title: `${job.jobNumber || jobId}: ${String(entry.action || 'updated')}`,
        at: String(entry.at || job.updatedAt || new Date().toISOString()),
        jobNumber: job.jobNumber || null,
        orderNumber: job.orderNumber || null,
        details: entry,
      });
    });
  });
  routing.forEach((route) => {
    events.push({
      id: `route-${route.id || route.jobId}`,
      entityType: 'job',
      entityId: String(route.jobId || route.id || ''),
      eventType: 'routing-assigned',
      title: `Routed to ${route.machineName || route.machineId || 'machine'}`,
      at: String(route.assignedAt || route.updatedAt || new Date().toISOString()),
      machineId: route.machineId || null,
      machineName: route.machineName || null,
      stage: route.stage || null,
    });
  });
  schedule.forEach((slot) => {
    events.push({
      id: `schedule-${slot.id || slot.jobId}`,
      entityType: 'job',
      entityId: String(slot.jobId || slot.id || ''),
      eventType: 'scheduled',
      title: `Scheduled ${slot.jobNumber || slot.jobId || ''}`,
      at: String(slot.scheduledStart || slot.updatedAt || new Date().toISOString()),
      scheduledStart: slot.scheduledStart || null,
      scheduledEnd: slot.scheduledEnd || null,
      durationMinutes: slot.durationMinutes || null,
      machineName: slot.machineName || null,
    });
  });
  batches.forEach((batch) => {
    const batchId = String(batch.id || '');
    if (!batchId) return;
    events.push({
      id: `batch-created-${batchId}`,
      entityType: 'batch',
      entityId: batchId,
      eventType: 'batch-created',
      title: `Batch created ${batch.batchNumber || batchId}`,
      at: String(batch.createdAt || batch.updatedAt || new Date().toISOString()),
      batchNumber: batch.batchNumber || null,
      jobCount: Array.isArray(batch.jobIds) ? batch.jobIds.length : 0,
      status: batch.status || null,
    });
    (Array.isArray(batch.history) ? batch.history : []).forEach((entry: any, index: number) => {
      events.push({
        id: `batch-history-${batchId}-${index}`,
        entityType: 'batch',
        entityId: batchId,
        eventType: String(entry.action || 'batch-update'),
        title: `${batch.batchNumber || batchId}: ${String(entry.action || 'updated')}`,
        at: String(entry.at || batch.updatedAt || new Date().toISOString()),
        batchNumber: batch.batchNumber || null,
        details: entry,
      });
    });
  });
  return events;
}

export async function GET(request: NextRequest) {
  try {
    const [jobs, routing, schedule, batches, manual] = await Promise.all([
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<any>(request, ROUTING_KEY),
      readConfigItems<any>(request, SCHEDULE_KEY),
      readConfigItems<any>(request, BATCH_KEY),
      readConfigItems<TimelineEvent>(request, TIMELINE_KEY),
    ]);
    const items = [...manual, ...derivedEvents(jobs, routing, schedule, batches)]
      .filter((event) => event.entityId && event.at)
      .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
      .slice(0, 80);
    return NextResponse.json({ ok: true, source: 'internal-production-timeline-db', data: { items, summary: summary(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const entityId = String(body.entityId || '').trim();
    const eventType = String(body.eventType || body.action || 'manual-note').trim();
    if (!entityId) return responseError(new Error('entityId is required.'), 400);
    const manual = await readConfigItems<TimelineEvent>(request, TIMELINE_KEY);
    const now = new Date().toISOString();
    const event: TimelineEvent = {
      id: `timeline-${Date.now()}`,
      entityType: String(body.entityType || 'job'),
      entityId,
      eventType,
      title: String(body.title || eventType),
      note: String(body.note || ''),
      at: now,
      source: 'production-timeline',
    };
    const nextItems = [event, ...manual].slice(0, 120);
    await saveConfigItems(request, TIMELINE_KEY, 'Storefront production timeline', 'Manual production timeline events for storefront production jobs and batches.', nextItems, 'StorefrontProductionTimeline');
    return NextResponse.json({ ok: true, source: 'internal-production-timeline-db', data: { items: nextItems, summary: summary(nextItems) }, item: event });
  } catch (error) {
    return responseError(error);
  }
}
