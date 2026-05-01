import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readFinalOrders } from '@/core/storefront/order-payment-safety';

const CONFIG_RESOURCE = 'admin-config' as any;
export const WORKFLOW_KEY = 'storefront-production-workflow';

type WorkflowStage = 'draft' | 'confirmed' | 'preflight' | 'production' | 'dispatch' | 'completed' | 'blocked';
type Store = Record<string, any>;

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
}

async function readRecord(request: Request) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, WORKFLOW_KEY);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return null;
    throw error;
  }
}

export async function readWorkflowStore(request: Request) {
  const record = await readRecord(request);
  const store = (record as any)?.metadataJson?.store || {};
  return {
    items: Array.isArray(store.items) ? store.items : [],
    actions: Array.isArray(store.actions) ? store.actions : [],
  };
}

export async function saveWorkflowStore(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: WORKFLOW_KEY,
    slug: WORKFLOW_KEY,
    name: 'Storefront production workflow',
    description: 'Persistent workflow queue generated from storefront final orders.',
    metadataJson: { store, savedAt: nowIso(), storageKey: WORKFLOW_KEY, source: 'StorefrontProductionWorkflow' },
  } as any);
}

function nextActionFor(stage: WorkflowStage, preflightStatus: string) {
  if (stage === 'draft') return 'confirm-order';
  if (stage === 'confirmed') return 'send-to-preflight';
  if (stage === 'preflight' && ['pass', 'override'].includes(preflightStatus)) return 'release-to-production';
  if (stage === 'preflight') return 'resolve-preflight';
  if (stage === 'production') return 'release-to-dispatch';
  if (stage === 'dispatch') return 'mark-completed';
  if (stage === 'blocked') return 'manager-review';
  return 'none';
}

function stageFromOrder(order: Store): WorkflowStage {
  const paid = ['authorized', 'captured'].includes(String(order.paymentStatus || '').toLowerCase());
  const locked = Boolean(order.locked);
  if (String(order.status || '').includes('fail')) return 'blocked';
  if (!paid || locked) return 'confirmed';
  return 'confirmed';
}

function itemFromOrder(order: Store) {
  const preflightStatus = String(order.preflightStatus || order.artwork?.preflightStatus || 'pending').toLowerCase();
  const stage = stageFromOrder(order);
  const productionBlocked = Boolean(order.locked) || !['pass', 'override'].includes(preflightStatus);
  const createdAt = nowIso();
  return {
    id: makeId('workflow'),
    orderId: String(order.id),
    orderNumber: String(order.orderNumber || order.quoteReference || order.id),
    customerName: String(order.customerName || order.customer?.name || order.payload?.customer?.name || 'Storefront Customer'),
    customerEmail: String(order.customerEmail || order.customer?.email || order.payload?.customer?.email || ''),
    stage,
    status: productionBlocked ? 'awaiting-production-gate' : 'ready-for-production',
    preflightStatus,
    productionBlocked,
    paymentStatus: String(order.paymentStatus || ''),
    grossTotalMinor: Number(order.grossTotalMinor || order.totals?.grossTotalMinor || 0),
    currency: String(order.currency || order.totals?.currency || 'GBP'),
    nextAction: nextActionFor(stage, preflightStatus),
    updatedAt: createdAt,
    createdAt,
    history: [{ at: createdAt, action: 'created-from-final-order', to: stage, note: 'Workflow created from storefront final order.' }],
    source: 'StorefrontProductionWorkflow',
  };
}

export function summarizeWorkflow(items: Store[]) {
  return {
    total: items.length,
    draft: items.filter((item) => item.stage === 'draft').length,
    confirmed: items.filter((item) => item.stage === 'confirmed').length,
    preflight: items.filter((item) => item.stage === 'preflight').length,
    production: items.filter((item) => item.stage === 'production').length,
    dispatch: items.filter((item) => item.stage === 'dispatch').length,
    completed: items.filter((item) => item.stage === 'completed').length,
    blocked: items.filter((item) => item.productionBlocked || item.stage === 'blocked').length,
  };
}

export async function syncWorkflowFromFinalOrders(request: Request) {
  const [store, orders] = await Promise.all([readWorkflowStore(request), readFinalOrders(request)]);
  const existingOrderIds = new Set(store.items.map((item: Store) => String(item.orderId)));
  const newItems = orders.filter((order: Store) => order.id && !existingOrderIds.has(String(order.id))).map(itemFromOrder);
  const items = [...newItems, ...store.items];
  const actions = newItems.map((item: Store) => ({ id: makeId('workflow-action'), action: 'sync-final-order', workflowId: item.id, orderId: item.orderId, at: nowIso() })).concat(store.actions).slice(0, 200);
  if (newItems.length) await saveWorkflowStore(request, { items, actions });
  return { items, actions, created: newItems.length, summary: summarizeWorkflow(items) };
}

export async function transitionWorkflowItem(request: Request, input: Store) {
  const store = await readWorkflowStore(request);
  const id = String(input.workflowId || input.id || input.orderId || '').trim();
  const action = String(input.action || '').trim();
  const note = String(input.note || '').trim() || undefined;
  if (!id) throw new Error('Workflow id or order id is required.');
  if (!action) throw new Error('Workflow action is required.');

  const index = store.items.findIndex((item: Store) => String(item.id) === id || String(item.orderId) === id);
  if (index < 0) throw new Error('Workflow item not found.');

  const item = store.items[index];
  const from = item.stage;
  let stage = item.stage as WorkflowStage;
  let status = String(item.status || '');
  let preflightStatus = String(item.preflightStatus || 'pending');
  let productionBlocked = Boolean(item.productionBlocked);

  if (action === 'confirm-order') { stage = 'confirmed'; status = 'order-confirmed'; }
  if (action === 'send-to-preflight') { stage = 'preflight'; status = 'awaiting-preflight'; preflightStatus = 'pending'; productionBlocked = true; }
  if (action === 'mark-preflight-pass') { stage = 'preflight'; status = 'preflight-passed'; preflightStatus = 'pass'; productionBlocked = false; }
  if (action === 'mark-preflight-fail') { stage = 'blocked'; status = 'preflight-failed'; preflightStatus = 'fail'; productionBlocked = true; }
  if (action === 'override-preflight') { stage = 'preflight'; status = 'preflight-override-approved'; preflightStatus = 'override'; productionBlocked = false; }
  if (action === 'release-to-production') {
    if (productionBlocked && !['pass', 'override'].includes(preflightStatus)) {
      status = 'blocked-preflight-required';
    } else {
      stage = 'production'; status = 'in-production'; productionBlocked = false;
    }
  }
  if (action === 'release-to-dispatch') { stage = 'dispatch'; status = 'ready-for-dispatch'; }
  if (action === 'mark-completed') { stage = 'completed'; status = 'completed'; }

  const updatedAt = nowIso();
  const updated = { ...item, stage, status, preflightStatus, productionBlocked, nextAction: nextActionFor(stage, preflightStatus), updatedAt, history: [{ at: updatedAt, action, from, to: stage, note }, ...(Array.isArray(item.history) ? item.history : [])].slice(0, 50) };
  const items = [...store.items];
  items[index] = updated;
  const actions = [{ id: makeId('workflow-action'), action, workflowId: updated.id, orderId: updated.orderId, at: updatedAt, note }, ...store.actions].slice(0, 200);
  await saveWorkflowStore(request, { items, actions });
  return { item: updated, items, actions, summary: summarizeWorkflow(items) };
}
