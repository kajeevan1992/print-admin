import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { syncWorkflowFromFinalOrders, transitionWorkflowItem } from '@/core/storefront/production-workflow';

const CONFIG_RESOURCE = 'admin-config' as any;
export const PLANNER_KEY = 'storefront-production-planner';

type Store = Record<string, any>;
type PlannerStage = 'queued' | 'prepress' | 'print' | 'finish' | 'dispatch' | 'completed' | 'blocked';

const MACHINE_LANES = [
  { id: 'lane-digital-sra3', name: 'Digital SRA3', type: 'digital', maxWidthMm: 320, supports: ['business-cards', 'leaflets', 'flyers'], stage: 'print', minutesPerDay: 420, makeReadyMinutes: 8, speedSheetsPerHour: 900, workStartHour: 8 },
  { id: 'lane-digital-sra2', name: 'Digital SRA2', type: 'digital', maxWidthMm: 450, supports: ['leaflets', 'booklets', 'posters'], stage: 'print', minutesPerDay: 420, makeReadyMinutes: 10, speedSheetsPerHour: 650, workStartHour: 8 },
  { id: 'lane-large-format', name: 'Large Format Roll', type: 'large-format', maxWidthMm: 1600, supports: ['banner', 'pvc-banner', 'poster'], stage: 'print', minutesPerDay: 390, makeReadyMinutes: 12, speedSheetsPerHour: 60, workStartHour: 8 },
  { id: 'lane-finishing', name: 'Finishing', type: 'finishing', maxWidthMm: 0, supports: ['lamination', 'cutting', 'creasing', 'booklets'], stage: 'finish', minutesPerDay: 390, makeReadyMinutes: 10, speedSheetsPerHour: 500, workStartHour: 8 },
  { id: 'lane-dispatch', name: 'Dispatch', type: 'dispatch', maxWidthMm: 0, supports: ['all'], stage: 'dispatch', minutesPerDay: 360, makeReadyMinutes: 5, speedSheetsPerHour: 120, workStartHour: 8 },
];

