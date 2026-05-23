import { getOrder, updateOrder } from '@/core/orders/orders.service';
import type { ProductionJobTicket, ProductionTicketAction } from '@/core/production/internal-production-jobs';

type AutomationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  orderId?: string;
  orderStatus?: string;
  note?: string;
};

function statusFor(ticket: ProductionJobTicket, action?: ProductionTicketAction) {
  if (ticket.status === 'blocked' || action === 'block') return 'ARTWORK_CHECK';
  if (ticket.status === 'dispatched' || action === 'mark-dispatched') return 'DISPATCHED';
  if (ticket.status === 'packing') return 'QUALITY_CHECK';
  if (['ready-to-print', 'printing', 'finishing'].includes(ticket.status)) return 'IN_PRODUCTION';
  return null;
}

function workflowNote(ticket: ProductionJobTicket, action?: ProductionTicketAction) {
  const tracking = ticket.dispatch?.trackingNumber ? ` Tracking: ${ticket.dispatch.trackingNumber}.` : '';
  if (action === 'start-printing') return `Production automation: job ${ticket.id} started printing on ${ticket.machine || 'unassigned machine'}.`;
  if (action === 'finish-printing') return `Production automation: job ${ticket.id} print stage completed and moved to finishing.`;
  if (action === 'start-packing') return `Production automation: job ${ticket.id} moved to packing/dispatch preparation.`;
  if (action === 'mark-dispatched') return `Production automation: job ${ticket.id} marked dispatched.${tracking}`;
  if (action === 'block') return `Production automation: job ${ticket.id} blocked${ticket.blockedReason ? ` — ${ticket.blockedReason}` : ''}.`;
  if (action === 'unblock') return `Production automation: job ${ticket.id} unblocked and returned to production.`;
  return `Production automation: job ${ticket.id} updated to ${ticket.status}.`;
}

export async function applyOrderProductionAutomation(request: Request | undefined, ticket: ProductionJobTicket, action?: ProductionTicketAction): Promise<AutomationResult> {
  if (!request) return { ok: true, skipped: true, reason: 'No request context supplied.' };
  const orderKey = ticket.orderId || ticket.orderNumber;
  if (!orderKey) return { ok: true, skipped: true, reason: 'Production ticket is not linked to an order.' };
  const nextStatus = statusFor(ticket, action);
  if (!nextStatus) return { ok: true, skipped: true, reason: `No order automation rule for status ${ticket.status}.` };
  const order = await getOrder(request, orderKey).catch(() => null);
  if (!order) return { ok: true, skipped: true, reason: `Order ${orderKey} not found.`, orderId: orderKey };
  const note = workflowNote(ticket, action);
  const existingNotes = Array.isArray(order.internalNotes) ? order.internalNotes : [];
  const alreadyLogged = existingNotes.includes(note);
  const updated = await updateOrder(request, order.id, {
    status: nextStatus,
    internalNotes: alreadyLogged ? existingNotes : [...existingNotes, note],
  }).catch(() => null);
  return { ok: Boolean(updated), orderId: order.id, orderStatus: updated?.status || nextStatus, note };
}

export function describeOrderProductionAutomationRules() {
  return [
    { trigger: 'production.start-printing', orderStatus: 'IN_PRODUCTION', note: 'Order moves into production when print starts.' },
    { trigger: 'production.finish-printing', orderStatus: 'IN_PRODUCTION', note: 'Order remains in production and records that print moved to finishing.' },
    { trigger: 'production.start-packing', orderStatus: 'QUALITY_CHECK', note: 'Order moves to quality/packing before dispatch handover.' },
    { trigger: 'production.mark-dispatched', orderStatus: 'DISPATCHED', note: 'Order moves to dispatched and records tracking if available.' },
    { trigger: 'production.block', orderStatus: 'ARTWORK_CHECK', note: 'Order is moved back to artwork/check state when production is blocked.' },
    { trigger: 'production.unblock', orderStatus: 'IN_PRODUCTION', note: 'Order returns to production after unblock.' },
  ];
}
