import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { syncWorkflowFromFinalOrders, transitionWorkflowItem } from '@/core/storefront/production-workflow';

const CONFIG_RESOURCE = 'admin-config' as any;
export const PLANNER_KEY = 'storefront-production-planner';

type Store = Record<string, any>;

type PlannerStage = 'queued' | 'prepress' | 'print' | 'finish' | 'dispatch' | 'completed' | 'blocked';

const MACHINE_LANES = [
  { id: 'lane-digital-sra3', name: 'Digital SRA3', type: 'digital', maxWidthMm: 320, supports: ['business-cards', 'leaflets', 'flyers'], stage: 'print' },
  { id: 'lane-digital-sra2', name: 'Digital SRA2', type: 'digital', maxWidthMm: 450, supports: ['leaflets', 'booklets', 'posters'], stage: 'print' },
  { id: 'lane-large-format', name: 'Large Format Roll', type: 'large-format', maxWidthMm: 1600, supports: ['banner', 'pvc-banner', 'poster'], stage: 'print' },
  { id: 'lane-finishing', name: 'Finishing', type: 'finishing', maxWidthMm: 0, supports: ['lamination', 'cutting', 'creasing', 'booklets'], stage: 'finish' },
  { id: 'lane-dispatch', name: 'Dispatch', type: 'dispatch', maxWidthMm: 0, supports: ['all'], stage: 'dispatch' },
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readRecord(request: Request) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PLANNER_KEY);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return null;
    throw error;
  }
}

export async function readPlannerStore(request: Request) {
  const record = await readRecord(request);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    jobs: Array.isArray(store.jobs) ? store.jobs : [],
    actions: Array.isArray(store.actions) ? store.actions : [],
    lanes: Array.isArray(store.lanes) ? store.lanes : MACHINE_LANES,
  };
}

export async function savePlannerStore(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: PLANNER_KEY,
    slug: PLANNER_KEY,
    name: 'Storefront production planner',
    description: 'Persistent machine planner jobs generated from paid storefront workflow items.',
    metadataJson: { store, savedAt: nowIso(), storageKey: PLANNER_KEY, source: 'StorefrontProductionPlanner' },
  } as any);
}

function productText(item: Store) {
  return `${item.productSlug || ''} ${item.productName || ''} ${item.orderNumber || ''}`.toLowerCase();
}

function laneForWorkflowItem(item: Store) {
  const text = productText(item);
  if (text.includes('banner') || text.includes('pvc')) return MACHINE_LANES[2];
  if (text.includes('booklet')) return MACHINE_LANES[1];
  if (text.includes('flyer') || text.includes('leaflet')) return MACHINE_LANES[1];
  return MACHINE_LANES[0];
}

function canCreatePlannerJob(item: Store) {
  const paid = ['captured', 'authorized'].includes(String(item.paymentStatus || '').toLowerCase());
  const preflightOk = ['pass', 'override'].includes(String(item.preflightStatus || '').toLowerCase());
  return paid && preflightOk && !item.productionBlocked;
}

function jobFromWorkflow(item: Store) {
  const lane = laneForWorkflowItem(item);
  const createdAt = nowIso();
  return {
    id: makeId('planner-job'),
    workflowId: item.id,
    orderId: item.orderId,
    orderNumber: item.orderNumber,
    customerName: item.customerName || 'Storefront Customer',
    laneId: lane.id,
    laneName: lane.name,
    stage: 'queued' as PlannerStage,
    status: 'queued-for-production',
    priority: 'standard',
    productionBlocked: false,
    paymentStatus: item.paymentStatus || 'captured',
    preflightStatus: item.preflightStatus || 'pass',
    grossTotalMinor: Number(item.grossTotalMinor || 0),
    currency: item.currency || 'GBP',
    estimatedMinutes: lane.id === 'lane-large-format' ? 45 : lane.id === 'lane-digital-sra2' ? 35 : 25,
    createdAt,
    updatedAt: createdAt,
    history: [{ at: createdAt, action: 'created-from-workflow', to: 'queued' }],
    source: 'StorefrontProductionPlanner',
  };
}

