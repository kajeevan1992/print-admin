import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { queueAdminProofDecisionEmail } from '@/core/email/order-notifications.service';
import { getOrder } from '@/core/orders/orders.service';
import { readPlannerStore, savePlannerStore } from '@/core/storefront/production-planner';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';
const REVISIONS_KEY = 'customer-proof-revisions-v377';
const DESIGN_BRIEFS_KEY = 'customer-design-briefs-v1';

const PAYMENT_RELEASED = ['paid', 'captured', 'authorized', 'manual-paid'];

type Store = Record<string, any>;

function nowIso() { return new Date().toISOString(); }
function text(value: unknown) { return String(value || '').trim(); }
function lower(value: unknown) { return text(value).toLowerCase(); }
function clean(value: unknown) { return lower(value).replace(/_/g, '-'); }
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
function matchDesignBrief(brief: Store, ticket: Store, order: Store) { const keys = [brief.id, brief.designBriefId, brief.orderId, brief.orderNumber, brief.productionTicketId].filter(Boolean).map(String); const targets = [ticket.designBriefId, ticket.id, ticket.orderId, ticket.orderNumber, order.id, order.orderNumber].filter(Boolean).map(String); return keys.some((key) => targets.includes(key)); }
function proofDecisionOpen(ticket: Store) {
  const proofStatus = clean(ticket.customerProofStatus);
  const artworkStatus = clean(ticket.artworkStatus);
  const preflightStatus = clean(ticket.preflightStatus);
  const designStatus = clean(ticket.designQuoteStatus || ticket.designWorkState);
  const closed = ['approved', 'revision-requested'].includes(proofStatus) || ['approved', 'changes-requested', 'design-revision-requested'].includes(artworkStatus) || ['revision-requested', 'proof-revision-requested'].includes(designStatus);
  const blocked = ['fail', 'failed', 'blocked', 'preflight-fail', 'replacement-requested'].includes(preflightStatus || artworkStatus);
  const readyProof = proofStatus === 'pending-customer-approval' && (['design-proof-ready', 'preflight-pass', 'preflight-warning'].includes(artworkStatus) || ['pass', 'warning'].includes(preflightStatus));
  return readyProof && !closed && !blocked;
}
function proofLinkMatches(ticket: Store, input: Store) {
  const expectedToken = text(ticket.proofToken || ticket.currentProofToken);
  const providedToken = text(input.proofToken || input.currentProofToken || input.token);
  const expectedVersion = text(ticket.proofVersion || '');
  const providedVersion = text(input.proofVersion || input.version || '');
  if (expectedToken && expectedToken !== providedToken) return false;
  if (expectedToken && expectedVersion && expectedVersion !== providedVersion) return false;
  if (!expectedToken && expectedVersion && providedVersion && expectedVersion !== providedVersion) return false;
  return true;
}
function paymentReleased(ticket: Store) { const status = lower(ticket.paymentStatus || ticket.paymentGate); return PAYMENT_RELEASED.includes(status) || lower(ticket.paymentGate) === 'paid' || ticket.paymentReleased === true; }
function paymentLabel(ticket: Store) { return text(ticket.paymentStatus || ticket.paymentGate || 'awaiting-payment'); }
function paymentHoldReason(ticket: Store) { return `Customer approved proof, but payment is ${paymentLabel(ticket)}. Production remains held until payment is paid, captured or authorised.`; }
function isDesignHelpTicket(ticket: Store) { return Boolean(ticket.designBriefId || ticket.designProofUrl || lower(ticket.designQuoteStatus).includes('design') || lower(ticket.artworkStatus).includes('design') || lower(ticket.status).includes('design')); }
function approvalPatch(ticket: Store, action: string, note: string, actorEmail: string) {
  if (action !== 'approve') {
    if (isDesignHelpTicket(ticket)) return { artworkStatus: 'design-revision-requested', customerProofStatus: 'revision-requested', designQuoteStatus: 'revision-requested', designWorkState: 'proof-revision-requested', handoffState: 'blocked', status: 'design-in-progress', proofRevisionRequestedAt: nowIso(), proofRevisionRequestedBy: actorEmail, blockReason: 'Customer requested design proof changes. Design team must revise and send a new proof.', productionNotes: note || 'Customer requested design proof changes.' };
    return { artworkStatus: 'changes-requested', customerProofStatus: 'revision-requested', handoffState: 'blocked', status: 'blocked', proofRevisionRequestedAt: nowIso(), proofRevisionRequestedBy: actorEmail, blockReason: note || 'Customer requested proof changes.', productionNotes: note || 'Customer requested proof changes.' };
  }
  if (paymentReleased(ticket)) return { artworkStatus: 'approved', customerProofStatus: 'approved', handoffState: 'ready-for-print', status: 'ready-to-print', paymentGate: lower(ticket.paymentGate) === 'paid' ? ticket.paymentGate : 'paid', proofApprovedAt: nowIso(), proofApprovedBy: actorEmail, blockReason: '', productionNotes: note || 'Customer approved proof for print.' };
  const reason = paymentHoldReason(ticket);
  return { artworkStatus: 'approved', customerProofStatus: 'approved', handoffState: 'blocked', status: 'payment-hold', paymentGate: ticket.paymentGate || 'awaiting-payment', proofApprovedAt: nowIso(), proofApprovedBy: actorEmail, blockReason: reason, productionNotes: [note || 'Customer approved proof for print.', reason].filter(Boolean).join(' ') };
}
async function syncPlannerTicketState(request: Request, ticket: Store, order: Store, action: string, note: string) {
  const planner = await readPlannerStore(request).catch(() => null);
  if (!planner) return null;
  const approved = action === 'approve';
  const paid = paymentReleased(ticket);
  const released = approved && paid;
  const paymentHold = approved && !paid;
  let changed = false;
  const jobs = Array.isArray(planner.jobs) ? planner.jobs : [];
  const updatedJobs = jobs.map((job: Store) => {
    if (!plannerMatches(job, ticket, order)) return job;
    changed = true;
    const at = nowIso();
    const designRevision = !approved && isDesignHelpTicket(ticket);
    const blockReason = paymentHold ? paymentHoldReason(ticket) : designRevision ? 'Customer requested design proof changes. Design team must revise and send a new proof.' : note || 'Customer requested proof changes.';
    return {
      ...job,
      stage: released && job.stage === 'blocked' ? 'queued' : released ? job.stage : 'blocked',
      status: released ? 'queued-for-production' : paymentHold ? 'blocked-payment-hold' : designRevision ? 'blocked-design-revision' : 'blocked-artwork-revision',
      productionBlocked: !released,
      blockReason: released ? '' : blockReason,
      artworkStatus: approved ? 'approved' : designRevision ? 'design-revision-requested' : 'changes-requested',
      customerProofStatus: approved ? 'approved' : 'revision-requested',
      paymentStatus: ticket.paymentStatus || job.paymentStatus || '',
      paymentGate: released ? 'paid' : ticket.paymentGate || job.paymentGate || 'awaiting-payment',
      handoffState: released ? 'ready-for-print' : 'blocked',
      liveStatus: released ? 'waiting' : 'blocked',
      proofVersion: ticket.proofVersion || job.proofVersion || 0,
      updatedAt: at,
      history: [{ at, action: released ? 'customer-proof-approved-payment-released' : paymentHold ? 'customer-proof-approved-payment-hold' : designRevision ? 'customer-design-proof-revision-requested' : 'customer-revision-requested', from: job.stage, to: released ? 'queued' : 'blocked', note: released ? note || 'Customer approved proof and payment gate is released.' : blockReason }, ...(Array.isArray(job.history) ? job.history : [])].slice(0, 100),
    };
  });
  if (!changed) return null;
  await savePlannerStore(request, { ...planner, jobs: updatedJobs, actions: [{ id: `planner-action-${Date.now()}`, action: released ? 'customer-proof-approved-payment-released' : paymentHold ? 'customer-proof-approved-payment-hold' : isDesignHelpTicket(ticket) && !approved ? 'customer-design-proof-revision-requested' : 'customer-revision-requested', orderId: order.id, orderNumber: order.orderNumber, productionTicketId: ticket.id, at: nowIso(), note: released ? note : paymentHold ? paymentHoldReason(ticket) : isDesignHelpTicket(ticket) && !approved ? `Customer requested design proof v${ticket.proofVersion || ''} changes.` : note }, ...(Array.isArray(planner.actions) ? planner.actions : [])].slice(0, 400) });
  return { updated: true, released, paymentHold };
}
async function addRevision(request: Request, ticket: Store, order: Store, action: string, note: string, actorEmail: string) {
  const revisions = await readConfigItems(request, REVISIONS_KEY).catch(() => []);
  const item = { id: `rev-${Date.now()}`, orderNumber: order.orderNumber, productionTicketId: ticket.id, action: action === 'approve' ? 'approved' : isDesignHelpTicket(ticket) ? 'design-revision-requested' : 'revision-requested', customer: order.customerName || ticket.customerName || 'Customer', customerEmail: actorEmail, comment: note || (action === 'approve' ? 'Customer approved proof.' : isDesignHelpTicket(ticket) ? 'Customer requested design proof changes.' : 'Customer requested changes.'), timestamp: nowIso(), version: revisions.filter((row) => row.orderNumber === order.orderNumber).length + 1, source: 'customer-proof-action', proofVersion: ticket.proofVersion || 0, proofToken: ticket.proofToken || '', paymentGate: ticket.paymentGate || '', paymentStatus: ticket.paymentStatus || '', handoffState: ticket.handoffState || '' };
  await writeConfigItems(request, REVISIONS_KEY, 'Customer Proof Revisions', [item, ...revisions]);
  return item;
}
async function syncDesignBriefProofDecision(request: Request, ticket: Store, order: Store, action: string, note: string, actorEmail: string) {
  const briefs = await readConfigItems(request, DESIGN_BRIEFS_KEY).catch(() => []);
  const index = briefs.findIndex((brief) => matchDesignBrief(brief, ticket, order));
  if (index < 0) return { updated: false, reason: 'No matching design brief.' };
  const at = nowIso();
  const approved = action === 'approve';
  const current = briefs[index];
  const update = approved ? {
    designQuoteStatus: 'approved-to-design',
    designWorkState: 'proof-approved',
    customerProofStatus: 'approved',
    proofApprovedAt: ticket.proofApprovedAt || at,
    proofApprovedBy: actorEmail,
    proofDecisionAt: at,
    proofDecisionBy: actorEmail,
    proofDecisionNote: note || 'Customer approved proof.',
    decidedProofVersion: ticket.proofVersion || current.proofVersion || 0,
    decidedProofToken: ticket.proofToken || current.proofToken || '',
    productionReleaseState: paymentReleased(ticket) ? 'released-to-production' : 'payment-hold',
  } : {
    designQuoteStatus: 'revision-requested',
    designWorkState: 'proof-revision-requested',
    customerProofStatus: 'revision-requested',
    proofRevisionRequestedAt: ticket.proofRevisionRequestedAt || at,
    proofRevisionRequestedBy: actorEmail,
    proofRevisionNote: note || 'Customer requested proof changes.',
    proofDecisionAt: at,
    proofDecisionBy: actorEmail,
    proofDecisionNote: note || 'Customer requested proof changes.',
    decidedProofVersion: ticket.proofVersion || current.proofVersion || 0,
    decidedProofToken: ticket.proofToken || current.proofToken || '',
    productionReleaseState: 'blocked-design-revision',
  };
  const updatedBrief = {
    ...current,
    ...update,
    designBriefStatus: current.designBriefStatus || 'submitted',
    productionTicketId: ticket.id || current.productionTicketId || '',
    orderId: current.orderId || order.id || '',
    orderNumber: current.orderNumber || order.orderNumber || '',
    updatedAt: at,
    history: [{ at, action: approved ? 'customer-design-proof-approved' : 'customer-design-proof-revision-requested', note: note || '', customerEmail: actorEmail, productionTicketId: ticket.id || '', proofVersion: ticket.proofVersion || '', paymentReleased: paymentReleased(ticket) }, ...(Array.isArray(current.history) ? current.history : [])].slice(0, 100),
  };
  const next = [...briefs];
  next[index] = updatedBrief;
  await writeConfigItems(request, DESIGN_BRIEFS_KEY, 'Customer Design Briefs', next);
  return { updated: true, briefId: updatedBrief.id, status: updatedBrief.designQuoteStatus, designWorkState: updatedBrief.designWorkState };
}
function customerMessage(action: string, ticket: Store) {
  if (action !== 'approve') return isDesignHelpTicket(ticket) ? 'Revision request received. Our design team will revise the proof and send it back for approval.' : 'Revision request received. Production is blocked until artwork is updated.';
  if (paymentReleased(ticket)) return 'Proof approved. Your order has been released to production.';
  return 'Proof approved. Your order is still waiting for payment before production starts.';
}
function proofDecisionEmailOrder(order: Store, ticket: Store, action: string, note: string, actorEmail: string, designBriefSync: Store, plannerSync: Store) {
  const approved = action === 'approve';
  const plannerReleased = Boolean(plannerSync?.released);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName || ticket.customerName || 'Customer',
    customerEmail: order.customerEmail || actorEmail || ticket.customerEmail || '',
    currency: order.currency || 'GBP',
    total: order.total,
    totalMinor: order.totalMinor,
    status: order.status,
    paymentStatus: ticket.paymentStatus || order.paymentStatus || '',
    items: Array.isArray(order.items) ? order.items : [],
    proofDecision: approved ? `approved proof v${ticket.proofVersion || ''}` : isDesignHelpTicket(ticket) ? `design revision requested on proof v${ticket.proofVersion || ''}` : 'revision requested',
    customerProofStatus: ticket.customerProofStatus || '',
    ticketStatus: ticket.status || '',
    paymentReleased: paymentReleased(ticket),
    productionReleaseState: approved ? (plannerReleased || paymentReleased(ticket) ? 'released-to-production' : 'payment-hold') : isDesignHelpTicket(ticket) ? 'blocked-design-revision' : 'blocked-revision',
    proofDecisionNote: note || (approved ? 'Customer approved proof.' : isDesignHelpTicket(ticket) ? 'Customer requested design proof changes.' : 'Customer requested proof changes.'),
    designBriefSyncStatus: designBriefSync?.updated ? `updated (${designBriefSync.designWorkState || designBriefSync.status || 'synced'})` : designBriefSync?.reason || designBriefSync?.error || 'not updated',
    plannerSyncStatus: plannerSync?.updated ? (plannerSync.released ? 'released to production' : plannerSync.paymentHold ? 'payment hold' : 'updated') : plannerSync?.error || 'not updated',
  };
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
  if (!proofDecisionOpen(current)) throw new Error('This proof is no longer open for customer approval or revision. Please wait for the latest proof version.');
  if (!proofLinkMatches(current, input)) throw new Error('This proof link is not for the current proof version. Please use the latest proof email/link.');
  const actorEmail = email || orderEmail || text(current.customerEmail);
  const patch = approvalPatch(current, action, note, actorEmail);
  const updatedTicket = { ...current, ...patch, customerActionAt: nowIso(), customerActionNote: note, decidedProofToken: current.proofToken || '', decidedProofVersion: current.proofVersion || 0, updatedAt: nowIso(), warnings: action === 'revision' ? Array.from(new Set([...(current.warnings || []), note || (isDesignHelpTicket(current) ? 'Customer requested design proof changes.' : 'Customer requested proof changes.')])) : current.warnings || [] };
  const nextTickets = [...tickets];
  nextTickets[index] = updatedTicket;
  await writeConfigItems(request, TICKETS_KEY, 'Production Job Tickets', nextTickets);
  const revision = await addRevision(request, updatedTicket, order as Store, action, note, actorEmail).catch(() => null);
  const designBriefSync = await syncDesignBriefProofDecision(request, updatedTicket, order as Store, action, note, actorEmail).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Design brief sync failed.' }));
  const plannerSync = await syncPlannerTicketState(request, updatedTicket, order as Store, action, note).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Planner sync failed.' }));
  const adminEmail = await queueAdminProofDecisionEmail(request, proofDecisionEmailOrder(order as Store, updatedTicket, action, note, actorEmail, designBriefSync as Store, plannerSync as Store), { actor: 'customer-proof-action', note }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Admin proof decision email queue failed.' }));
  return { ticket: updatedTicket, orderNumber: (order as Store).orderNumber, action, revision, designBriefSync, plannerSync, adminEmail, paymentReleased: paymentReleased(updatedTicket), message: customerMessage(action, updatedTicket) };
}
