import { NextResponse } from 'next/server';
import { applyStripeCheckoutSessionToOrder, getStripeCheckoutSession, markStripeCheckoutCancelled } from '@/core/payments/stripe.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}
function text(value: unknown) { return String(value || '').trim(); }
function sessionOrderId(session: any) { return text(session?.client_reference_id || session?.metadata?.orderId || session?.metadata?.orderNumber); }
function trackUrl(order: any, fallbackOrderId: string) {
  const params = new URLSearchParams({ orderId: String(order?.orderNumber || order?.id || fallbackOrderId) });
  if (order?.customerEmail) params.set('email', String(order.customerEmail));
  return `/track-order?${params.toString()}`;
}
function errorRateLimit(request: Request) {
  return publicRateLimit(request, { scope: 'payment-return-error', limit: 90, windowMs: 10 * 60 * 1000 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function handle(request: Request, body: Record<string, any> = {}) {
  const url = new URL(request.url);
  const sessionId = text(body.sessionId || body.session_id || url.searchParams.get('session_id'));
  const orderId = text(body.orderId || body.orderNumber || url.searchParams.get('orderId') || url.searchParams.get('orderNumber'));
  const action = text(body.action || url.searchParams.get('action') || url.searchParams.get('status')) || 'success';
  const rateLimit = publicRateLimit(request, { scope: 'payment-return', limit: 60, windowMs: 10 * 60 * 1000, identifier: [sessionId, orderId].filter(Boolean).join(':') });
  if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'native-payment-return' }, { status: 429, headers: rateLimit.headers });

  if (action === 'cancel' || action === 'cancelled' || action === 'canceled') {
    if (!sessionId) return json({ ok: false, source: 'native-payment-return', error: 'session_id is required for cancelled checkout returns.' }, { status: 400, headers: rateLimit.headers });
    const session = await getStripeCheckoutSession(sessionId);
    const verifiedOrderId = sessionOrderId(session);
    if (!verifiedOrderId) return json({ ok: false, source: 'native-payment-return', error: 'Stripe session does not include an order reference.' }, { status: 400, headers: rateLimit.headers });
    if (orderId && ![verifiedOrderId, session?.metadata?.orderNumber].filter(Boolean).map(String).includes(orderId)) {
      return json({ ok: false, source: 'native-payment-return', error: 'Order does not match the Stripe session.' }, { status: 403, headers: rateLimit.headers });
    }
    const result = await markStripeCheckoutCancelled(request, { orderId: verifiedOrderId, sessionId, actor: 'customer' });
    return json({ ok: true, source: 'native-payment-return', action: 'cancel', result, trackUrl: trackUrl(result.order, verifiedOrderId), rateLimit: { mode: rateLimit.mode, remaining: rateLimit.remaining } }, { headers: rateLimit.headers });
  }

  if (!sessionId) return json({ ok: false, source: 'native-payment-return', error: 'session_id is required for payment success returns.' }, { status: 400, headers: rateLimit.headers });
  const session = await getStripeCheckoutSession(sessionId);
  const result = await applyStripeCheckoutSessionToOrder(request, session, 'checkout.session.return');
  const fallbackOrderId = orderId || session?.client_reference_id || session?.metadata?.orderNumber || session?.metadata?.orderId || '';
  return json({ ok: true, source: 'native-payment-return', action: 'success', sessionId, result, trackUrl: trackUrl(result.order, fallbackOrderId), rateLimit: { mode: rateLimit.mode, remaining: rateLimit.remaining } }, { headers: rateLimit.headers });
}

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    const fallbackLimit = errorRateLimit(request);
    return json({ ok: false, source: 'native-payment-return', error: error instanceof Error ? error.message : 'Payment return sync failed.', rateLimit: { mode: fallbackLimit.mode, remaining: fallbackLimit.remaining } }, { status: 500, headers: fallbackLimit.headers });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return await handle(request, body);
  } catch (error) {
    const fallbackLimit = errorRateLimit(request);
    return json({ ok: false, source: 'native-payment-return', error: error instanceof Error ? error.message : 'Payment return sync failed.', rateLimit: { mode: fallbackLimit.mode, remaining: fallbackLimit.remaining } }, { status: 500, headers: fallbackLimit.headers });
  }
}
