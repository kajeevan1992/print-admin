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
    highRisk: items.filter((job) => job.slaRisk === 'high').length
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
  return {
    items: store.items,
    actions: store.actions,
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
    const actions = [{ id: makeId('board-action'), action, jobId: id, at: nowIso() }, ...store.actions].slice(0, 400);
    await saveProductionBoardStore(request, { items, actions });
    return { items, actions, summary: summarizeProductionBoard(items), source: 'internal-production-board-core' };
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
  const actions = [{ id: makeId('board-action'), action: exists ? 'update' : 'create', jobId: normalized.id, orderNumber: normalized.orderNumber, at: nowIso() }, ...store.actions].slice(0, 400);

  await saveProductionBoardStore(request, { items, actions });
  return { items, actions, summary: summarizeProductionBoard(items), source: 'internal-production-board-core' };
}
