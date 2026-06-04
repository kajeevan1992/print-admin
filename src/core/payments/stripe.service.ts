import crypto from 'crypto';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getOrder, updateOrder } from '@/core/orders/orders.service';
import { canCreatePaymentSessionForOrder } from '@/core/payments/payment-rules';

type StripeSessionInput = { orderId: string; successUrl?: string; cancelUrl?: string; customerEmail?: string };
type StripeRefundInput = { orderId: string; amountMinor?: number; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'; note?: string; actor?: string };
type StripeEvent = { id?: string; type?: string; data?: { object?: any } };

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;

function secretKey() { return process.env.STRIPE_SECRET_KEY || ''; }
export function stripePublicConfig() { return { publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '', enabled: Boolean(process.env.STRIPE_SECRET_KEY), mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test' }; }
function assertStripeConfigured() { if (!secretKey()) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Coolify environment variables.'); }
function form(params: Record<string, string | number | boolean | undefined | null>) { const body = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') body.append(key, String(value)); }); return body; }
function appBase(request: Request) { const url = new URL(request.url); return `${url.protocol}//${url.host}`; }
function defaultReturnUrl(request: Request, path: string, orderId: string) { const base = String(process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || appBase(request)).replace(/\/$/, ''); return `${base}${path}?orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`; }

async function stripePost(path: string, params: Record<string, string | number | boolean | undefined | null>) {
  assertStripeConfigured();
  const response = await fetch(`${STRIPE_API_BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(params) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`);
  return payload;
}
async function stripeGet(path: string) { assertStripeConfigured(); const response = await fetch(`${STRIPE_API_BASE}${path}`, { headers: { Authorization: `Bearer ${secretKey()}` } }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`); return payload; }

export async function createStripeCheckoutSession(request: Request, input: StripeSessionInput) {
  const order = await getOrder(request, input.orderId);
  if (!order) throw new Error('Order not found.');
  const readiness = canCreatePaymentSessionForOrder(order);
  if (!readiness.ok) throw new Error(readiness.reason);
  const tenant = tenantContextFromRequest(request);
  const successUrl = input.successUrl || defaultReturnUrl(request, '/payment-success', order.id);
  const cancelUrl = input.cancelUrl || defaultReturnUrl(request, '/payment-cancel', order.id);
  const email = input.customerEmail || order.customerEmail || undefined;
  const session = await stripePost('/checkout/sessions', {
    mode: 'payment', success_url: successUrl, cancel_url: cancelUrl, customer_email: email, client_reference_id: order.id,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': String(order.currency || 'GBP').toLowerCase(),
    'line_items[0][price_data][unit_amount]': order.totalMinor,
    'line_items[0][price_data][product_data][name]': `Order ${order.orderNumber}`,
    'line_items[0][price_data][product_data][description]': `${order.items?.length || 0} print item(s)`,
    'metadata[orderId]': order.id, 'metadata[orderNumber]': order.orderNumber, 'metadata[tenantId]': tenant.tenantId || '',
    'payment_intent_data[metadata][orderId]': order.id, 'payment_intent_data[metadata][orderNumber]': order.orderNumber, 'payment_intent_data[metadata][tenantId]': tenant.tenantId || '',
  });
  await updateOrder(request, order.id, { paymentStatus: 'pending', paymentProvider: 'stripe', stripeCheckoutSessionId: session.id, stripePaymentIntentId: session.payment_intent || '', internalNotes: [...(order.internalNotes || []), `Stripe checkout session created: ${session.id}`] });
  return { session, order };
}

export async function getStripeCheckoutSession(sessionId: string) { return stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`); }

async function resolvePaymentIntentForOrder(request: Request, order: any) {
  if (order.stripePaymentIntentId) return String(order.stripePaymentIntentId);
  if (order.stripeCheckoutSessionId) {
    const session = await getStripeCheckoutSession(String(order.stripeCheckoutSessionId));
    if (session?.payment_intent) {
      await updateOrder(request, order.id, { stripePaymentIntentId: session.payment_intent, paymentProvider: 'stripe', internalNotes: [...(order.internalNotes || []), `Stripe payment intent resolved from session ${session.id}: ${session.payment_intent}`] });
      return String(session.payment_intent);
    }
  }
  return '';
}

export async function createStripeRefundForOrder(request: Request, input: StripeRefundInput) {
  const order = await getOrder(request, input.orderId);
  if (!order) throw new Error('Order not found.');
  const paymentIntentId = await resolvePaymentIntentForOrder(request, order);
  if (!paymentIntentId) throw new Error('No Stripe payment intent is linked to this order, so a real Stripe refund cannot be created. Use refund note for manual/offline refunds.');
  const amountMinor = Number(input.amountMinor || 0);
  if (amountMinor < 0) throw new Error('Refund amount cannot be negative.');
  const refund = await stripePost('/refunds', {
    payment_intent: paymentIntentId,
    amount: amountMinor > 0 ? Math.round(amountMinor) : undefined,
    reason: input.reason || 'requested_by_customer',
    'metadata[orderId]': order.id,
    'metadata[orderNumber]': order.orderNumber,
    'metadata[actor]': input.actor || 'admin',
    'metadata[note]': input.note || '',
  });
  return { refund, order, paymentIntentId };
}

export async function applyStripeCheckoutSessionToOrder(request: Request, session: any, eventType = 'manual') {
  const orderId = session?.metadata?.orderId || session?.client_reference_id;
  if (!orderId) return { ok: false, skipped: true, reason: 'Stripe session has no order metadata.' };
  const order = await getOrder(request, String(orderId));
  if (!order) return { ok: false, skipped: true, reason: `Order not found: ${orderId}` };
  const paid = session.payment_status === 'paid' || eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded';
  const failed = eventType === 'checkout.session.async_payment_failed' || session.payment_status === 'failed';
  const nextStatus = paid ? (order.status === 'AWAITING_PAYMENT' ? 'ARTWORK_CHECK' : order.status) : order.status;
  const note = paid ? `Stripe payment confirmed. Session: ${session.id}.` : failed ? `Stripe payment failed. Session: ${session.id}.` : `Stripe payment update (${eventType}). Session: ${session.id}.`;
  const updated = await updateOrder(request, order.id, { status: nextStatus, paymentStatus: paid ? 'paid' : failed ? 'failed' : session.payment_status || 'pending', paymentProvider: 'stripe', stripeCheckoutSessionId: session.id, stripePaymentIntentId: session.payment_intent || '', paidAt: paid ? new Date().toISOString() : order.paidAt, paymentFailureReason: failed ? eventType : order.paymentFailureReason, internalNotes: [...(order.internalNotes || []), note] });
  return { ok: true, order: updated, paid, failed, eventType };
}

function parseStripeSignature(header: string) { return header.split(',').reduce((acc, part) => { const [key, value] = part.split('='); if (key && value) { if (!acc[key]) acc[key] = []; acc[key].push(value); } return acc; }, {} as Record<string, string[]>); }
function verifyStripeSignature(raw: string, header: string, secret: string) {
  const parsed = parseStripeSignature(header);
  const timestamp = Number(parsed.t?.[0] || 0);
  const signatures = parsed.v1 || [];
  if (!timestamp || !signatures.length) throw new Error('Invalid Stripe signature header.');
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > SIGNATURE_TOLERANCE_SECONDS) throw new Error('Stripe webhook timestamp is outside tolerance.');
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const valid = signatures.some((signature) => { const actualBuffer = Buffer.from(signature, 'hex'); return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer); });
  if (!valid) throw new Error('Stripe webhook signature verification failed.');
}

export async function parseStripeWebhookEvent(request: Request): Promise<StripeEvent> {
  const raw = await request.text();
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const signature = request.headers.get('stripe-signature') || '';
  if (signingSecret) verifyStripeSignature(raw, signature, signingSecret);
  return JSON.parse(raw || '{}');
}
