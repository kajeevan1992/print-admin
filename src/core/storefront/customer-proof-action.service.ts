import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { getOrder } from '@/core/orders/orders.service';
import { readPlannerStore, savePlannerStore } from '@/core/storefront/production-planner';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';
const REVISIONS_KEY = 'customer-proof-revisions-v377';

type Store = Record<string, any>;

function nowIso() { return new Date().toISOString(); }
function text(value: unknown) { return String(value || '').trim(); }
function readItems(record: any) { const json = record?.metadataJson || {}; if (Array.isArray(json.items)) return json.items as Store[]; if (Array.isArray(json.store?.items)) return json.store.items as Store[]; return []; }
async function readConfigItems(request: Request, key: string) {
  try { return readItems(await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key)); }
  catch (error) { const message = error instanceof Error ? error.message : ''; if (message.includes('was not found')) return []; throw error; }
}
async function writeConfigItems(request: Request, key: string, title: string, items: Store[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: key, slug: key, name: title, title, description: title, metadataJson: { items, values: { count: String(items.length), savedAt: nowIso(), source: 'customer-proof-action' } } } as any);
}
function matchTicket(ticket: Store, order: Store) { const keys = [order.id, order.orderNumber, ...(Array.isArray(order.artworkUploadIds) ? order.artworkUploadIds : [])].filter(Boolean).map(String); return keys.some((key) => [ticket.id, ticket.orderId, ticket.orderNumber, ticket.artworkUploadId].filter(Boolean).map(String).includes(key)); }
function plannerMatches(job: Store, ticket: Store, order: Store) { const keys = [ticket.id, ticket.orderId, ticket.orderNumber, order.id, order.orderNumber].filter(Boolean).map(String); return keys.some((key) => [job.productionTicketId, job.orderId, job.orderNumber, job.workflowId, job.id].filter(Boolean).map(String).includes(key) || String(job.workflowId || '') === `ticket-${key}`); }
function canApprove(ticket: Store) { const status = text(ticket.preflightStatus || ticket.artworkStatus).toLowerCase(); return !['fail', 'failed', 'blocked', 'preflight-fail', 'replacement-requested'].includes(status); }
function approvalPatch(action: string, note: string, actorEmail: string) {
  if (action === 'approve') return { artworkStatus: 'approved', customerProofStatus: 'approved', handoffState: 'ready-for-print', status: 'ready-to-print', proofApprovedAt: nowIso(), proofApprovedBy: actorEmail, productionNotes: note || 'Customer approved proof for print.' };
  return { artworkStatus: 'changes-requested', customerProofStatus: 'revision-requested', handoffState: 'blocked', status: 'blocked', proofRevisionRequestedAt: nowIso(), proofRevisionRequestedBy: actorEmail, productionNotes: note || 'Customer requested proof changes.' };
}
async function syncPlannerTicketState(request: Request, ticket: Store, order: Store, action: string, note: string) {
  const planner = await readPlannerStore(request).catch(() => null);
  if (!planner) return null;
  const released = action === 'approve';
  let changed = false;
  const updatedJobs = planner.jobs.map((job: Store) => {
    if (!plannerMatches(job, ticket, order)) return job;
    changed = true;
    const at = nowIso();
    return {
      ...job,
      stage: released && job.stage === 'blocked' ? 'queued' : released ? job.stage : 'blocked',
      status: released ? 'queued-for-production' : 'blocked-artwork-revision',
      productionBlocked: !released,
      blockReason: released ? '' : note || 'Customer requested proof changes.',
      artworkStatus: released ? 'approved' : 'changes-requested',
      customerProofStatus: released ? 'approved' : 'revision-requested',
      handoffState: released ? 'ready-for-print' : 'blocked',
      liveStatus: released ? 'waiting' : 'blocked',
      updatedAt: at,
      history: [{ at, action: released ? 'customer-proof-approved' : 'customer-revision-requested', from: job.stage, to: released ? 'queued' : 'blocked', note: note || null }, ...(Array.isArray(job.history) ? job.history : [])].slice(0, 100),
    };
  });
  if (!changed) return null;
  await savePlannerStore(request, { ...planner, jobs: updatedJobs, actions: [{ id: `planner-action-${Date.now()}`, action: released ? 'customer-proof-approved' : 'customer-revision-requested', orderId: order.id, orderNumber: order.orderNumber, productionTicketId: ticket.id, at: nowIso(), note }, ...planner.actions].slice(0, 400) });
  return { updated: true };
}
async function addRevision(request: Request, ticket: Store, order: Store, action: string, note: string, actorEmail: string) {
  const revisions = await readConfigItems(request, REVISIONS_KEY).catch(() => []);
  const item = { id: `rev-${Date.now()}`, orderNumber: order.orderNumber, productionTicketId: ticket.id, action: action === 'approve' ? 'approved' : 'revision-requested', customer: order.customerName || ticket.customerName || 'Customer', customerEmail: actorEmail, comment: note || (action === 'approve' ? 'Customer approved proof.' : 'Customer requested changes.'), timestamp: nowIso(), version: revisions.filter((row) => row.orderNumber === order.orderNumber).length + 1, source: 'customer-proof-action' };
  await writeConfigItems(request, REVISIONS_KEY, 'Customer Proof Revisions', [item, ...revisions]);
  return item;
}

export async function submitCustomerProofAction(request: Request, input: Store) {
  const orderId = text(input.orderId || input.orderNumber);
  const email = text(input.email).toLowerCase();
  const action = text(input.action).toLowerCase();
  const note = text(input.note || input.comment);
  if (!orderId) throw new Error('orderId or orderNumber is required.');
  if (!['approve', 'revision'].includes(action)) throw new Error('Action must be approve or revision.');
  const order = await getOrder(request, orderId);
  if (!order) throw new Error('Order was not found.');
  const orderEmail = text((order as Store).customerEmail).toLowerCase();
  if (email && orderEmail && email !== orderEmail) throw new Error('Order email does not match.');
  const tickets = await readConfigItems(request, TICKETS_KEY);
  const index = tickets.findIndex((ticket) => matchTicket(ticket, order as Store));
  if (index < 0) throw new Error('Proof ticket was not found for this order.');
  const current = tickets[index];
  if (action === 'approve' && !canApprove(current)) throw new Error('This proof cannot be approved because artwork is blocked or failed preflight.');
  const actorEmail = email || orderEmail || text(current.customerEmail);
  const patch = approvalPatch(action, note, actorEmail);
  const updatedTicket = { ...current, ...patch, customerActionAt: nowIso(), customerActionNote: note, updatedAt: nowIso(), warnings: action === 'revision' ? Array.from(new Set([...(current.warnings || []), note || 'Customer requested proof changes.'])) : current.warnings || [] };
  const nextTickets = [...tickets];
  nextTickets[index] = updatedTicket;
  await writeConfigItems(request, TICKETS_KEY, 'Production Job Tickets', nextTickets);
  const revision = await addRevision(request, updatedTicket, order as Store, action, note, actorEmail).catch(() => null);
  const plannerSync = await syncPlannerTicketState(request, updatedTicket, order as Store, action, note).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Planner sync failed.' }));
  return { ticket: updatedTicket, orderNumber: (order as Store).orderNumber, action, revision, plannerSync, message: action === 'approve' ? 'Proof approved. Your order has been released to production.' : 'Revision request received. Production is blocked until artwork is updated.' };
}
