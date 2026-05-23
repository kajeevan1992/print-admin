import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/core/orders/orders.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

type PaymentAction = 'mark-paid' | 'mark-failed' | 'mark-refunded' | 'refund-note';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function noteFor(action: PaymentAction, body: Record<string, any>) {
  const admin = String(body.actor || body.adminName || 'admin');
  const note = String(body.note || '').trim();
  const ref = String(body.reference || body.paymentReference || '').trim();
  const amount = body.amountMinor ? ` Amount: £${(Number(body.amountMinor) / 100).toFixed(2)}.` : '';
  const refText = ref ? ` Reference: ${ref}.` : '';
  const extra = note ? ` Note: ${note}` : '';
  if (action === 'mark-paid') return `Payment manually marked PAID by ${admin}.${amount}${refText}${extra}`;
  if (action === 'mark-failed') return `Payment manually marked FAILED by ${admin}.${refText}${extra}`;
  if (action === 'mark-refunded') return `Payment manually marked REFUNDED by ${admin}.${amount}${refText}${extra}`;
  return `Refund/payment note added by ${admin}.${amount}${refText}${extra}`;
}

function patchFor(action: PaymentAction, order: any, body: Record<string, any>) {
  const now = new Date().toISOString();
  const base = {
    paymentProvider: body.paymentProvider || order.paymentProvider || 'manual',
    paymentReference: body.reference || body.paymentReference || order.paymentReference || '',
    refundAmountMinor: body.amountMinor || order.refundAmountMinor || '',
    refundNote: body.note || order.refundNote || '',
  };
  if (action === 'mark-paid') return { ...base, paymentStatus: 'paid', paidAt: body.paidAt || now, paymentFailureReason: '', status: ['AWAITING_PAYMENT', 'DRAFT', 'pending', 'draft'].includes(String(order.status)) ? 'ARTWORK_CHECK' : order.status };
  if (action === 'mark-failed') return { ...base, paymentStatus: 'failed', paymentFailureReason: body.note || 'Marked failed manually', status: ['DRAFT', 'draft'].includes(String(order.status)) ? 'AWAITING_PAYMENT' : order.status };
  if (action === 'mark-refunded') return { ...base, paymentStatus: 'refunded', refundedAt: body.refundedAt || now };
  return { ...base, paymentStatus: order.paymentStatus || 'paid' };
}

async function handle(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim() as PaymentAction;
    if (!['mark-paid', 'mark-failed', 'mark-refunded', 'refund-note'].includes(action)) {
      return json({ ok: false, source: 'internal-order-payment-admin', error: 'Unsupported payment action.' }, { status: 400 });
    }
    const order = await getOrder(request, context.params.id);
    if (!order) return json({ ok: false, source: 'internal-order-payment-admin', error: 'Order not found.' }, { status: 404 });
    const note = noteFor(action, body);
    const updated = await updateOrder(request, order.id, {
      ...patchFor(action, order, body),
      internalNotes: [...(order.internalNotes || []), note],
    });
    return json({ ok: true, source: 'internal-order-payment-admin', action, note, order: updated, data: { order: updated } });
  } catch (error) {
    return json({ ok: false, source: 'internal-order-payment-admin', error: error instanceof Error ? error.message : 'Payment action failed.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function PATCH(request: NextRequest, context: RouteContext) { return handle(request, context); }
