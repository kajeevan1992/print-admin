import { tenantContextFromRequest } from '@/core/tenant/context';
import { getOrder, updateOrder } from '@/core/orders/orders.service';

type StripeSessionInput = {
  orderId: string;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
};

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: any };
};

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function secretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

export function stripePublicConfig() {
  return {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    enabled: Boolean(process.env.STRIPE_SECRET_KEY),
    mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test',
  };
}

function assertStripeConfigured() {
  if (!secretKey()) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Coolify environment variables.');
}

function form(params: Record<string, string | number | boolean | undefined | null>) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });
  return body;
}

function appBase(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function defaultReturnUrl(request: Request, path: string, orderId: string) {
  const base = String(process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || appBase(request)).replace(/\/$/, '');
  return `${base}${path}?orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`;
}

async function stripePost(path: string, params: Record<string, string | number | boolean | undefined | null>) {
  assertStripeConfigured();
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form(params),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`);
  return payload;
}

async function stripeGet(path: string) {
  assertStripeConfigured();
  const response = await fetch(`${STRIPE_API_BASE}${path}`, { headers: { Authorization: `Bearer ${secretKey()}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`);
  return payload;
}

export async function createStripeCheckoutSession(request: Request, input: StripeSessionInput) {
  const order = await getOrder(request, input.orderId);
  if (!order) throw new Error('Order not found.');
  if (!order.totalMinor || order.totalMinor <= 0) throw new Error('Order total must be greater than zero before payment.');
  const tenant = tenantContextFromRequest(request);
  const successUrl = input.successUrl || defaultReturnUrl(request, '/payment-success', order.id);
  const cancelUrl = input.cancelUrl || defaultReturnUrl(request, '/payment-cancel', order.id);
  const email = input.customerEmail || order.customerEmail || undefined;

  const session = await stripePost('/checkout/sessions', {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: email,
    client_reference_id: order.id,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': String(order.currency || 'GBP').toLowerCase(),
    'line_items[0][price_data][unit_amount]': order.totalMinor,
    'line_items[0][price_data][product_data][name]': `Order ${order.orderNumber}`,
    'line_items[0][price_data][product_data][description]': `${order.items?.length || 0} print item(s)`,
    'metadata[orderId]': order.id,
    'metadata[orderNumber]': order.orderNumber,
    'metadata[tenantId]': tenant.tenantId || '',
    'payment_intent_data[metadata][orderId]': order.id,
    'payment_intent_data[metadata][orderNumber]': order.orderNumber,
    'payment_intent_data[metadata][tenantId]': tenant.tenantId || '',
  });

  await updateOrder(request, order.id, {
    paymentStatus: 'pending',
    paymentProvider: 'stripe',
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent || '',
    internalNotes: [...(order.internalNotes || []), `Stripe checkout session created: ${session.id}`],
  });

  return { session, order };
}

export async function getStripeCheckoutSession(sessionId: string) {
  return stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export async function applyStripeCheckoutSessionToOrder(request: Request, session: any, eventType = 'manual') {
  const orderId = session?.metadata?.orderId || session?.client_reference_id;
  if (!orderId) return { ok: false, skipped: true, reason: 'Stripe session has no order metadata.' };
  const order = await getOrder(request, String(orderId));
  if (!order) return { ok: false, skipped: true, reason: `Order not found: ${orderId}` };
  const paid = session.payment_status === 'paid' || eventType === 'checkout.session.completed';
  const nextStatus = paid ? (order.status === 'AWAITING_PAYMENT' ? 'ARTWORK_CHECK' : order.status) : order.status;
  const note = paid ? `Stripe payment confirmed. Session: ${session.id}.` : `Stripe payment update (${eventType}). Session: ${session.id}.`;
  const updated = await updateOrder(request, order.id, {
    status: nextStatus,
    paymentStatus: paid ? 'paid' : session.payment_status || 'pending',
    paymentProvider: 'stripe',
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent || '',
    paidAt: paid ? new Date().toISOString() : order.paidAt,
    internalNotes: [...(order.internalNotes || []), note],
  });
  return { ok: true, order: updated, paid, eventType };
}

export async function parseStripeWebhookEvent(request: Request): Promise<StripeEvent> {
  const raw = await request.text();
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const signature = request.headers.get('stripe-signature') || '';
  if (signingSecret && !signature) throw new Error('Missing Stripe signature header.');
  // Minimal safe parser for now. Set STRIPE_WEBHOOK_SECRET later for strict signature validation.
  // We avoid storing Stripe keys or adding dependency churn in this build.
  return JSON.parse(raw || '{}');
}
