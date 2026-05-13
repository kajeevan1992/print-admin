import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { readPlannerStore } from '@/core/storefront/production-planner';
import { getProductionEstimatorIntelligence } from '@/core/storefront/production-estimator-simulation';
import { getArtworkPreflightIntelligence, recordPreflightDecision } from '@/core/storefront/artwork-preflight-validation';

/**
 * v323 Customer Portal + Live Job Tracking Intelligence
 *
 * Reuses existing live internal systems:
 * - Production Board workflow, dispatch and timeline actions
 * - Planner jobs/lanes/live production state
 * - Artwork proof records from existing operations config storage
 * - v322 preflight validation and proof decision flow
 * - v321 estimator ETA intelligence
 *
 * This is the customer-facing tracking intelligence layer. It does not create
 * duplicate pages or demo tracking data.
 */

type Store = Record<string, any>;

const CONFIG_RESOURCE = 'admin-config' as any;
const CUSTOMERS_KEY = 'admin_customers_store';
const ARTWORK_PROOFS_KEY = 'admin_artwork_proofs_store';
const CUSTOMER_TRACKING_KEY = 'storefront-customer-tracking-log';

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value: unknown) {
  return String(value || '').toLowerCase();
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function readConfigList(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const meta = (record as any)?.metadataJson || {};
    if (Array.isArray(meta.items)) return meta.items;
    if (Array.isArray(meta.store?.items)) return meta.store.items;
    if (Array.isArray(meta.data)) return meta.data;
  } catch {
    return [];
  }
  return [];
}

async function readTrackingLog(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, CUSTOMER_TRACKING_KEY);
    const store = (record as any)?.metadataJson?.store || {};
    return {
      approvals: Array.isArray(store.approvals) ? store.approvals : [],
      revisionRequests: Array.isArray(store.revisionRequests) ? store.revisionRequests : [],
      notifications: Array.isArray(store.notifications) ? store.notifications : [],
      trackingEvents: Array.isArray(store.trackingEvents) ? store.trackingEvents : []
    };
  } catch {
    return { approvals: [], revisionRequests: [], notifications: [], trackingEvents: [] };
  }
}

async function saveTrackingLog(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: CUSTOMER_TRACKING_KEY,
    slug: CUSTOMER_TRACKING_KEY,
    name: 'Customer live job tracking log',
    description: 'Customer portal tracking, proof approvals, revision requests and notification events.',
    metadataJson: {
      store,
      savedAt: nowIso(),
      storageKey: CUSTOMER_TRACKING_KEY,
      source: 'CustomerJobTrackingIntelligence'
    }
  } as any);
}

function statusLabel(job: Store) {
  if (job.handoffState === 'blocked' || job.preflightStatus === 'fail') return 'Artwork needs attention';
  if (job.stage === 'queued') return 'Queued for production';
  if (job.stage === 'proofing') return 'Proofing / artwork review';
  if (job.stage === 'printing') return 'Printing';
  if (job.stage === 'finishing') return 'Finishing';
  if (job.stage === 'shipped' || job.handoffState === 'dispatched') return 'Dispatched / ready';
  return 'Order received';
}

function publicMilestoneStatus(stage: string, job: Store) {
  if (job.handoffState === 'blocked' || job.preflightStatus === 'fail') return 'blocked';
  const rank: Record<string, number> = { received: 0, artwork: 1, proof: 2, print: 3, finish: 4, dispatch: 5, complete: 6 };
  const current = job.stage === 'queued' ? 1 : job.stage === 'proofing' ? 2 : job.stage === 'printing' ? 3 : job.stage === 'finishing' ? 4 : job.stage === 'shipped' ? 6 : 0;
  return rank[stage] < current ? 'complete' : rank[stage] === current ? 'active' : 'pending';
}

