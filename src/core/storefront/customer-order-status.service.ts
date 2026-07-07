import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { getOrder } from '@/core/orders/orders.service';
import { syncPlannerFromWorkflow } from '@/core/storefront/production-planner';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_TICKETS_KEY = 'production-job-tickets';

type Store = Record<string, any>;

function text(value: unknown) { return String(value || '').trim(); }
function cleanStatus(value: unknown) { return text(value).toLowerCase().replace(/_/g, '-'); }
function safeDate(value: unknown) { const input = text(value); if (!input) return ''; const date = new Date(input); return Number.isNaN(date.getTime()) ? input : date.toISOString(); }
async function readConfigItems(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const json = (record as any)?.metadataJson || {};
    if (Array.isArray(json.items)) return json.items as Store[];
    if (Array.isArray(json.store?.items)) return json.store.items as Store[];
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}
function findForOrder(items: Store[], order: Store) { const keys = [order.id, order.orderNumber, ...(Array.isArray(order.artworkUploadIds) ? order.artworkUploadIds : [])].filter(Boolean).map(String); return items.find((item) => keys.some((key) => [item.orderId, item.orderNumber, item.id, item.artworkUploadId, item.productionTicketId, item.workflowId].filter(Boolean).map(String).includes(key))) || null; }
function stageIndex(value: string) { return ['order', 'artwork', 'proof', 'production', 'dispatch', 'complete'].indexOf(value); }
function deriveCurrentStage(order: Store, ticket: Store | null, plannerJob: Store | null) { const orderStatus = cleanStatus(order.status); if (plannerJob?.stage === 'completed' || ['delivered', 'dispatched'].includes(orderStatus)) return 'complete'; if (plannerJob?.stage === 'dispatch' || plannerJob?.stage === 'completed') return 'dispatch'; if (plannerJob && !plannerJob.productionBlocked && ['queued', 'prepress', 'print', 'finish'].includes(String(plannerJob.stage))) return 'production'; if (ticket?.customerProofStatus === 'approved' || ticket?.artworkStatus === 'approved') return 'production'; if (ticket?.artworkStatus || ticket?.preflightStatus || ticket?.customerProofStatus) return 'proof'; const rawArtwork = order.rawCheckout?.artwork || order.items?.[0]?.metadataJson?.artworkSnapshot; if (rawArtwork?.status || rawArtwork?.upload?.id || order.artworkUploadIds?.length) return 'artwork'; return 'order'; }
function publicMessage(stage: string, ticket: Store | null, plannerJob: Store | null) { const block = text(plannerJob?.blockReason); if (block) return block; if (ticket?.customerProofStatus === 'revision-requested') return 'We need revised artwork before this order can continue.'; if (ticket?.customerProofStatus === 'pending-customer-approval') return 'Your proof is ready and waiting for approval.'; if (ticket?.artworkStatus === 'preflight-fail') return 'Artwork has a preflight issue. Please upload replacement artwork.'; if (ticket?.artworkStatus === 'preflight-warning') return 'Artwork needs a final review before print release.'; if (stage === 'production') return 'Your order has been released to production.'; if (stage === 'dispatch') return 'Your order is being packed or prepared for handover.'; if (stage === 'complete') return 'Your order has completed production/dispatch.'; if (stage === 'artwork') return 'Artwork has been received and is being checked.'; return 'Your order has been received.'; }
function progress(stage: string) { const active = stageIndex(stage); return [{ key: 'order', label: 'Order received' }, { key: 'artwork', label: 'Artwork check' }, { key: 'proof', label: 'Proof approval' }, { key: 'production', label: 'Production' }, { key: 'dispatch', label: 'Dispatch' }, { key: 'complete', label: 'Complete' }].map((step) => ({ ...step, state: stageIndex(step.key) < active ? 'done' : stageIndex(step.key) === active ? 'active' : 'pending' })); }
function compactOrder(order: Store) { return { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total, currency: order.currency, createdAt: order.createdAt, updatedAt: order.updatedAt, customerName: order.customerName, items: (order.items || []).map((item: Store) => ({ productName: item.productName, quantity: item.quantity, totalPrice: item.totalPrice, sku: item.sku })) }; }
function customerUrl(order: Store, path: string) { const params = new URLSearchParams({ orderId: String(order.orderNumber || order.id) }); if (order.customerEmail) params.set('email', String(order.customerEmail)); return `${path}?${params.toString()}`; }
function compactTicket(ticket: Store | null, order: Store) { if (!ticket) return null; const needsCustomerDecision = ticket.customerProofStatus === 'pending-customer-approval' || ['preflight-pass', 'preflight-warning'].includes(String(ticket.artworkStatus)); const needsReplacementArtwork = ticket.customerProofStatus === 'revision-requested' || ['changes-requested', 'preflight-fail'].includes(String(ticket.artworkStatus)); return { id: ticket.id, artworkStatus: ticket.artworkStatus, preflightStatus: ticket.preflightStatus, customerProofStatus: ticket.customerProofStatus, handoffState: ticket.handoffState, dueDate: ticket.dueDate, artworkUploadId: ticket.artworkUploadId, updatedAt: ticket.updatedAt, needsCustomerDecision, needsReplacementArtwork, proofActionUrl: customerUrl(order, '/proof-action'), uploadArtworkUrl: customerUrl(order, '/storefront/upload-artwork') }; }
function nextAction(ticket: Store | null, order: Store) { if (!ticket) return null; const artwork = compactTicket(ticket, order); if (!artwork) return null; if (artwork.needsReplacementArtwork) return { type: 'upload-artwork', label: 'Upload artwork', title: 'Replacement artwork needed', href: artwork.uploadArtworkUrl, priority: 'high' }; if (artwork.needsCustomerDecision) return { type: 'proof-review', label: 'Review proof', title: 'Proof approval needed', href: artwork.proofActionUrl, priority: 'high' }; return null; }
function compactPlanner(job: Store | null) { if (!job) return null; return { id: job.id, stage: job.stage, status: job.status, laneName: job.laneName, dueAt: safeDate(job.dueAt), scheduledStartAt: safeDate(job.scheduledStartAt), scheduledEndAt: safeDate(job.scheduledEndAt), productionBlocked: Boolean(job.productionBlocked), blockReason: job.blockReason || '', liveStatus: job.liveStatus || '', progressPercent: job.progressPercent || 0 }; }
function compactDispatch(job: Store | null) { if (!job || !['dispatch', 'completed'].includes(String(job.stage))) return null; return { stage: job.stage === 'completed' ? 'handover' : 'ready', carrier: job.carrier || '', service: job.service || '', trackingNumber: job.trackingNumber || '', manifestNumber: job.manifestNumber || '', scanStatus: job.scanStatus || (job.stage === 'completed' ? 'complete' : 'partial') }; }

