export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createStripeCheckoutSession, createStripeRefundForOrder } from '@/core/payments/stripe.service';
import { getOrder, updateOrder } from '@/core/orders/orders.service';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function errorResponse(error: unknown, status = 500) { return json({ ok: false, source: 'internal-order-payment-actions', error: error instanceof Error ? error.message : 'Order payment action failed.' }, { status }); }
function clean(value: unknown) { return String(value || '').trim(); }
function now() { return new Date().toISOString(); }
function noteList(order: any, note: string) { return [...(Array.isArray(order?.internalNotes) ? order.internalNotes : []), note].filter(Boolean); }
function paymentStatusForAction(action: string) { if (action === 'mark-paid') return 'paid'; if (action === 'mark-failed') return 'failed'; if (action === 'mark-refunded') return 'refunded'; if (action === 'approve-quote') return 'pending'; return ''; }
function statusForPayment(paymentStatus: string, fallback: string) { if (['paid', 'captured', 'authorized'].includes(paymentStatus)) return 'APPROVED'; if (paymentStatus === 'refunded') return 'CANCELLED'; return fallback || 'AWAITING_PAYMENT'; }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const orderId = clean(params.orderId);
    if (!orderId) return json({ ok: false, error: 'orderId is required.' }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const action = clean(body.action);
    if (!action) return json({ ok: false, error: 'Payment action is required.' }, { status: 400 });
    const order = await getOrder(request, orderId);
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });

    if (action === 'create-payment-link') {
      const origin = new URL(request.url).origin;
      const successUrl = body.successUrl || `${origin}/orders/${encodeURIComponent(order.id)}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = body.cancelUrl || `${origin}/orders/${encodeURIComponent(order.id)}?payment=cancelled`;
      const result = await createStripeCheckoutSession(request, { orderId: order.id, customerEmail: body.customerEmail || order.customerEmail, successUrl, cancelUrl });
      return json({ ok: true, source: 'internal-order-payment-actions', order: result.order, paymentUrl: result.session?.url || '', session: result.session, data: { order: result.order, paymentUrl: result.session?.url || '', session: result.session } });
    }

    if (action === 'stripe-refund') {
      const refundResult = await createStripeRefundForOrder(request, { orderId: order.id, amountMinor: Number(body.amountMinor || 0), reason: body.reason || 'requested_by_customer', note: body.note || '', actor: body.actor || 'admin' });
      const updated = await updateOrder(request, order.id, { paymentStatus: 'refund-pending', stripeRefundId: refundResult.refund?.id || '', stripeRefundStatus: refundResult.refund?.status || 'pending', refundAmountMinor: Number(body.amountMinor || 0), refundNote: body.note || '', internalNotes: noteList(order, `Stripe refund created: ${refundResult.refund?.id || 'unknown'} by ${body.actor || 'admin'}.`) });
      return json({ ok: true, source: 'internal-order-payment-actions', order: updated, refund: refundResult.refund, data: { order: updated, refund: refundResult.refund } });
    }

    if (action === 'refund-note') {
      const updated = await updateOrder(request, order.id, { refundNote: body.note || '', internalNotes: noteList(order, `Refund note added by ${body.actor || 'admin'}: ${body.note || ''}`) });
      return json({ ok: true, source: 'internal-order-payment-actions', order: updated, data: { order: updated } });
    }

    const nextPaymentStatus = paymentStatusForAction(action);
    if (!nextPaymentStatus) return json({ ok: false, error: `Unsupported payment action: ${action}` }, { status: 400 });
    const paymentReference = clean(body.reference) || order.paymentReference || (action === 'mark-paid' ? `manual-${Date.now()}` : '');
    const note = `${action} by ${body.actor || 'admin'}${body.note ? `: ${body.note}` : ''}`;
    const updated = await updateOrder(request, order.id, {
      status: statusForPayment(nextPaymentStatus, order.status),
      paymentStatus: nextPaymentStatus,
      paymentProvider: body.paymentProvider || order.paymentProvider || (action === 'mark-paid' ? 'manual' : order.paymentProvider || ''),
      paymentReference,
      paidAt: action === 'mark-paid' ? now() : order.paidAt || '',
      refundedAt: action === 'mark-refunded' ? now() : order.refundedAt || '',
      paymentFailureReason: action === 'mark-failed' ? body.note || 'Marked failed by admin.' : '',
      refundNote: action === 'mark-refunded' ? body.note || order.refundNote || '' : order.refundNote || '',
      internalNotes: noteList(order, note),
    });
    return json({ ok: true, source: 'internal-order-payment-actions', order: updated, data: { order: updated } });
  } catch (error) {
    return errorResponse(error);
  }
}