function buildMilestones(job: Store, proof: Store | null, dispatch: Store | null) {
  return [
    { id: 'received', label: 'Order received', status: 'complete', description: 'We have received your order details.' },
    { id: 'artwork', label: 'Artwork check', status: publicMilestoneStatus('artwork', job), description: job.preflightStatus === 'fail' ? 'Artwork changes are required before production.' : 'Artwork is being checked for print readiness.' },
    { id: 'proof', label: 'Proof approval', status: proof?.status === 'approved' || job.artworkStatus === 'approved' ? 'complete' : publicMilestoneStatus('proof', job), description: proof?.notes || 'Proof approval will appear here when required.' },
    { id: 'print', label: 'Printing', status: publicMilestoneStatus('print', job), description: 'Your job is in the print production queue.' },
    { id: 'finish', label: 'Finishing', status: publicMilestoneStatus('finish', job), description: 'Trimming, folding, lamination or finishing work is being completed.' },
    { id: 'dispatch', label: 'Dispatch / collection', status: dispatch ? 'complete' : publicMilestoneStatus('dispatch', job), description: dispatch?.note || `Dispatch method: ${String(job.dispatchMethod || 'collection').replace(/-/g, ' ')}.` }
  ];
}

function customerMatch(customer: Store, query: string) {
  const text = `${customer.name || ''} ${customer.organization || ''} ${customer.email || ''}`.toLowerCase();
  return text.includes(query);
}

function jobMatch(job: Store, input: Store) {
  const order = cleanText(input.orderNumber);
  const jobId = cleanText(input.jobId);
  const customer = cleanText(input.customer || input.customerEmail || input.customerName);
  if (order && cleanText(job.orderNumber) === order) return true;
  if (jobId && cleanText(job.id) === jobId) return true;
  if (customer && `${job.customer || ''}`.toLowerCase().includes(customer)) return true;
  return false;
}

function findProofForJob(proofs: Store[], job: Store) {
  return proofs.find((proof) => cleanText(proof.orderNumber) === cleanText(job.orderNumber) || cleanText(proof.product) === cleanText(job.product)) || null;
}

function findDispatchForJob(actions: Store[], job: Store) {
  return actions.find((action) => action.action === 'dispatch-scan' && cleanText(action.orderNumber) === cleanText(job.orderNumber)) || null;
}

function findEstimatorForJob(estimator: Store | null, job: Store) {
  const sims = Array.isArray(estimator?.simulations) ? estimator.simulations : [];
  return sims.find((sim) => cleanText(sim.orderNumber) === cleanText(job.orderNumber) || cleanText(sim.product) === cleanText(job.product)) || null;
}

function buildPublicJob(job: Store, proof: Store | null, dispatch: Store | null, estimator: Store | null, trackingLog: Store) {
  const revision = trackingLog.revisionRequests.find((item: Store) => cleanText(item.orderNumber) === cleanText(job.orderNumber));
  const approval = trackingLog.approvals.find((item: Store) => cleanText(item.orderNumber) === cleanText(job.orderNumber));
  return {
    id: job.id,
    orderNumber: job.orderNumber,
    customer: job.customer || 'Customer',
    product: job.product,
    status: statusLabel(job),
    publicStatus: job.handoffState === 'blocked' || job.preflightStatus === 'fail' ? 'action-required' : job.stage === 'shipped' ? 'complete' : 'in-progress',
    artworkStatus: job.artworkStatus,
    preflightStatus: job.preflightStatus,
    dispatchMethod: job.dispatchMethod,
    dueDate: job.dueDate,
    estimatedCompletionAt: estimator?.estimatedCompletionAt || null,
    proof: proof ? {
      id: proof.id,
      status: proof.status,
      risk: proof.risk,
      dueDate: proof.dueDate,
      notes: proof.notes,
      approvalRequired: !['approved'].includes(String(proof.status))
    } : null,
    approval: approval || null,
    revisionRequest: revision || null,
    dispatch: dispatch ? {
      scannedAt: dispatch.at,
      checkpoint: dispatch.checkpoint,
      method: dispatch.dispatchMethod || job.dispatchMethod,
      note: dispatch.note
    } : null,
    milestones: buildMilestones(job, proof, dispatch),
    lastUpdatedAt: dispatch?.at || approval?.at || revision?.at || job.updatedAt || nowIso()
  };
}

