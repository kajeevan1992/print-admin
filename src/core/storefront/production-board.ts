import { productionJobsMock, type ProductionJob } from '@/data/operations';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readPlannerStore } from '@/core/storefront/production-planner';

const CONFIG_RESOURCE = 'admin-config' as any;
export const PRODUCTION_BOARD_KEY = 'storefront-production-board';

type Store = Record<string, any>;
type BoardStore = {
  items: ProductionJob[];
  actions: Store[];
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readRecord(request: Request) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PRODUCTION_BOARD_KEY);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return null;
    throw error;
  }
}

function stageFromPlanner(stage: string): ProductionJob['stage'] {
  if (stage === 'prepress') return 'proofing';
  if (stage === 'print') return 'printing';
  if (stage === 'finish') return 'finishing';
  if (stage === 'dispatch' || stage === 'completed') return 'shipped';
  return 'queued';
}

function handoffFromPlanner(stage: string, blocked?: boolean): ProductionJob['handoffState'] {
  if (blocked || stage === 'blocked') return 'blocked';
  if (stage === 'prepress') return 'ready-for-print';
  if (stage === 'print') return 'printing';
  if (stage === 'finish') return 'finishing';
  if (stage === 'dispatch') return 'ready-to-dispatch';
  if (stage === 'completed') return 'dispatched';
  return 'needs-artwork';
}

function dateOnly(value?: string) {
  if (!value) return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function plannerJobToBoardJob(job: Store): ProductionJob {
  return {
    id: `board-${job.id}`,
    orderNumber: String(job.orderNumber || 'ORDER'),
    customer: String(job.customerName || 'Storefront Customer'),
    product: String(job.productName || job.productSlug || 'Print job'),
    plant: String(job.plant || 'Main Production'),
    stage: stageFromPlanner(String(job.stage || 'queued')),
    slaRisk: job.lateRisk || job.productionBlocked ? 'high' : String(job.priority || '').toLowerCase() === 'rush' ? 'high' : 'medium',
    dueDate: dateOnly(job.dueAt),
    artworkStatus: ['pass', 'override'].includes(String(job.preflightStatus || '').toLowerCase()) ? 'approved' : 'preflight-review',
    preflightStatus: (job.preflightStatus || 'pending') as ProductionJob['preflightStatus'],
    assignedOperator: String(job.assignedOperator || 'Unassigned'),
    machineName: String(job.laneName || 'Unassigned'),
    priority: String(job.priority || 'standard').toLowerCase() === 'rush' ? 'rush' : 'standard',
    productionNotes: String(job.status || 'Synced from internal production planner.'),
    dispatchMethod: 'courier',
    handoffState: handoffFromPlanner(String(job.stage || 'queued'), Boolean(job.productionBlocked))
  };
}

async function fallbackFromPlannerOrSeed(request: Request): Promise<ProductionJob[]> {
  try {
    const planner = await readPlannerStore(request);
    const jobs = Array.isArray(planner.jobs) ? planner.jobs : [];
    if (jobs.length) return jobs.map(plannerJobToBoardJob);
  } catch {
    // Seed data is the safe fallback when planner/core storage is empty or unavailable.
  }
  return productionJobsMock;
}

function eventLabel(action: string) {
  if (action === 'create') return 'Job created';
  if (action === 'update') return 'Job updated';
  if (action === 'delete') return 'Job deleted';
  if (action === 'advance') return 'Job advanced';
  if (action === 'sync-planner') return 'Planner sync';
  return action.replace(/-/g, ' ');
}

function buildSystemEvents(items: ProductionJob[]) {
  return items.flatMap((job) => {
    const events: Store[] = [];
    if (job.preflightStatus === 'fail') {
      events.push({ id: `system-preflight-${job.id}`, type: 'preflight', severity: 'critical', jobId: job.id, orderNumber: job.orderNumber, title: 'Preflight failed', message: `${job.orderNumber} is blocked until artwork/preflight is fixed.`, at: nowIso(), source: 'production-board' });
    }
    if (job.handoffState === 'ready-to-dispatch' || job.stage === 'shipped') {
      events.push({ id: `system-dispatch-${job.id}`, type: 'dispatch', severity: 'success', jobId: job.id, orderNumber: job.orderNumber, title: 'Dispatch checkpoint ready', message: `${job.orderNumber} is ready for ${String(job.dispatchMethod || 'dispatch').replace(/-/g, ' ')}.`, at: nowIso(), source: 'production-board' });
    }
    if (job.priority === 'rush' || job.slaRisk === 'high') {
      events.push({ id: `system-risk-${job.id}`, type: 'sla', severity: job.slaRisk === 'high' ? 'warning' : 'info', jobId: job.id, orderNumber: job.orderNumber, title: 'SLA attention needed', message: `${job.orderNumber} is ${job.priority === 'rush' ? 'rush priority' : 'high risk'}.`, at: nowIso(), source: 'production-board' });
    }
    return events;
  });
}

function buildPlannerEvents(planner: Store) {
  const actions = Array.isArray(planner.actions) ? planner.actions : [];
  const liveEvents = Array.isArray(planner.liveEvents) ? planner.liveEvents : [];
  return [...liveEvents, ...actions].slice(0, 80).map((event) => ({
    id: `planner-${event.id || makeId('event')}`,
    type: 'planner',
    severity: event.action === 'hold' || event.liveStatus === 'blocked' ? 'warning' : 'info',
    jobId: event.jobId || null,
    orderNumber: event.orderNumber || null,
    title: event.action ? eventLabel(String(event.action)) : 'Planner live event',
    message: event.note || event.liveStatus || event.orderNumber || 'Planner event recorded.',
    at: event.at || nowIso(),
    source: 'production-planner'
  }));
}

async function buildUnifiedTimeline(request: Request, items: ProductionJob[], actions: Store[]) {
  let plannerEvents: Store[] = [];
  try {
    const planner = await readPlannerStore(request);
    plannerEvents = buildPlannerEvents(planner);
  } catch {
    plannerEvents = [];
  }

  const boardEvents = actions.map((action) => ({
    id: action.id || makeId('board-event'),
    type: 'board',
    severity: action.action === 'delete' ? 'warning' : 'info',
    jobId: action.jobId || null,
    orderNumber: action.orderNumber || null,
    title: eventLabel(String(action.action || 'update')),
    message: action.note || `${action.orderNumber || action.jobId || 'Job'} changed on production board.`,
    at: action.at || nowIso(),
    source: 'production-board'
  }));

  return [...buildSystemEvents(items), ...boardEvents, ...plannerEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 120);
}

export function summarizeProductionBoard(items: ProductionJob[]) {
  return {
    total: items.length,
    queued: items.filter((job) => job.stage === 'queued').length,
    proofing: items.filter((job) => job.stage === 'proofing').length,
    printing: items.filter((job) => job.stage === 'printing').length,
    finishing: items.filter((job) => job.stage === 'finishing').length,
    shipped: items.filter((job) => job.stage === 'shipped').length,
    blocked: items.filter((job) => job.handoffState === 'blocked' || job.preflightStatus === 'fail').length,
    readyToDispatch: items.filter((job) => job.handoffState === 'ready-to-dispatch' || job.stage === 'shipped').length,
    highRisk: items.filter((job) => job.slaRisk === 'high').length,
    liveEvents: items.filter((job) => job.handoffState === 'blocked' || job.preflightStatus === 'fail' || job.handoffState === 'ready-to-dispatch' || job.stage === 'shipped').length
  };
}

export async function readProductionBoardStore(request: Request): Promise<BoardStore> {
  const record = await readRecord(request);
  const store = (record as any)?.metadataJson?.store || {};
  const seededItems = await fallbackFromPlannerOrSeed(request);
  return {
    items: Array.isArray(store.items) && store.items.length ? store.items : seededItems,
    actions: Array.isArray(store.actions) ? store.actions : []
  };
}

export async function saveProductionBoardStore(request: Request, store: BoardStore) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: PRODUCTION_BOARD_KEY,
    slug: PRODUCTION_BOARD_KEY,
    name: 'Storefront production board',
    description: 'Persistent production workflow board for artwork, preflight, operator handoff and dispatch state.',
    metadataJson: {
      store,
      savedAt: nowIso(),
      storageKey: PRODUCTION_BOARD_KEY,
      source: 'StorefrontProductionBoard'
    }
  } as any);
}

