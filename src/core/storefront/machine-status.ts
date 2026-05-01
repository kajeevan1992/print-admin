import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { syncPlannerFromWorkflow, updatePlannerJob } from '@/core/storefront/production-planner';

const RESOURCE = 'admin-config' as any;
export const MACHINE_STATUS_KEY = 'factory-machine-status';

type Store = Record<string, any>;

function nowIso() { return new Date().toISOString(); }

async function readStore(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), RESOURCE, MACHINE_STATUS_KEY);
    return (record as any)?.metadataJson?.store || {};
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return {};
    throw error;
  }
}

async function saveStore(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), RESOURCE, {
    id: MACHINE_STATUS_KEY,
    slug: MACHINE_STATUS_KEY,
    name: 'Factory machine status',
    description: 'Machine connector foundation and live status records.',
    metadataJson: { store, savedAt: nowIso(), source: 'MachineStatusV320' },
  } as any);
}

export async function readMachineStatus(request: Request) {
  const [planner, store] = await Promise.all([syncPlannerFromWorkflow(request), readStore(request)]);
  const manual = Array.isArray(store.machines) ? store.machines : [];
  const machines = planner.capacity.map((lane: Store) => {
    const existing = manual.find((machine: Store) => machine.laneId === lane.laneId) || {};
    return {
      id: existing.id || `machine-${lane.laneId}`,
      laneId: lane.laneId,
      name: lane.laneName,
      provider: existing.provider || 'manual-ready',
      connectorType: existing.connectorType || 'future-fiery-konica-rip',
      status: existing.status || lane.liveStatus || 'idle',
      activeJobId: lane.activeJobId || existing.activeJobId || null,
      activeOrderNumber: lane.activeOrderNumber || existing.activeOrderNumber || null,
      lastSeenAt: existing.lastSeenAt || nowIso(),
      telemetry: existing.telemetry || { sheetsPrinted: 0, impressions: 0, errorCode: null },
    };
  });
  return { machines, profiles: [{ id: 'manual', status: 'active' }, { id: 'fiery', status: 'foundation-ready' }, { id: 'konica', status: 'foundation-ready' }] };
}

export async function updateMachineStatus(request: Request, input: Store) {
  const laneId = String(input.laneId || '').trim();
  if (!laneId) throw new Error('laneId is required.');
  const current = await readMachineStatus(request);
  const machines = current.machines.map((machine: Store) => machine.laneId === laneId ? { ...machine, status: input.status || machine.status, activeJobId: input.activeJobId ?? machine.activeJobId, activeOrderNumber: input.activeOrderNumber ?? machine.activeOrderNumber, telemetry: { ...(machine.telemetry || {}), ...(input.telemetry || {}) }, lastSeenAt: nowIso() } : machine);
  await saveStore(request, { machines });
  if (input.activeJobId && input.status) {
    await updatePlannerJob(request, { jobId: input.activeJobId, action: 'live-status', liveStatus: input.status === 'running' ? 'running' : input.status === 'blocked' ? 'blocked' : 'waiting', progressPercent: input.progressPercent }).catch(() => null);
  }
  return { machines };
}