export function summarizePlanner(jobs: Store[]) {
  return {
    total: jobs.length,
    queued: jobs.filter((job) => job.stage === 'queued').length,
    prepress: jobs.filter((job) => job.stage === 'prepress').length,
    print: jobs.filter((job) => job.stage === 'print').length,
    finish: jobs.filter((job) => job.stage === 'finish').length,
    dispatch: jobs.filter((job) => job.stage === 'dispatch').length,
    completed: jobs.filter((job) => job.stage === 'completed').length,
    blocked: jobs.filter((job) => job.productionBlocked || job.stage === 'blocked').length,
  };
}

export async function syncPlannerFromWorkflow(request: Request) {
  const [planner, workflow] = await Promise.all([readPlannerStore(request), syncWorkflowFromFinalOrders(request)]);
  const existingWorkflowIds = new Set(planner.jobs.map((job: Store) => String(job.workflowId)));
  const eligible = workflow.items.filter((item: Store) => canCreatePlannerJob(item) && !existingWorkflowIds.has(String(item.id)));
  const created = eligible.map(jobFromWorkflow);
  const jobs = [...created, ...planner.jobs];
  const actions = created.map((job: Store) => ({ id: makeId('planner-action'), action: 'sync-workflow', jobId: job.id, workflowId: job.workflowId, orderId: job.orderId, at: nowIso() })).concat(planner.actions).slice(0, 300);
  if (created.length) await savePlannerStore(request, { jobs, actions, lanes: planner.lanes });
  return { jobs, actions, lanes: planner.lanes, created: created.length, summary: summarizePlanner(jobs), workflowSummary: workflow.summary };
}

function nextStage(stage: PlannerStage): PlannerStage {
  if (stage === 'queued') return 'prepress';
  if (stage === 'prepress') return 'print';
  if (stage === 'print') return 'finish';
  if (stage === 'finish') return 'dispatch';
  if (stage === 'dispatch') return 'completed';
  return stage;
}

export async function updatePlannerJob(request: Request, input: Store) {
  const planner = await readPlannerStore(request);
  const id = String(input.jobId || input.id || input.orderId || '').trim();
  const action = String(input.action || '').trim();
  if (!id) throw new Error('Planner job id or order id is required.');
  if (!action) throw new Error('Planner action is required.');

  const index = planner.jobs.findIndex((job: Store) => String(job.id) === id || String(job.orderId) === id || String(job.orderNumber) === id);
  if (index < 0) throw new Error('Planner job not found.');

  const job = planner.jobs[index];
  const from = job.stage as PlannerStage;
  let stage = from;
  let status = job.status || 'queued-for-production';
  let productionBlocked = Boolean(job.productionBlocked);
  let laneId = job.laneId;
  let laneName = job.laneName;

  if (action === 'start' || action === 'advance') {
    stage = nextStage(from);
    status = stage === 'completed' ? 'completed' : `in-${stage}`;
  }
  if (action === 'hold') { stage = 'blocked'; status = 'on-hold'; productionBlocked = true; }
  if (action === 'resume') { stage = 'queued'; status = 'queued-for-production'; productionBlocked = false; }
  if (action === 'complete') { stage = 'completed'; status = 'completed'; productionBlocked = false; }
  if (action === 'assign-lane') {
    const lane = planner.lanes.find((entry: Store) => String(entry.id) === String(input.laneId));
    if (!lane) throw new Error('Planner lane not found.');
    laneId = lane.id;
    laneName = lane.name;
    status = 'lane-assigned';
  }

  const updatedAt = nowIso();
  const updated = { ...job, stage, status, laneId, laneName, productionBlocked, updatedAt, history: [{ at: updatedAt, action, from, to: stage, note: input.note || null }, ...(Array.isArray(job.history) ? job.history : [])].slice(0, 80) };
  const jobs = [...planner.jobs];
  jobs[index] = updated;
  const actions = [{ id: makeId('planner-action'), action, jobId: updated.id, orderId: updated.orderId, from, to: stage, at: updatedAt, note: input.note || null }, ...planner.actions].slice(0, 300);
  await savePlannerStore(request, { jobs, actions, lanes: planner.lanes });

  if (action === 'start' && from === 'queued') {
    await transitionWorkflowItem(request, { workflowId: updated.workflowId, action: 'release-to-production', note: 'Planner job started.' }).catch(() => null);
  }

  return { job: updated, jobs, actions, lanes: planner.lanes, summary: summarizePlanner(jobs) };
}