function nowIso() { return new Date().toISOString(); }
function makeId(prefix: string) { return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`; }
function asNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : fallback; }

async function readRecord(request: Request) {
  try { return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PLANNER_KEY); }
  catch (error) { const message = error instanceof Error ? error.message : ''; if (message.includes('was not found')) return null; throw error; }
}

export async function readPlannerStore(request: Request) {
  const record = await readRecord(request);
  const store = (record as any)?.metadataJson?.store || {};
  return { jobs: Array.isArray(store.jobs) ? store.jobs : [], actions: Array.isArray(store.actions) ? store.actions : [], lanes: Array.isArray(store.lanes) ? store.lanes : MACHINE_LANES, batches: Array.isArray(store.batches) ? store.batches : [], scheduleSettings: store.scheduleSettings || { mode: 'capacity-priority', includeWeekends: false } };
}

export async function savePlannerStore(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: PLANNER_KEY, slug: PLANNER_KEY, name: 'Storefront production planner', description: 'Persistent machine planner jobs generated from paid storefront workflow items.', metadataJson: { store, savedAt: nowIso(), storageKey: PLANNER_KEY, source: 'StorefrontProductionPlanner' } } as any);
}

function productText(item: Store) { return `${item.productSlug || ''} ${item.productName || ''} ${item.orderNumber || ''}`.toLowerCase(); }
function laneForWorkflowItem(item: Store) { const text = productText(item); if (text.includes('banner') || text.includes('pvc')) return MACHINE_LANES[2]; if (text.includes('booklet') || text.includes('flyer') || text.includes('leaflet')) return MACHINE_LANES[1]; return MACHINE_LANES[0]; }
function canCreatePlannerJob(item: Store) { const paid = ['captured', 'authorized'].includes(String(item.paymentStatus || '').toLowerCase()); const ok = ['pass', 'override'].includes(String(item.preflightStatus || '').toLowerCase()); return paid && ok && !item.productionBlocked; }
function quantityFromItem(item: Store) { return asNumber(item.quantity || item.payload?.quantity || item.items?.[0]?.quantity || 250, 250); }
function sra3Yield(item: Store) { const text = productText(item); if (text.includes('business')) return 21; if (text.includes('a5')) return 4; if (text.includes('a4')) return 2; return 1; }
function sheetsForJob(item: Store) { const qty = quantityFromItem(item); return Math.max(1, Math.ceil(qty / sra3Yield(item))); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function dueDateFor(item: Store) { const base = new Date(); const priority = String(item.priority || item.turnaround || item.payload?.deliveryEstimate?.service || '').toLowerCase(); const days = priority.includes('rush') || priority.includes('express') ? 1 : priority.includes('standard') ? 3 : 5; return addDays(base, days).toISOString(); }
function priorityScore(job: Store) { if (job.stage === 'blocked') return -1000; const due = new Date(job.dueAt || dueDateFor(job)).getTime(); const now = Date.now(); const dueSoon = Math.max(0, 100000000 - Math.max(0, due - now)) / 1000000; const rush = String(job.priority || '').toLowerCase() === 'rush' ? 250 : 0; const express = String(job.priority || '').toLowerCase() === 'express' ? 150 : 0; return Math.round(rush + express + dueSoon + asNumber(job.grossTotalMinor) / 100000); }

function jobFromWorkflow(item: Store) {
  const lane = laneForWorkflowItem(item); const sheets = sheetsForJob(item); const createdAt = nowIso();
  return { id: makeId('planner-job'), workflowId: item.id, orderId: item.orderId, orderNumber: item.orderNumber, customerName: item.customerName || 'Storefront Customer', laneId: lane.id, laneName: lane.name, stage: 'queued' as PlannerStage, status: 'queued-for-production', priority: item.priority || 'standard', productionBlocked: false, paymentStatus: item.paymentStatus || 'captured', preflightStatus: item.preflightStatus || 'pass', grossTotalMinor: Number(item.grossTotalMinor || 0), currency: item.currency || 'GBP', quantity: quantityFromItem(item), sra3Yield: sra3Yield(item), sra3Sheets: sheets, estimatedMinutes: Math.ceil(lane.makeReadyMinutes + (sheets / Math.max(1, lane.speedSheetsPerHour)) * 60), dueAt: dueDateFor(item), scheduleScore: 0, lateRisk: false, createdAt, updatedAt: createdAt, history: [{ at: createdAt, action: 'created-from-workflow', to: 'queued' }], source: 'StorefrontProductionPlanner' };
}

export function summarizePlanner(jobs: Store[]) { return { total: jobs.length, queued: jobs.filter((j) => j.stage === 'queued').length, prepress: jobs.filter((j) => j.stage === 'prepress').length, print: jobs.filter((j) => j.stage === 'print').length, finish: jobs.filter((j) => j.stage === 'finish').length, dispatch: jobs.filter((j) => j.stage === 'dispatch').length, completed: jobs.filter((j) => j.stage === 'completed').length, blocked: jobs.filter((j) => j.productionBlocked || j.stage === 'blocked').length, lateRisk: jobs.filter((j) => j.lateRisk).length, rush: jobs.filter((j) => String(j.priority).toLowerCase() === 'rush').length }; }
function laneById(lanes: Store[], id: string) { return lanes.find((lane) => lane.id === id) || MACHINE_LANES[0]; }
function buildCapacity(jobs: Store[], lanes: Store[]) { return lanes.map((lane) => { const laneJobs = jobs.filter((j) => j.laneId === lane.id && j.stage !== 'completed'); const used = laneJobs.reduce((sum, j) => sum + asNumber(j.estimatedMinutes), 0); const cap = asNumber(lane.minutesPerDay, 420); return { laneId: lane.id, laneName: lane.name, usedMinutes: used, capacityMinutes: cap, remainingMinutes: Math.max(0, cap - used), overloadMinutes: Math.max(0, used - cap), utilisationPercent: Math.min(160, Math.round((used / Math.max(1, cap)) * 100)), jobCount: laneJobs.length }; }); }

function workStart(lane: Store, dayOffset = 0) { const d = addDays(new Date(), dayOffset); d.setHours(asNumber(lane.workStartHour, 8), 0, 0, 0); return d; }
function sortForSchedule(jobs: Store[]) { return [...jobs].sort((a, b) => priorityScore(b) - priorityScore(a) || new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime()); }
function autoScheduleJobs(jobs: Store[], lanes: Store[]) {
  const laneCursors = new Map<string, { dayOffset: number; used: number; cursor: Date }>();
  return sortForSchedule(jobs).map((job, index) => {
    if (job.stage === 'completed') return { ...job, scheduleScore: priorityScore(job), sequence: index + 1 };
    const lane = laneById(lanes, job.laneId); const cap = asNumber(lane.minutesPerDay, 420); const mins = asNumber(job.estimatedMinutes, 20);
    let state = laneCursors.get(lane.id) || { dayOffset: 0, used: 0, cursor: workStart(lane, 0) };
    if (state.used + mins > cap) { state = { dayOffset: state.dayOffset + 1, used: 0, cursor: workStart(lane, state.dayOffset + 1) }; }
    const start = new Date(state.cursor); const end = new Date(start.getTime() + mins * 60000); const dueAt = job.dueAt || dueDateFor(job); const lateRisk = end.getTime() > new Date(dueAt).getTime();
    laneCursors.set(lane.id, { dayOffset: state.dayOffset, used: state.used + mins, cursor: end });
    return { ...job, scheduledStartAt: start.toISOString(), scheduledEndAt: end.toISOString(), dueAt, lateRisk, scheduleScore: priorityScore(job), sequence: index + 1, status: lateRisk ? 'late-risk' : job.status };
  });
}
function buildTimeline(jobs: Store[], lanes: Store[]) { return sortForSchedule(jobs).filter((j) => j.stage !== 'completed').map((job) => ({ jobId: job.id, orderNumber: job.orderNumber, laneId: job.laneId, laneName: job.laneName, stage: job.stage, startAt: job.scheduledStartAt, endAt: job.scheduledEndAt, dueAt: job.dueAt, lateRisk: job.lateRisk, minutes: asNumber(job.estimatedMinutes, 20), sequence: job.sequence })); }
function buildBatches(jobs: Store[]) { const groups = new Map<string, Store[]>(); jobs.filter((j) => j.stage !== 'completed').forEach((job) => { const key = `${job.laneId}|${job.sra3Yield || 1}|${job.preflightStatus || 'pass'}`; groups.set(key, [...(groups.get(key) || []), job]); }); return Array.from(groups.entries()).map(([key, group]) => { const [laneId] = key.split('|'); const totalSheets = group.reduce((sum, j) => sum + asNumber(j.sra3Sheets, 1), 0); return { id: `batch-${laneId}-${group.length}-${totalSheets}`, laneId, jobIds: group.map((j) => j.id), orderNumbers: group.map((j) => j.orderNumber), jobCount: group.length, totalSra3Sheets: totalSheets, suggested: group.length > 1, label: group.length > 1 ? `Batch ${group.length} jobs / ${totalSheets} SRA3 sheets` : `Single job / ${totalSheets} SRA3 sheets` }; }); }
function buildScheduleWarnings(jobs: Store[], capacity: Store[]) { return [...jobs.filter((j) => j.lateRisk).map((j) => ({ type: 'late-risk', jobId: j.id, orderNumber: j.orderNumber, message: `${j.orderNumber} is scheduled after due date.` })), ...capacity.filter((c) => c.overloadMinutes > 0).map((c) => ({ type: 'capacity-overload', laneId: c.laneId, message: `${c.laneName} is overloaded by ${c.overloadMinutes} minutes.` }))]; }
function enrich(jobsInput: Store[], lanes: Store[], actions: Store[]) { const jobs = autoScheduleJobs(jobsInput, lanes); const capacity = buildCapacity(jobs, lanes); const timeline = buildTimeline(jobs, lanes); const batches = buildBatches(jobs); const warnings = buildScheduleWarnings(jobs, capacity); return { jobs, actions, lanes, batches, capacity, timeline, warnings, summary: summarizePlanner(jobs), scheduleSettings: { mode: 'capacity-priority', generatedAt: nowIso() } }; }

export async function syncPlannerFromWorkflow(request: Request) { const [planner, workflow] = await Promise.all([readPlannerStore(request), syncWorkflowFromFinalOrders(request)]); const existing = new Set(planner.jobs.map((j: Store) => String(j.workflowId))); const created = workflow.items.filter((i: Store) => canCreatePlannerJob(i) && !existing.has(String(i.id))).map(jobFromWorkflow); const jobs = [...created, ...planner.jobs]; const actions = created.map((job: Store) => ({ id: makeId('planner-action'), action: 'sync-workflow', jobId: job.id, workflowId: job.workflowId, orderId: job.orderId, at: nowIso() })).concat(planner.actions).slice(0, 300); const result = { ...enrich(jobs, planner.lanes, actions), created: created.length, workflowSummary: workflow.summary }; if (created.length) await savePlannerStore(request, result); return result; }
function nextStage(stage: PlannerStage): PlannerStage { if (stage === 'queued') return 'prepress'; if (stage === 'prepress') return 'print'; if (stage === 'print') return 'finish'; if (stage === 'finish') return 'dispatch'; if (stage === 'dispatch') return 'completed'; return stage; }

export async function updatePlannerJob(request: Request, input: Store) {
  const planner = await readPlannerStore(request); const id = String(input.jobId || input.id || input.orderId || '').trim(); const action = String(input.action || '').trim(); if (!id && action !== 'auto-schedule') throw new Error('Planner job id or order id is required.'); if (!action) throw new Error('Planner action is required.');
  if (action === 'auto-schedule') { const result = enrich(planner.jobs, planner.lanes, [{ id: makeId('planner-action'), action: 'auto-schedule', at: nowIso() }, ...planner.actions].slice(0, 300)); await savePlannerStore(request, result); return { job: null, ...result }; }
  const index = planner.jobs.findIndex((job: Store) => String(job.id) === id || String(job.orderId) === id || String(job.orderNumber) === id); if (index < 0) throw new Error('Planner job not found.');
  const job = planner.jobs[index]; const from = job.stage as PlannerStage; let stage = from; let status = job.status || 'queued-for-production'; let productionBlocked = Boolean(job.productionBlocked); let laneId = job.laneId; let laneName = job.laneName; let priority = input.priority || job.priority; let dueAt = input.dueAt || job.dueAt;
  if (action === 'start' || action === 'advance') { stage = nextStage(from); status = stage === 'completed' ? 'completed' : `in-${stage}`; }
  if (action === 'move-stage') { stage = String(input.stage || from) as PlannerStage; status = `moved-to-${stage}`; productionBlocked = stage === 'blocked'; }
  if (action === 'hold') { stage = 'blocked'; status = 'on-hold'; productionBlocked = true; }
  if (action === 'resume') { stage = 'queued'; status = 'queued-for-production'; productionBlocked = false; }
  if (action === 'complete') { stage = 'completed'; status = 'completed'; productionBlocked = false; }
  if (action === 'set-priority') { priority = String(input.priority || 'standard'); status = `priority-${priority}`; }
  if (action === 'set-due-date') { dueAt = String(input.dueAt || dueAt || dueDateFor(job)); status = 'due-date-updated'; }
  if (action === 'assign-lane' || input.laneId) { const lane = planner.lanes.find((e: Store) => String(e.id) === String(input.laneId)); if (lane) { laneId = lane.id; laneName = lane.name; status = action === 'assign-lane' ? 'lane-assigned' : status; } }
  const updatedAt = nowIso(); const updated = { ...job, stage, status, laneId, laneName, priority, dueAt, productionBlocked, updatedAt, history: [{ at: updatedAt, action, from, to: stage, note: input.note || null }, ...(Array.isArray(job.history) ? job.history : [])].slice(0, 80) };
  const jobs = [...planner.jobs]; jobs[index] = updated; const actions = [{ id: makeId('planner-action'), action, jobId: updated.id, orderId: updated.orderId, from, to: stage, at: updatedAt, note: input.note || null }, ...planner.actions].slice(0, 300); const result = enrich(jobs, planner.lanes, actions); await savePlannerStore(request, result);
  if (action === 'start' && from === 'queued') await transitionWorkflowItem(request, { workflowId: updated.workflowId, action: 'release-to-production', note: 'Planner job started.' }).catch(() => null);
  return { job: updated, ...result };
}
