import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { getOrder, updateOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession, createStripeRefundForOrder } from '@/core/payments/stripe.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { queueOrderCustomerEmail } from '@/core/email/order-notifications.service';

export const dynamic = 'force-dynamic';

const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';

type RouteContext = { params: { id: string } };
type PaymentAction = 'mark-paid' | 'mark-failed' | 'mark-refunded' | 'refund-note' | 'stripe-refund' | 'approve-quote' | 'create-payment-link';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

function amountText(body: Record<string, any>) { return body.amountMinor ? ` Amount: £${(Number(body.amountMinor) / 100).toFixed(2)}.` : ''; }
function noteFor(action: PaymentAction, body: Record<string, any>, extra?: any) {
  const admin = String(body.actor || body.adminName || 'admin');
  const note = String(body.note || '').trim();
  const ref = String(body.reference || body.paymentReference || extra?.id || extra?.sessionId || '').trim();
  const amount = extra?.amount ? ` Amount: £${(Number(extra.amount) / 100).toFixed(2)}.` : amountText(body);
  const refText = ref ? ` Reference: ${ref}.` : '';
  const noteText = note ? ` Note: ${note}` : '';
  if (action === 'approve-quote') return `Quote/order approved by ${admin}. Payment link can now be created.${amount}${refText}${noteText}`;
  if (action === 'create-payment-link') return `Stripe payment link created by ${admin}.${refText}${noteText}`;
  if (action === 'stripe-refund') return `Stripe refund created by ${admin}.${amount}${refText} Status: ${extra?.status || 'created'}.${noteText}`;
  if (action === 'mark-paid') return `Payment manually marked PAID by ${admin}.${amount}${refText}${noteText}`;
  if (action === 'mark-failed') return `Payment manually marked FAILED by ${admin}.${refText}${noteText}`;
  if (action === 'mark-refunded') return `Payment manually marked REFUNDED by ${admin}.${amount}${refText}${noteText}`;
  return `Refund/payment note added by ${admin}.${amount}${refText}${noteText}`;
}
function paymentGate(status: string) { return ['paid', 'captured', 'authorized', 'manual-paid'].includes(String(status || '').toLowerCase()) ? 'paid' : 'awaiting-payment'; }
function paymentStatusFromPatch(patch: Record<string, any>, order: any) { return String(patch.paymentStatus || order.paymentStatus || '').toLowerCase(); }
function patchFor(action: PaymentAction, order: any, body: Record<string, any>, extra?: any) {
  const now = new Date().toISOString();
  const base = {
    paymentProvider: extra?.provider || (extra ? 'stripe' : body.paymentProvider || order.paymentProvider || 'manual'),
    paymentReference: body.reference || body.paymentReference || extra?.id || extra?.sessionId || order.paymentReference || '',
    refundAmountMinor: extra?.amount || body.amountMinor || order.refundAmountMinor || '',
    refundNote: body.note || order.refundNote || '',
    stripeCheckoutSessionId: extra?.sessionId || order.stripeCheckoutSessionId || '',
    stripeRefundId: extra?.refundId || extra?.id || order.stripeRefundId || '',
    stripeRefundStatus: extra?.refundStatus || extra?.status || order.stripeRefundStatus || '',
  };
  if (action === 'approve-quote') return { ...base, status: 'AWAITING_PAYMENT', paymentStatus: 'unpaid', paymentProvider: body.paymentProvider || order.paymentProvider || 'stripe', paymentFailureReason: '' };
  if (action === 'create-payment-link') return { ...base, status: 'AWAITING_PAYMENT', paymentStatus: 'pending', paymentProvider: 'stripe', paymentFailureReason: '' };
  if (action === 'mark-paid') return { ...base, paymentStatus: 'paid', paidAt: body.paidAt || now, paymentFailureReason: '', status: ['AWAITING_PAYMENT', 'DRAFT', 'pending', 'draft'].includes(String(order.status)) ? 'ARTWORK_CHECK' : order.status };
  if (action === 'mark-failed') return { ...base, paymentStatus: 'failed', paymentFailureReason: body.note || 'Marked failed manually', status: ['DRAFT', 'draft'].includes(String(order.status)) ? 'AWAITING_PAYMENT' : order.status };
  if (action === 'stripe-refund') return { ...base, paymentStatus: extra?.status === 'succeeded' ? 'refunded' : 'refund-pending', refundedAt: extra?.status === 'succeeded' ? now : order.refundedAt };
  if (action === 'mark-refunded') return { ...base, paymentStatus: 'refunded', refundedAt: body.refundedAt || now };
  return { ...base, paymentStatus: order.paymentStatus || 'paid' };
}
function storefrontReturnUrls(request: Request, order: any, body: Record<string, any>) {
  const origin = request.headers.get('origin') || new URL(request.url).origin;
  const base = String(body.storefrontUrl || process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || origin).replace(/\/$/, '');
  const orderId = encodeURIComponent(order.id);
  return { successUrl: body.successUrl || `${base}/account?payment=success&orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`, cancelUrl: body.cancelUrl || `${base}/account?payment=cancel&orderId=${orderId}` };
}
async function queuePaymentEmail(request: Request, action: PaymentAction, order: any, extra?: any) {
  if (action === 'create-payment-link' && extra?.paymentUrl) return queueOrderCustomerEmail(request, 'customer-payment-link', order, { paymentUrl: extra.paymentUrl, actor: 'admin' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Payment link email queue failed.' }));
  if (action === 'mark-paid') return queueOrderCustomerEmail(request, 'customer-payment-received', order, { actor: 'admin' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Payment received email queue failed.' }));
  return null;
}
async function readTickets(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, TICKETS_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items as Record<string, any>[] : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}
async function writeTickets(request: Request, items: Record<string, any>[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: TICKETS_KEY,
    slug: TICKETS_KEY,
    name: 'Production Job Tickets',
    description: 'Manufacturing job tickets with storefront artwork, preflight, payment and production handoff',
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: TICKETS_KEY, source: 'internal-order-payment-admin' },
  } as any);
}
async function syncProductionTicketPayment(request: Request, order: any, patch: Record<string, any>, note: string) {
  const status = paymentStatusFromPatch(patch, order);
  if (!status) return { updated: false, reason: 'no payment status' };
  const tickets = await readTickets(request).catch(() => []);
  if (!tickets.length) return { updated: false, reason: 'no production tickets' };
  const now = new Date().toISOString();
  let changed = false;
  const next = tickets.map((ticket) => {
    const values = [ticket.orderId, ticket.orderNumber, ticket.id].filter(Boolean).map(String);
    const matches = values.includes(String(order.id)) || values.includes(String(order.orderNumber));
    if (!matches) return ticket;
    changed = true;
    const gate = paymentGate(status);
    const proofReady = ['approved', 'ready-for-print'].includes(String(ticket.customerProofStatus || '').toLowerCase()) || ['approved'].includes(String(ticket.artworkStatus || '').toLowerCase()) || String(ticket.handoffState || '').toLowerCase() === 'ready-for-print';
    const blockedByPayment = gate !== 'paid';
    return {
      ...ticket,
      paymentStatus: status,
      paymentGate: gate,
      paymentProvider: patch.paymentProvider || ticket.paymentProvider || order.paymentProvider || '',
      paymentReference: patch.paymentReference || ticket.paymentReference || order.paymentReference || '',
      stripeCheckoutSessionId: patch.stripeCheckoutSessionId || ticket.stripeCheckoutSessionId || order.stripeCheckoutSessionId || '',
      stripeRefundId: patch.stripeRefundId || ticket.stripeRefundId || order.stripeRefundId || '',
      stripeRefundStatus: patch.stripeRefundStatus || ticket.stripeRefundStatus || order.stripeRefundStatus || '',
      orderStatus: patch.status || order.status,
      paidAt: patch.paidAt || ticket.paidAt || order.paidAt || '',
      status: proofReady && !blockedByPayment ? 'ready-to-print' : blockedByPayment ? 'payment-hold' : ticket.status,
      handoffState: proofReady && !blockedByPayment ? 'ready-for-print' : blockedByPayment ? 'blocked' : ticket.handoffState,
      blockReason: blockedByPayment ? 'Payment has not been captured or authorised.' : '',
      productionNotes: [ticket.productionNotes, note].filter(Boolean).join(' '),
      updatedAt: now,
    };
  });
  if (changed) await writeTickets(request, next);
  return { updated: changed, paymentStatus: status, paymentGate: paymentGate(status) };
}

async function handle(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim() as PaymentAction;
    if (!['mark-paid', 'mark-failed', 'mark-refunded', 'refund-note', 'stripe-refund', 'approve-quote', 'create-payment-link'].includes(action)) return json({ ok: false, source: 'internal-order-payment-admin', error: 'Unsupported payment action.' }, { status: 400 });
    const order = await getOrder(request, context.params.id);
    if (!order) return json({ ok: false, source: 'internal-order-payment-admin', error: 'Order not found.' }, { status: 404 });

    let extra: any = null;
    let workingOrder = order;

    if (action === 'stripe-refund') {
      const result = await createStripeRefundForOrder(request, { orderId: order.id, amountMinor: body.amountMinor ? Number(body.amountMinor) : undefined, reason: body.reason || 'requested_by_customer', note: body.note || '', actor: body.actor || 'admin' });
      extra = result.refund;
    }

    if (action === 'approve-quote') {
      const note = noteFor(action, body);
      const patch = patchFor(action, order, body);
      const approved = await updateOrder(request, order.id, { ...patch, internalNotes: [...(order.internalNotes || []), note] });
      const ticketPaymentSync = await syncProductionTicketPayment(request, approved || order, patch, note).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Ticket payment sync failed.' }));
      return json({ ok: true, source: 'internal-order-payment-admin', action, note, ticketPaymentSync, order: approved, data: { order: approved, ticketPaymentSync } });
    }

    if (action === 'create-payment-link') {
      if (String(order.status).toUpperCase() === 'AWAITING_APPROVAL') {
        const approveNote = noteFor('approve-quote', body);
        const approvePatch = patchFor('approve-quote', order, body);
        workingOrder = await updateOrder(request, order.id, { ...approvePatch, internalNotes: [...(order.internalNotes || []), approveNote] }) || order;
        await syncProductionTicketPayment(request, workingOrder, approvePatch, approveNote).catch(() => null);
      }
      const urls = storefrontReturnUrls(request, workingOrder, body);
      const sessionResult = await createStripeCheckoutSession(request, { orderId: workingOrder.id, customerEmail: body.customerEmail || workingOrder.customerEmail, successUrl: urls.successUrl, cancelUrl: urls.cancelUrl });
      extra = { provider: 'stripe', sessionId: sessionResult.session.id, id: sessionResult.session.id, paymentUrl: sessionResult.session.url };
    }

    const note = noteFor(action, body, extra);
    const patch = patchFor(action, workingOrder, body, extra);
    const updated = await updateOrder(request, workingOrder.id, { ...patch, internalNotes: [...(workingOrder.internalNotes || []), note] });
    const ticketPaymentSync = await syncProductionTicketPayment(request, updated || workingOrder, patch, note).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Ticket payment sync failed.' }));
    const emailQueue = await queuePaymentEmail(request, action, updated, extra);
    return json({ ok: true, source: 'internal-order-payment-admin', action, note, ticketPaymentSync, emailQueue, paymentUrl: extra?.paymentUrl, session: extra, refund: action === 'stripe-refund' ? extra : null, order: updated, data: { order: updated, paymentUrl: extra?.paymentUrl, session: extra, refund: action === 'stripe-refund' ? extra : null, emailQueue, ticketPaymentSync } });
  } catch (error) {
    return json({ ok: false, source: 'internal-order-payment-admin', error: error instanceof Error ? error.message : 'Payment action failed.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function PATCH(request: NextRequest, context: RouteContext) { return handle(request, context); }
