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

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isToday(value?: string) {
  if (!value) return false;
  const a = new Date(value);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  if (action === 'handover-note') return 'Shift handover note';
  if (action === 'machine-downtime') return 'Machine downtime';
  if (action === 'dispatch-scan') return 'Dispatch scan';
  if (action === 'dispatch-manifest') return 'Dispatch manifest';
  if (action === 'sla-checkpoint') return 'SLA checkpoint';
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

function downtimeMinutesForLane(planner: Store, laneId: string) {
  const downtime = Array.isArray(planner.downtime) ? planner.downtime : [];
  return downtime
    .filter((item) => String(item.laneId) === laneId && item.active !== false)
    .reduce((sum, item) => sum + asNumber(item.minutes, 0), 0);
}

function buildMachineStatus(planner: Store, boardItems: ProductionJob[]) {
  const lanes = Array.isArray(planner.lanes) ? planner.lanes : [];
  const jobs = Array.isArray(planner.jobs) ? planner.jobs : [];
  return lanes.map((lane) => {
    const laneJobs = jobs.filter((job) => String(job.laneId) === String(lane.id) && job.stage !== 'completed');
    const running = laneJobs.find((job) => ['prepress', 'print', 'finish', 'dispatch'].includes(String(job.stage)) && !job.productionBlocked);
    const blocked = laneJobs.find((job) => job.productionBlocked || job.stage === 'blocked');
    const usedMinutes = laneJobs.reduce((sum, job) => sum + asNumber(job.estimatedMinutes, 0), 0);
    const downtimeMinutes = downtimeMinutesForLane(planner, String(lane.id));
    const capacityMinutes = Math.max(30, asNumber(lane.minutesPerDay, 420) - downtimeMinutes);
    const matchingBoardJobs = boardItems.filter((job) => job.machineName === lane.name || job.plant === lane.name);
    const status = blocked ? 'blocked' : running ? 'running' : downtimeMinutes > 0 ? 'downtime' : 'idle';
    return {
      id: lane.id,
      name: lane.name,
      type: lane.type || 'machine',
      status,
      liveStatus: status,
      activeJobId: running?.id || blocked?.id || null,
      activeOrderNumber: running?.orderNumber || blocked?.orderNumber || null,
      usedMinutes,
      capacityMinutes,
      downtimeMinutes,
      remainingMinutes: Math.max(0, capacityMinutes - usedMinutes),
      utilisationPercent: Math.min(180, Math.round((usedMinutes / Math.max(1, capacityMinutes)) * 100)),
      queueCount: laneJobs.length + matchingBoardJobs.length,
      workStartHour: lane.workStartHour || 8,
      maxWidthMm: lane.maxWidthMm || 0,
      source: 'production-planner-lanes'
    };
  });
}

function buildShiftHandover(planner: Store, boardItems: ProductionJob[], actions: Store[]) {
  const shifts = Array.isArray(planner.shifts) ? planner.shifts : [];
  const enabledShifts = shifts.filter((shift) => shift.enabled !== false);
  const notes = actions
    .filter((action) => ['handover-note', 'update', 'machine-downtime', 'dispatch-scan', 'dispatch-manifest'].includes(String(action.action)))
    .slice(0, 30)
    .map((action) => ({
      id: action.id || makeId('handover'),
      at: action.at || nowIso(),
      title: eventLabel(String(action.action || 'update')),
      note: action.note || action.orderNumber || action.jobId || 'Production handover update.',
      orderNumber: action.orderNumber || null,
      jobId: action.jobId || null,
      source: 'production-board-actions'
    }));

  return {
    currentShift: enabledShifts[0] || null,
    nextShift: enabledShifts[1] || null,
    openBlockedJobs: boardItems.filter((job) => job.handoffState === 'blocked' || job.preflightStatus === 'fail').length,
    readyForDispatch: boardItems.filter((job) => job.handoffState === 'ready-to-dispatch' || job.stage === 'shipped').length,
    rushJobs: boardItems.filter((job) => job.priority === 'rush').length,
    notes,
    source: 'production-board-actions-and-planner-shifts'
  };
}

function minutesUntilDue(job: ProductionJob) {
  if (!job.dueDate) return null;
  const due = new Date(job.dueDate);
  due.setHours(17, 0, 0, 0);
  return Math.round((due.getTime() - Date.now()) / 60000);
}

function buildSlaCountdowns(items: ProductionJob[]) {
  return items
    .filter((job) => job.stage !== 'shipped')
    .map((job) => {
      const minutes = minutesUntilDue(job);
      return {
        jobId: job.id,
        orderNumber: job.orderNumber,
        customer: job.customer || 'Customer not set',
        priority: job.priority || 'standard',
        slaRisk: job.slaRisk,
        dueDate: job.dueDate,
        minutesRemaining: minutes,
        overdue: typeof minutes === 'number' ? minutes < 0 : false,
        status: typeof minutes !== 'number' ? 'unknown' : minutes < 0 ? 'overdue' : minutes <= 240 ? 'critical' : minutes <= 1440 ? 'watch' : 'healthy'
      };
    })
    .sort((a, b) => asNumber(a.minutesRemaining, 999999) - asNumber(b.minutesRemaining, 999999))
    .slice(0, 20);
}

function buildDispatchCenter(items: ProductionJob[], actions: Store[]) {
  const scanEvents = actions.filter((action) => action.action === 'dispatch-scan');
  const manifestEvents = actions.filter((action) => action.action === 'dispatch-manifest');
  const readyJobs = items.filter((job) => job.handoffState === 'ready-to-dispatch' || job.stage === 'shipped');
  const scannedOrders = new Set(scanEvents.map((event) => String(event.orderNumber || '').toLowerCase()).filter(Boolean));
  const methods = Array.from(new Set(items.map((job) => job.dispatchMethod || 'collection')));
  const manifests = methods.map((method) => {
    const jobs = readyJobs.filter((job) => (job.dispatchMethod || 'collection') === method);
    return {
      id: `manifest-${method}`,
      method,
      jobCount: jobs.length,
      scannedCount: jobs.filter((job) => scannedOrders.has(job.orderNumber.toLowerCase())).length,
      orders: jobs.map((job) => job.orderNumber),
      lastGeneratedAt: manifestEvents.find((event) => event.dispatchMethod === method)?.at || null
    };
  });

  return {
    readyJobs: readyJobs.length,
    pendingScan: readyJobs.filter((job) => !scannedOrders.has(job.orderNumber.toLowerCase())).length,
    scannedToday: scanEvents.filter((event) => isToday(event.at)).length,
    totalScanned: scanEvents.length,
    manifests,
    recentScans: scanEvents.slice(0, 20).map((event) => ({
      id: event.id,
      at: event.at,
      orderNumber: event.orderNumber,
      jobId: event.jobId,
      operator: event.operator || 'Unknown operator',
      checkpoint: event.checkpoint || 'dispatch',
      dispatchMethod: event.dispatchMethod || null,
      note: event.note || 'Dispatch scan recorded.'
    })),
    source: 'production-board-dispatch-actions'
  };
}

function buildProductionKpis(items: ProductionJob[], machineStatus: Store[], actions: Store[], dispatchCenter: Store, slaCountdowns: Store[]) {
  const complete = items.filter((job) => job.stage === 'shipped').length;
  const blocked = items.filter((job) => job.handoffState === 'blocked' || job.preflightStatus === 'fail').length;
  const overdue = slaCountdowns.filter((job) => job.overdue).length;
  const avgUtilisation = machineStatus.length ? Math.round(machineStatus.reduce((sum, machine) => sum + asNumber(machine.utilisationPercent, 0), 0) / machineStatus.length) : 0;
  const totalDowntime = machineStatus.reduce((sum, machine) => sum + asNumber(machine.downtimeMinutes, 0), 0);
  const dispatchCompletionPercent = dispatchCenter.readyJobs ? Math.round((asNumber(dispatchCenter.totalScanned, 0) / Math.max(1, asNumber(dispatchCenter.readyJobs, 0))) * 100) : 0;
  return {
    totalJobs: items.length,
    completedJobs: complete,
    completionPercent: Math.round((complete / Math.max(1, items.length)) * 100),
    blockedJobs: blocked,
    blockedPercent: Math.round((blocked / Math.max(1, items.length)) * 100),
    overdueJobs: overdue,
    rushJobs: items.filter((job) => job.priority === 'rush').length,
    highRiskJobs: items.filter((job) => job.slaRisk === 'high').length,
    readyToDispatch: asNumber(dispatchCenter.readyJobs, 0),
    pendingDispatchScan: asNumber(dispatchCenter.pendingScan, 0),
    dispatchScannedToday: asNumber(dispatchCenter.scannedToday, 0),
    dispatchCompletionPercent,
    averageMachineUtilisation: avgUtilisation,
    machinesRunning: machineStatus.filter((machine) => machine.status === 'running').length,
    machinesBlocked: machineStatus.filter((machine) => machine.status === 'blocked' || machine.status === 'downtime').length,
    totalDowntimeMinutes: totalDowntime,
    actionsToday: actions.filter((action) => isToday(action.at)).length,
    source: 'internal-production-kpi-engine'
  };
}

async function readPlannerSnapshot(request: Request) {
  try {
    return await readPlannerStore(request);
  } catch {
    return { lanes: [], jobs: [], actions: [], liveEvents: [], downtime: [], shifts: [] } as Store;
  }
}

async function buildUnifiedTimeline(request: Request, items: ProductionJob[], actions: Store[], plannerSnapshot?: Store) {
  let plannerEvents: Store[] = [];
  try {
    const planner = plannerSnapshot || await readPlannerStore(request);
    plannerEvents = buildPlannerEvents(planner);
  } catch {
    plannerEvents = [];
  }

  const boardEvents = actions.map((action) => ({
    id: action.id || makeId('board-event'),
    type: 'board',
    severity: ['delete', 'machine-downtime'].includes(String(action.action)) ? 'warning' : action.action === 'dispatch-scan' ? 'success' : 'info',
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

async function buildBoardResponse(request: Request, store: BoardStore) {
  const planner = await readPlannerSnapshot(request);
  const timeline = await buildUnifiedTimeline(request, store.items, store.actions, planner);
  const machineStatus = buildMachineStatus(planner, store.items);
  const shiftHandover = buildShiftHandover(planner, store.items, store.actions);
  const dispatchCenter = buildDispatchCenter(store.items, store.actions);
  const slaCountdowns = buildSlaCountdowns(store.items);
  const productionKpis = buildProductionKpis(store.items, machineStatus, store.actions, dispatchCenter, slaCountdowns);
  return {
    items: store.items,
    actions: store.actions,
    timeline,
    machineStatus,
    shiftHandover,
    dispatchCenter,
    slaCountdowns,
    productionKpis,
    summary: {
      ...summarizeProductionBoard(store.items),
      machinesRunning: machineStatus.filter((machine) => machine.status === 'running').length,
      machinesBlocked: machineStatus.filter((machine) => machine.status === 'blocked' || machine.status === 'downtime').length,
      handoverNotes: shiftHandover.notes.length,
      pendingDispatchScan: dispatchCenter.pendingScan,
      dispatchScannedToday: dispatchCenter.scannedToday,
      overdueJobs: productionKpis.overdueJobs,
      averageMachineUtilisation: productionKpis.averageMachineUtilisation
    },
    source: 'internal-production-board-core',
    storageKey: PRODUCTION_BOARD_KEY
  };
}

export async function getProductionBoard(request: Request) {
  const store = await readProductionBoardStore(request);
  return buildBoardResponse(request, store);
}

export async function updateProductionBoard(request: Request, input: Store) {
  const store = await readProductionBoardStore(request);
  const action = String(input.action || 'upsert');
  const id = String(input.id || input.job?.id || '').trim();

  if (action === 'delete') {
    if (!id) throw new Error('Production job id is required.');
    const items = store.items.filter((job) => job.id !== id);
    const actions = [{ id: makeId('board-action'), action, jobId: id, at: nowIso(), note: input.note || 'Deleted from production board.' }, ...store.actions].slice(0, 400);
    const nextStore = { items, actions };
    await saveProductionBoardStore(request, nextStore);
    return buildBoardResponse(request, nextStore);
  }

  if (action === 'handover-note' || action === 'machine-downtime' || action === 'dispatch-manifest' || action === 'sla-checkpoint') {
    const actions = [{ id: makeId('board-action'), action, jobId: input.jobId || null, orderNumber: input.orderNumber || null, at: nowIso(), note: input.note || input.reason || 'Production operations update.', laneId: input.laneId || null, dispatchMethod: input.dispatchMethod || null, operator: input.operator || null, checkpoint: input.checkpoint || null }, ...store.actions].slice(0, 400);
    const nextStore = { items: store.items, actions };
    await saveProductionBoardStore(request, nextStore);
    return buildBoardResponse(request, nextStore);
  }

  if (action === 'dispatch-scan') {
    const scanCode = String(input.scanCode || input.orderNumber || input.jobId || '').trim().toLowerCase();
    if (!scanCode) throw new Error('Dispatch scan code, order number, or job id is required.');
    const index = store.items.findIndex((job) => job.id.toLowerCase() === scanCode || job.orderNumber.toLowerCase() === scanCode);
    if (index < 0) throw new Error('No production job matched this dispatch scan.');
    const matched = store.items[index];
    const updated: ProductionJob = { ...matched, stage: 'shipped', handoffState: 'dispatched', productionNotes: input.note || matched.productionNotes || 'Dispatch scan completed.' };
    const items = [...store.items];
    items[index] = updated;
    const actions = [{ id: makeId('board-action'), action, jobId: updated.id, orderNumber: updated.orderNumber, at: nowIso(), note: input.note || 'Dispatch scan completed.', operator: input.operator || null, checkpoint: input.checkpoint || 'dispatch', dispatchMethod: updated.dispatchMethod || input.dispatchMethod || null }, ...store.actions].slice(0, 400);
    const nextStore = { items, actions };
    await saveProductionBoardStore(request, nextStore);
    return buildBoardResponse(request, nextStore);
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
  const nextStore = { items, actions };

  await saveProductionBoardStore(request, nextStore);
  return buildBoardResponse(request, nextStore);
}