export async function resolveCustomerOrderStatus(request: Request, orderId: string, email?: string | null) {
  const order = await getOrder(request, orderId);
  if (!order) return null;
  const suppliedEmail = text(email).toLowerCase();
  if (suppliedEmail && text((order as any).customerEmail).toLowerCase() !== suppliedEmail) return { forbidden: true } as any;
  const [tickets, planner] = await Promise.all([readConfigItems(request, PRODUCTION_TICKETS_KEY), syncPlannerFromWorkflow(request).catch(() => ({ jobs: [] }))]);
  const ticket = findForOrder(tickets, order as Store);
  const plannerJob = findForOrder(Array.isArray((planner as any).jobs) ? (planner as any).jobs : [], { ...(order as Store), productionTicketId: ticket?.id || '', workflowId: ticket ? `ticket-${ticket.id || ticket.orderNumber}` : '' });
  const currentStage = deriveCurrentStage(order as Store, ticket, plannerJob);
  return { order: compactOrder(order as Store), currentStage, message: publicMessage(currentStage, ticket, plannerJob), progress: progress(currentStage), artwork: compactTicket(ticket, order as Store), nextAction: nextAction(ticket, order as Store), production: compactPlanner(plannerJob), dispatch: compactDispatch(plannerJob), generatedAt: new Date().toISOString() };
}