export async function getProductionBoard(request: Request) {
  const store = await readProductionBoardStore(request);
  const timeline = await buildUnifiedTimeline(request, store.items, store.actions);
  return {
    items: store.items,
    actions: store.actions,
    timeline,
    summary: summarizeProductionBoard(store.items),
    source: 'internal-production-board-core',
    storageKey: PRODUCTION_BOARD_KEY
  };
}

export async function updateProductionBoard(request: Request, input: Store) {
  const store = await readProductionBoardStore(request);
  const action = String(input.action || 'upsert');
  const id = String(input.id || input.job?.id || '').trim();

  if (action === 'delete') {
    if (!id) throw new Error('Production job id is required.');
    const items = store.items.filter((job) => job.id !== id);
    const actions = [{ id: makeId('board-action'), action, jobId: id, at: nowIso(), note: input.note || 'Deleted from production board.' }, ...store.actions].slice(0, 400);
    await saveProductionBoardStore(request, { items, actions });
    const timeline = await buildUnifiedTimeline(request, items, actions);
    return { items, actions, timeline, summary: summarizeProductionBoard(items), source: 'internal-production-board-core' };
  }

  const incoming = (input.job || input) as ProductionJob;
  if (!incoming?.id) throw new Error('Production job payload with id is required.');

  const normalized: ProductionJob = {
    ...incoming,
    customer: incoming.customer || 'Customer not set',
    artworkStatus: incoming.artworkStatus || 'missing',
    preflightStatus: incoming.preflightStatus || 'pending',
    assignedOperator: incoming.assignedOperator || 'Unassigned',
    machineName: incoming.machineName || 'Unassigned',
    priority: incoming.priority || 'standard',
    productionNotes: incoming.productionNotes || '',
    dispatchMethod: incoming.dispatchMethod || 'collection',
    handoffState: incoming.handoffState || 'needs-artwork'
  };

  const exists = store.items.some((job) => job.id === normalized.id);
  const items = exists ? store.items.map((job) => job.id === normalized.id ? normalized : job) : [normalized, ...store.items];
  const actions = [{ id: makeId('board-action'), action: exists ? 'update' : 'create', jobId: normalized.id, orderNumber: normalized.orderNumber, at: nowIso(), note: input.note || normalized.productionNotes || null }, ...store.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items, actions });
  const timeline = await buildUnifiedTimeline(request, items, actions);
  return { items, actions, timeline, summary: summarizeProductionBoard(items), source: 'internal-production-board-core' };
}