function buildNotification(type: string, job: Store, message: string, recipient?: string) {
  return {
    id: makeId('customer-notification'),
    type,
    orderNumber: job.orderNumber || null,
    jobId: job.id || null,
    recipient: recipient || job.customerEmail || null,
    message,
    status: 'queued',
    at: nowIso(),
    source: 'customer-job-tracking-intelligence'
  };
}

export async function getCustomerJobTrackingIntelligence(request: Request, input: Store = {}) {
  const [board, planner, proofs, customers, trackingLog, estimator, preflight] = await Promise.all([
    readProductionBoardStore(request),
    readPlannerStore(request).catch(() => ({})),
    readConfigList(request, ARTWORK_PROOFS_KEY),
    readConfigList(request, CUSTOMERS_KEY),
    readTrackingLog(request),
    getProductionEstimatorIntelligence(request).catch(() => null),
    getArtworkPreflightIntelligence(request).catch(() => null)
  ]);

  const query = cleanText(input.customer || input.customerEmail || input.customerName || input.search || '');
  const matchedCustomer = query ? customers.find((customer) => customerMatch(customer, query)) || null : null;
  const allJobs = Array.isArray(board.items) ? board.items : [];
  const jobs = allJobs.filter((job) => {
    if (input.orderNumber || input.jobId) return jobMatch(job, input);
    if (matchedCustomer) return cleanText(job.customer).includes(cleanText(matchedCustomer.organization || matchedCustomer.name));
    if (query) return cleanText(job.customer).includes(query) || cleanText(job.orderNumber).includes(query);
    return true;
  });

  const publicJobs = jobs.map((job) => buildPublicJob(
    job,
    findProofForJob(proofs, job),
    findDispatchForJob(board.actions || [], job),
    findEstimatorForJob(estimator, job),
    trackingLog
  ));

  const milestoneFeed = publicJobs.flatMap((job) => job.milestones.map((milestone: Store) => ({
    id: `${job.orderNumber}-${milestone.id}`,
    orderNumber: job.orderNumber,
    product: job.product,
    milestone: milestone.label,
    status: milestone.status,
    description: milestone.description
  })));

  return {
    customer: matchedCustomer,
    jobs: publicJobs,
    milestoneFeed,
    approvals: trackingLog.approvals,
    revisionRequests: trackingLog.revisionRequests,
    notifications: trackingLog.notifications,
    trackingEvents: trackingLog.trackingEvents,
    proofSummary: {
      proofRecords: proofs.length,
      approvalRequired: publicJobs.filter((job) => job.proof?.approvalRequired).length,
      revisionRequested: publicJobs.filter((job) => job.revisionRequest).length
    },
    productionSummary: {
      totalJobs: publicJobs.length,
      inProgress: publicJobs.filter((job) => job.publicStatus === 'in-progress').length,
      actionRequired: publicJobs.filter((job) => job.publicStatus === 'action-required').length,
      complete: publicJobs.filter((job) => job.publicStatus === 'complete').length,
      plannerJobs: Array.isArray(planner.jobs) ? planner.jobs.length : 0,
      blockedPreflight: preflight?.summary?.blockedJobs || 0
    },
    source: 'internal-customer-job-tracking-intelligence',
    generatedAt: nowIso()
  };
}

