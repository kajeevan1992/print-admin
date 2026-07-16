import crypto from 'node:crypto';
import { getOrder } from '@/core/orders/orders.service';
import {
  applyStripeCheckoutSessionToOrder,
  createStripeCheckoutSession,
  getStripeCheckoutSession,
} from '@/core/payments/stripe.service';
import { loadPersistentBasket, markBasketConverted } from '@/core/storefront/persistent-basket.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const TOKEN_VERSION = 1;
const TOKEN_TTL_SECONDS = 48 * 60 * 60;

export type StorefrontPaymentState = 'paid' | 'authorized' | 'pending' | 'failed' | 'expired' | 'cancelled' | 'unpaid' | 'refunded' | 'invalid';

export type StorefrontPaymentConfirmation = {
  valid: boolean;
  verified: boolean;
  state: StorefrontPaymentState;
  orderId: string;
  orderNumber: string;
  currency: string;
  amountMinor: number;
  formattedTotal: string;
  message: string;
  canRetry: boolean;
  sessionId: string;
  sessionStatus: string;
  paymentStatus: string;
  basketConverted?: boolean;
  error?: string;
};

type TokenPayload = {
  v: number;
  tenantSlug: string;
  storeSlug: string;
  orderId: string;
  exp: number;
};

type VerifyInput = {
  tenantSlug: string;
  storeSlug: string;
  orderId: string;
  paymentToken: string;
  sessionId?: string;
  page: 'success' | 'cancel';
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function minor(value: unknown) { const amount = Number(value || 0); return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0; }
function formatMoney(value: number, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(value / 100); }
function tokenSecret() {
  const secret = process.env.STOREFRONT_PAYMENT_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.STRIPE_SECRET_KEY || '';
  if (!secret) throw new Error('Storefront payment confirmation is not configured. Add STOREFRONT_PAYMENT_TOKEN_SECRET or STRIPE_SECRET_KEY.');
  return secret;
}
function encode(payload: TokenPayload) { return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url'); }
function signature(encoded: string) { return crypto.createHmac('sha256', tokenSecret()).update(encoded, 'utf8').digest('base64url'); }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function paymentOrigin(request: Request) {
  const configured = clean(process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL).replace(/\/$/, '');
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
function scopedRequest(request: Request, tenantSlug: string) {
  const url = new URL(request.url);
  url.searchParams.set('tenantId', tenantSlug);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenantSlug);
  return new Request(url.toString(), { method: 'GET', headers });
}
function stripeOrderId(session: any) { return clean(session?.metadata?.orderId || session?.client_reference_id); }
function stripeTenantId(session: any) { return clean(session?.metadata?.tenantId); }
function stripeStoreSlug(session: any) { return slug(session?.metadata?.storeSlug); }
function orderStoreMatches(order: any, tenantSlug: string, storeSlug: string) {
  const resolver = order?.resolver || {};
  const orderTenant = slug(resolver.tenantSlug);
  const orderStore = slug(resolver.storeSlug);
  return (!orderTenant || orderTenant === slug(tenantSlug)) && (!orderStore || orderStore === slug(storeSlug));
}
function stateFrom(order: any, session: any, page: 'success' | 'cancel'): StorefrontPaymentState {
  const payment = clean(order?.paymentStatus || order?.payment?.paymentStatus).toLowerCase();
  if (payment === 'refunded') return 'refunded';
  if (['paid', 'captured'].includes(payment)) return 'paid';
  if (payment === 'authorized') return 'authorized';
  if (payment === 'expired' || session?.status === 'expired') return 'expired';
  if (payment === 'failed') return 'failed';
  if (payment === 'cancelled') return 'cancelled';
  if (session?.payment_status === 'paid') return 'paid';
  if (page === 'cancel') return 'cancelled';
  if (payment === 'unpaid') return 'unpaid';
  return 'pending';
}
function messageFor(state: StorefrontPaymentState) {
  if (state === 'paid') return 'Stripe has confirmed the payment and the order is ready for artwork and production processing.';
  if (state === 'authorized') return 'The payment is authorised and awaiting capture.';
  if (state === 'pending') return 'Stripe is still processing this payment. This page will update when confirmation arrives.';
  if (state === 'expired') return 'The Stripe Checkout session expired before payment was completed.';
  if (state === 'failed') return 'Stripe reported that the payment failed. You can safely try again.';
  if (state === 'cancelled') return 'Payment was not completed. Your order and basket remain available for another attempt.';
  if (state === 'refunded') return 'This order payment has been refunded.';
  if (state === 'unpaid') return 'This order has not been paid yet.';
  return 'The payment return link could not be verified.';
}
function retryAllowed(state: StorefrontPaymentState) { return ['pending', 'failed', 'expired', 'cancelled', 'unpaid'].includes(state); }
function invalid(input: VerifyInput, error: string): StorefrontPaymentConfirmation {
  return { valid: false, verified: false, state: 'invalid', orderId: clean(input.orderId), orderNumber: '', currency: 'GBP', amountMinor: 0, formattedTotal: '', message: messageFor('invalid'), canRetry: false, sessionId: clean(input.sessionId), sessionStatus: '', paymentStatus: '', error };
}

export function createStorefrontPaymentToken(input: { tenantSlug: string; storeSlug: string; orderId: string; expiresInSeconds?: number }) {
  const payload: TokenPayload = {
    v: TOKEN_VERSION,
    tenantSlug: slug(input.tenantSlug),
    storeSlug: slug(input.storeSlug),
    orderId: clean(input.orderId),
    exp: Math.floor(Date.now() / 1000) + Math.max(300, Number(input.expiresInSeconds || TOKEN_TTL_SECONDS)),
  };
  const encoded = encode(payload);
  return `${encoded}.${signature(encoded)}`;
}

export function verifyStorefrontPaymentToken(token: string, expected: { tenantSlug: string; storeSlug: string; orderId: string }) {
  const [encoded, suppliedSignature] = clean(token).split('.');
  if (!encoded || !suppliedSignature || !safeEqual(signature(encoded), suppliedSignature)) throw new Error('Payment confirmation token is invalid.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
  if (payload.v !== TOKEN_VERSION) throw new Error('Payment confirmation token version is invalid.');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Payment confirmation token has expired.');
  if (payload.tenantSlug !== slug(expected.tenantSlug) || payload.storeSlug !== slug(expected.storeSlug) || payload.orderId !== clean(expected.orderId)) throw new Error('Payment confirmation token does not match this store or order.');
  return payload;
}

export function buildStorefrontPaymentReturnUrls(request: Request, input: { tenantSlug: string; storeSlug: string; orderId: string; basketId?: string }) {
  const tenantSlug = slug(input.tenantSlug);
  const storeSlug = slug(input.storeSlug);
  const token = createStorefrontPaymentToken({ tenantSlug, storeSlug, orderId: input.orderId });
  const base = `${paymentOrigin(request)}/native-stores/${tenantSlug}/${storeSlug}`;
  const success = new URL(`${base}/checkout-success`);
  success.searchParams.set('orderId', input.orderId);
  success.searchParams.set('payment_token', token);
  success.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  if (input.basketId) success.searchParams.set('basketId', input.basketId);
  const cancel = new URL(`${base}/checkout-cancel`);
  cancel.searchParams.set('orderId', input.orderId);
  cancel.searchParams.set('payment_token', token);
  if (input.basketId) cancel.searchParams.set('basketId', input.basketId);
  return { token, successUrl: success.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}'), cancelUrl: cancel.toString() };
}

function validateSession(session: any, order: any, request: Request, input: VerifyInput) {
  if (!session?.id) throw new Error('Stripe Checkout session was not found.');
  if (stripeOrderId(session) !== clean(order.id)) throw new Error('Stripe Checkout session does not belong to this order.');
  const expectedTenant = clean(tenantContextFromRequest(scopedRequest(request, input.tenantSlug)).tenantId);
  if (!stripeTenantId(session) || stripeTenantId(session) !== expectedTenant) throw new Error('Stripe Checkout tenant does not match this storefront.');
  if (stripeStoreSlug(session) && stripeStoreSlug(session) !== slug(input.storeSlug)) throw new Error('Stripe Checkout store does not match this storefront.');
  if (clean(order.stripeCheckoutSessionId) && clean(order.stripeCheckoutSessionId) !== clean(session.id)) throw new Error('Stripe Checkout session is not the current payment session for this order.');
  if (minor(session.amount_total) !== minor(order.totalMinor)) throw new Error('Stripe Checkout amount does not match the order total.');
  if (clean(session.currency).toLowerCase() !== clean(order.currency || 'GBP').toLowerCase()) throw new Error('Stripe Checkout currency does not match the order currency.');
}

async function convertPaidBasket(request: Request, order: any) {
  const resolver = order?.resolver || {};
  const basketId = clean(resolver.basketId);
  const tenantSlug = slug(resolver.tenantSlug);
  const storeSlug = slug(resolver.storeSlug);
  if (!basketId || !tenantSlug || !storeSlug || resolver.source !== 'persistent-storefront-basket') return false;
  const scoped = scopedRequest(request, tenantSlug);
  const basket = await loadPersistentBasket(scoped, tenantSlug, storeSlug, basketId, { reprice: false });
  if (basket.status === 'converted' && basket.convertedOrderId === order.id) return true;
  await markBasketConverted(basket, order.id);
  return true;
}

export async function verifyStorefrontPaymentConfirmation(request: Request, input: VerifyInput): Promise<StorefrontPaymentConfirmation> {
  try {
    verifyStorefrontPaymentToken(input.paymentToken, input);
    const tenantRequest = scopedRequest(request, input.tenantSlug);
    let order = await getOrder(tenantRequest, input.orderId);
    if (!order) return invalid(input, 'Order was not found for this tenant.');
    if (!orderStoreMatches(order, input.tenantSlug, input.storeSlug)) return invalid(input, 'Order does not belong to this storefront.');
    let session: any = null;
    const requestedSession = clean(input.sessionId);
    const sessionId = requestedSession || clean(order.stripeCheckoutSessionId);
    if (input.page === 'success' && !requestedSession) return invalid(input, 'Stripe Checkout session reference is missing.');
    if (sessionId) {
      session = await getStripeCheckoutSession(sessionId);
      validateSession(session, order, request, input);
      const applied = await applyStripeCheckoutSessionToOrder(tenantRequest, session, 'storefront.confirmation');
      if (applied?.order) order = applied.order;
    }
    const state = stateFrom(order, session, input.page);
    const basketConverted = state === 'paid' ? await convertPaidBasket(request, order).catch(() => false) : false;
    const currency = clean(order.currency || session?.currency || 'GBP').toUpperCase();
    const amountMinor = minor(order.totalMinor);
    return {
      valid: true,
      verified: Boolean(session?.id),
      state,
      orderId: clean(order.id),
      orderNumber: clean(order.orderNumber),
      currency,
      amountMinor,
      formattedTotal: formatMoney(amountMinor, currency),
      message: messageFor(state),
      canRetry: retryAllowed(state),
      sessionId: clean(session?.id || sessionId),
      sessionStatus: clean(session?.status),
      paymentStatus: clean(order.paymentStatus),
      basketConverted,
    };
  } catch (error) {
    return invalid(input, error instanceof Error ? error.message : 'Payment confirmation failed.');
  }
}

export async function retryStorefrontPayment(request: Request, input: Omit<VerifyInput, 'page' | 'sessionId'>) {
  verifyStorefrontPaymentToken(input.paymentToken, input);
  const tenantRequest = scopedRequest(request, input.tenantSlug);
  const order = await getOrder(tenantRequest, input.orderId);
  if (!order) throw new Error('Order was not found for this tenant.');
  if (!orderStoreMatches(order, input.tenantSlug, input.storeSlug)) throw new Error('Order does not belong to this storefront.');
  const currentState = stateFrom(order, null, 'cancel');
  if (!retryAllowed(currentState)) throw new Error(currentState === 'paid' ? 'This order is already paid.' : 'This order is not eligible for another payment attempt.');
  const currentSessionId = clean(order.stripeCheckoutSessionId);
  if (currentSessionId) {
    const currentSession = await getStripeCheckoutSession(currentSessionId).catch(() => null);
    if (currentSession?.status === 'open' && currentSession?.url) {
      validateSession(currentSession, order, request, { ...input, page: 'cancel', sessionId: currentSessionId });
      return { paymentUrl: currentSession.url, reused: true, orderId: order.id, sessionId: currentSession.id };
    }
  }
  const resolver = order.resolver || {};
  const returns = buildStorefrontPaymentReturnUrls(request, { tenantSlug: input.tenantSlug, storeSlug: input.storeSlug, orderId: order.id, basketId: clean(resolver.basketId) || undefined });
  const result = await createStripeCheckoutSession(tenantRequest, { orderId: order.id, customerEmail: order.customerEmail, successUrl: returns.successUrl, cancelUrl: returns.cancelUrl, tenantSlug: input.tenantSlug, storeSlug: input.storeSlug, basketId: clean(resolver.basketId) || undefined });
  if (!result.session?.url) throw new Error('Stripe did not return a payment URL.');
  return { paymentUrl: result.session.url, reused: false, orderId: order.id, sessionId: result.session.id };
}
