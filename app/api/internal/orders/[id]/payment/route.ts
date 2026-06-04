import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession, createStripeRefundForOrder } from '@/core/payments/stripe.service';
import { queueOrderCustomerEmail } from '@/core/email/order-notifications.service';

export const dynamic = 'force-dynamic';

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
  return {
    successUrl: body.successUrl || `${base}/account?payment=success&orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: body.cancelUrl || `${base}/account?payment=cancel&orderId=${orderId}`,
  };
}

async function queuePaymentEmail(request: Request, action: PaymentAction, order: any, extra?: any) {
  if (action === 'create-payment-link' && extra?.paymentUrl) return queueOrderCustomerEmail(request, 'customer-payment-link', order, { paymentUrl: extra.paymentUrl, actor: 'admin' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Payment link email queue failed.' }));
  if (action === 'mark-paid') return queueOrderCustomerEmail(request, 'customer-payment-received', order, { actor: 'admin' }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Payment received email queue failed.' }));
  return null;
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
      const result = await createStripeRefundForOrder(request, {
        orderId: order.id,
        amountMinor: body.amountMinor ? Number(body.amountMinor) : undefined,
        reason: body.reason || 'requested_by_customer',
        note: body.note || '',
        actor: body.actor || 'admin',
      });
      extra = result.refund;
    }

    if (action === 'approve-quote') {
      const note = noteFor(action, body);
      const approved = await updateOrder(request, order.id, { ...patchFor(action, order, body), internalNotes: [...(order.internalNotes || []), note] });
      return json({ ok: true, source: 'internal-order-payment-admin', action, note, order: approved, data: { order: approved } });
    }

    if (action === 'create-payment-link') {
      if (String(order.status).toUpperCase() === 'AWAITING_APPROVAL') {
        const approveNote = noteFor('approve-quote', body);
        workingOrder = await updateOrder(request, order.id, { ...patchFor('approve-quote', order, body), internalNotes: [...(order.internalNotes || []), approveNote] }) || order;
      }
      const urls = storefrontReturnUrls(request, workingOrder, body);
      const sessionResult = await createStripeCheckoutSession(request, { orderId: workingOrder.id, customerEmail: body.customerEmail || workingOrder.customerEmail, successUrl: urls.successUrl, cancelUrl: urls.cancelUrl });
      extra = { provider: 'stripe', sessionId: sessionResult.session.id, id: sessionResult.session.id, paymentUrl: sessionResult.session.url };
    }

    const note = noteFor(action, body, extra);
    const updated = await updateOrder(request, workingOrder.id, { ...patchFor(action, workingOrder, body, extra), internalNotes: [...(workingOrder.internalNotes || []), note] });
    const emailQueue = await queuePaymentEmail(request, action, updated, extra);
    return json({ ok: true, source: 'internal-order-payment-admin', action, note, emailQueue, paymentUrl: extra?.paymentUrl, session: extra, refund: action === 'stripe-refund' ? extra : null, order: updated, data: { order: updated, paymentUrl: extra?.paymentUrl, session: extra, refund: action === 'stripe-refund' ? extra : null, emailQueue } });
  } catch (error) {
    return json({ ok: false, source: 'internal-order-payment-admin', error: error instanceof Error ? error.message : 'Payment action failed.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function PATCH(request: NextRequest, context: RouteContext) { return handle(request, context); }