export async function recordCustomerProofApproval(request: Request, input: Store) {
  const board = await readProductionBoardStore(request);
  const log = await readTrackingLog(request);
  const orderNumber = input.orderNumber;
  const job = board.items.find((item) => cleanText(item.orderNumber) === cleanText(orderNumber) || cleanText(item.id) === cleanText(input.jobId));
  if (!job) throw new Error('No production job matched this proof approval.');

  const approval = {
    id: makeId('proof-approval'),
    orderNumber: job.orderNumber,
    jobId: job.id,
    customerName: input.customerName || job.customer || null,
    customerEmail: input.customerEmail || null,
    status: input.approved === false ? 'rejected' : 'approved',
    note: input.note || (input.approved === false ? 'Customer requested changes.' : 'Customer approved proof.'),
    at: nowIso(),
    source: 'customer-portal'
  };

  const items = board.items.map((item) => cleanText(item.id) === cleanText(job.id) ? {
    ...item,
    artworkStatus: approval.status === 'approved' ? 'approved' : 'changes-requested',
    preflightStatus: approval.status === 'approved' ? 'pass' : 'warning',
    handoffState: approval.status === 'approved' && item.handoffState === 'needs-artwork' ? 'ready-for-print' : item.handoffState,
    productionNotes: approval.note
  } : item);

  const actions = [{
    id: makeId('customer-action'),
    action: approval.status === 'approved' ? 'customer-proof-approved' : 'customer-proof-rejected',
    at: nowIso(),
    note: approval.note,
    jobId: job.id,
    orderNumber: job.orderNumber,
    source: 'customer-job-tracking-intelligence'
  }, ...board.actions].slice(0, 400);

  const notifications = [buildNotification(approval.status === 'approved' ? 'proof-approved' : 'proof-rejected', job, approval.note, input.customerEmail), ...log.notifications].slice(0, 300);
  await saveProductionBoardStore(request, { items, actions });
  await saveTrackingLog(request, { ...log, approvals: [approval, ...log.approvals].slice(0, 300), notifications });

  if (approval.status === 'approved') {
    await recordPreflightDecision(request, { action: 'customer-proof-approved', orderNumber: job.orderNumber, jobId: job.id, note: approval.note }).catch(() => null);
  }

  return getCustomerJobTrackingIntelligence(request, { orderNumber: job.orderNumber });
}

export async function recordCustomerRevisionRequest(request: Request, input: Store) {
  const board = await readProductionBoardStore(request);
  const log = await readTrackingLog(request);
  const job = board.items.find((item) => cleanText(item.orderNumber) === cleanText(input.orderNumber) || cleanText(item.id) === cleanText(input.jobId));
  if (!job) throw new Error('No production job matched this revision request.');

  const revision = {
    id: makeId('revision-request'),
    orderNumber: job.orderNumber,
    jobId: job.id,
    customerName: input.customerName || job.customer || null,
    customerEmail: input.customerEmail || null,
    note: input.note || 'Customer requested artwork revision.',
    files: Array.isArray(input.files) ? input.files : [],
    at: nowIso(),
    source: 'customer-portal'
  };

  const items = board.items.map((item) => cleanText(item.id) === cleanText(job.id) ? {
    ...item,
    artworkStatus: 'changes-requested',
    preflightStatus: 'warning',
    handoffState: 'blocked',
    productionNotes: revision.note
  } : item);

  const actions = [{
    id: makeId('customer-action'),
    action: 'customer-revision-requested',
    at: nowIso(),
    note: revision.note,
    jobId: job.id,
    orderNumber: job.orderNumber,
    source: 'customer-job-tracking-intelligence'
  }, ...board.actions].slice(0, 400);

  const notifications = [buildNotification('revision-requested', job, revision.note, input.customerEmail), ...log.notifications].slice(0, 300);
  await saveProductionBoardStore(request, { items, actions });
  await saveTrackingLog(request, { ...log, revisionRequests: [revision, ...log.revisionRequests].slice(0, 300), notifications });

  return getCustomerJobTrackingIntelligence(request, { orderNumber: job.orderNumber });
}

export async function recordCustomerTrackingEvent(request: Request, input: Store) {
  const log = await readTrackingLog(request);
  const event = {
    id: makeId('tracking-event'),
    type: input.type || 'tracking-view',
    orderNumber: input.orderNumber || null,
    jobId: input.jobId || null,
    customerEmail: input.customerEmail || null,
    message: input.message || 'Customer tracking event recorded.',
    at: nowIso(),
    source: 'customer-job-tracking-intelligence'
  };
  await saveTrackingLog(request, { ...log, trackingEvents: [event, ...log.trackingEvents].slice(0, 500) });
  return getCustomerJobTrackingIntelligence(request, input);
}
