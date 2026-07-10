import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { getOrder } from '@/core/orders/orders.service';
import { syncPlannerFromWorkflow } from '@/core/storefront/production-planner';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_TICKETS_KEY = 'production-job-tickets';
const PAYMENT_RELEASED = ['paid', 'captured', 'authorized', 'manual-paid'];

type Store = Record<string, any>;

function text(value: unknown) { return String(value || '').trim(); }
function cleanStatus(value: unknown) { return text(value).toLowerCase().replace(/_/g, '-'); }
function safeDate(value: unknown) { const input = text(value); if (!input) return ''; const date = new Date(input); return Number.isNaN(date.getTime()) ? input : date.toISOString(); }
function paymentReleasedValue(value: unknown) { return PAYMENT_RELEASED.includes(cleanStatus(value)); }
function orderPaymentReleased(order: Store) { return paymentReleasedValue(order.paymentStatus); }
function ticketPaymentReleased(ticket: Store | null, order?: Store | null) { if (!ticket) return order ? orderPaymentReleased(order) : false; return Boolean(ticket.paymentReleased || paymentReleasedValue(ticket.paymentStatus) || cleanStatus(ticket.paymentGate) === 'paid' || (order && orderPaymentReleased(order))); }
function proofReleased(ticket: Store | null) { return Boolean(ticket && (ticket.customerProofStatus === 'approved' || ticket.artworkStatus === 'approved' || ticket.handoffState === 'ready-for-print')); }
function rawArtwork(order: Store) { return order.rawCheckout?.artwork || order.items?.[0]?.metadataJson?.artworkSnapshot || order.items?.[0]?.resolverSnapshot?.artworkSnapshot || {}; }
function designHelpRequested(ticket: Store | null, order: Store) { const raw = rawArtwork(order); const values = [ticket?.artworkStatus, ticket?.designBriefStatus, ticket?.status, raw?.status, raw?.label].map(cleanStatus); return values.some((value) => ['design-required', 'need-design', 'needs-design', 'design-help', 'customer-needs-design-help'].includes(value)) || cleanStatus(ticket?.artworkStatus).includes('design'); }
function designBriefSubmitted(ticket: Store | null) { return ['submitted', 'received', 'complete'].includes(cleanStatus(ticket?.designBriefStatus)) || Boolean(ticket?.designBriefId); }
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
function findForOrder(items: Store[], order: Store) { const keys = [order.id, order.orderNumber, order.productionTicketId, order.workflowId, ...(Array.isArray(order.artworkUploadIds) ? order.artworkUploadIds : [])].filter(Boolean).map(String); return items.find((item) => keys.some((key) => [item.orderId, item.orderNumber, item.id, item.artworkUploadId, item.productionTicketId, item.workflowId].filter(Boolean).map(String).includes(key))) || null; }
function stageIndex(value: string) { return ['order', 'artwork', 'proof', 'production', 'dispatch', 'complete'].indexOf(value); }
function deriveCurrentStage(order: Store, ticket: Store | null, plannerJob: Store | null) {
  const orderStatus = cleanStatus(order.status);
  if (plannerJob?.stage === 'completed' || ['delivered', 'dispatched'].includes(orderStatus)) return 'complete';
  if (plannerJob?.stage === 'dispatch' || plannerJob?.stage === 'completed') return 'dispatch';
  if (plannerJob && !plannerJob.productionBlocked && ['queued', 'prepress', 'print', 'finish'].includes(String(plannerJob.stage))) return 'production';
  if (proofReleased(ticket) && ticketPaymentReleased(ticket, order) && (!plannerJob || !plannerJob.productionBlocked)) return 'production';
  if (ticket?.customerProofStatus || ticket?.artworkStatus || ticket?.preflightStatus || designHelpRequested(ticket, order)) return 'proof';
  const raw = rawArtwork(order);
  if (raw?.status || raw?.upload?.id || order.artworkUploadIds?.length) return 'artwork';
  return 'order';
}
function publicMessage(stage: string, ticket: Store | null, plannerJob: Store | null, order: Store) {
  if (designHelpRequested(ticket, order) && !designBriefSubmitted(ticket)) return 'We need your design brief before staff can review and quote any extra design work.';
  if (designHelpRequested(ticket, order) && designBriefSubmitted(ticket)) return 'Design brief received. Staff will review and confirm any extra design charge before design starts.';
  const paymentHold = proofReleased(ticket) && !ticketPaymentReleased(ticket, order);
  if (paymentHold) return 'Proof approved. We are waiting for payment before production starts.';
  const block = text(plannerJob?.blockReason || ticket?.blockReason);
  if (block && block.toLowerCase().includes('payment')) return 'Payment is required before production can start.';
  if (block) return block;
  if (ticket?.customerProofStatus === 'revision-requested') return 'We need revised artwork before this order can continue.';
  if (ticket?.customerProofStatus === 'pending-customer-approval') return 'Your proof is ready and waiting for approval.';
  if (ticket?.artworkStatus === 'preflight-fail') return 'Artwork has a preflight issue. Please upload replacement artwork.';
  if (ticket?.artworkStatus === 'preflight-warning') return 'Artwork needs a final review before print release.';
  if (stage === 'production') return 'Your order has been released to production.';
  if (stage === 'dispatch') return 'Your order is being packed or prepared for handover.';
  if (stage === 'complete') return 'Your order has completed production/dispatch.';
  if (stage === 'artwork') return 'Artwork has been received and is being checked.';
  return 'Your order has been received.';
}
function progress(stage: string) { const active = stageIndex(stage); return [{ key: 'order', label: 'Order received' }, { key: 'artwork', label: 'Artwork check' }, { key: 'proof', label: 'Proof approval' }, { key: 'production', label: 'Production' }, { key: 'dispatch', label: 'Dispatch' }, { key: 'complete', label: 'Complete' }].map((step) => ({ ...step, state: stageIndex(step.key) < active ? 'done' : stageIndex(step.key) === active ? 'active' : 'pending' })); }
function compactOrder(order: Store) { return { id: order.id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus || 'unpaid', paymentProvider: order.paymentProvider || '', paymentReleased: orderPaymentReleased(order), paidAt: order.paidAt || '', total: order.total, currency: order.currency, createdAt: order.createdAt, updatedAt: order.updatedAt, customerName: order.customerName, items: (order.items || []).map((item: Store) => ({ productName: item.productName, quantity: item.quantity, totalPrice: item.totalPrice, sku: item.sku })) }; }
function customerUrl(order: Store, path: string) { const params = new URLSearchParams({ orderId: String(order.orderNumber || order.id) }); if (order.customerEmail) params.set('email', String(order.customerEmail)); return `${path}?${params.toString()}`; }
function compactTicket(ticket: Store | null, order: Store) { if (!ticket) return null; const needsCustomerDecision = ticket.customerProofStatus === 'pending-customer-approval' || ['preflight-pass', 'preflight-warning'].includes(String(ticket.artworkStatus)); const needsReplacementArtwork = ticket.customerProofStatus === 'revision-requested' || ['changes-requested', 'preflight-fail'].includes(String(ticket.artworkStatus)); const paymentReleased = ticketPaymentReleased(ticket, order); const needsDesignBrief = designHelpRequested(ticket, order) && !designBriefSubmitted(ticket); return { id: ticket.id, artworkStatus: ticket.artworkStatus, preflightStatus: ticket.preflightStatus, customerProofStatus: ticket.customerProofStatus, handoffState: ticket.handoffState, paymentStatus: ticket.paymentStatus || order.paymentStatus || '', paymentGate: paymentReleased ? 'paid' : ticket.paymentGate || 'awaiting-payment', paymentReleased, blockReason: ticket.blockReason || '', dueDate: ticket.dueDate, artworkUploadId: ticket.artworkUploadId, updatedAt: ticket.updatedAt, needsCustomerDecision, needsReplacementArtwork, needsPayment: proofReleased(ticket) && !paymentReleased, needsDesignBrief, designBriefStatus: ticket.designBriefStatus || '', designBriefId: ticket.designBriefId || '', designQuoteStatus: ticket.designQuoteStatus || '', proofActionUrl: customerUrl(order, '/proof-action'), uploadArtworkUrl: customerUrl(order, '/storefront/upload-artwork'), designBriefUrl: customerUrl(order, '/design-brief') }; }
function nextAction(ticket: Store | null, order: Store) { const designNeeded = designHelpRequested(ticket, order); if (designNeeded && !designBriefSubmitted(ticket)) return { type: 'design-brief', label: 'Complete design brief', title: 'Design brief needed', href: customerUrl(order, '/design-brief'), priority: 'high', message: 'Please tell us what design you need. Staff will review it and confirm any extra design charge before design starts.' }; if (designNeeded && designBriefSubmitted(ticket)) return { type: 'design-review', label: 'Track order', title: 'Design brief received', href: customerUrl(order, '/track-order'), priority: 'medium', message: 'Your design brief is with the team for review. We will confirm any extra design charge before design starts.' }; if (!ticket) return !orderPaymentReleased(order) ? { type: 'payment-required', label: 'Check payment', title: 'Payment required', href: '', priority: 'medium', message: 'Payment must be completed before production can start.' } : null; const artwork = compactTicket(ticket, order); if (!artwork) return null; if (artwork.needsReplacementArtwork) return { type: 'upload-artwork', label: 'Upload artwork', title: 'Replacement artwork needed', href: artwork.uploadArtworkUrl, priority: 'high', message: 'Please upload corrected artwork so we can continue.' }; if (artwork.needsCustomerDecision) return { type: 'proof-review', label: 'Review proof', title: 'Proof approval needed', href: artwork.proofActionUrl, priority: 'high', message: 'Please approve the proof or request changes.' }; if (artwork.needsPayment) return { type: 'payment-required', label: 'Check payment email', title: 'Payment required before production', href: '', priority: 'high', message: 'Your proof is approved, but payment is still holding production. Please use your payment link email or contact the store.' }; return null; }
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
  return { order: compactOrder(order as Store), currentStage, message: publicMessage(currentStage, ticket, plannerJob, order as Store), progress: progress(currentStage), artwork: compactTicket(ticket, order as Store), nextAction: nextAction(ticket, order as Store), production: compactPlanner(plannerJob), dispatch: compactDispatch(plannerJob), generatedAt: new Date().toISOString() };
}
