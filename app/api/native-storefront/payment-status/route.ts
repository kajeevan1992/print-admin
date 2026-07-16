import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { retryStorefrontPayment, verifyStorefrontPaymentConfirmation } from '@/core/payments/storefront-payment-confirmation.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tenantSlug = slug(params.get('tenantSlug'));
  const storeSlug = slug(params.get('storeSlug'));
  const orderId = clean(params.get('orderId'));
  const paymentToken = clean(params.get('payment_token') || params.get('paymentToken'));
  const sessionId = clean(params.get('session_id') || params.get('sessionId'));
  const page = params.get('page') === 'cancel' ? 'cancel' as const : 'success' as const;
  const rateLimit = publicRateLimit(request, { scope: 'storefront-payment-status', limit: 90, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug, orderId].filter(Boolean).join(':') });
  if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'storefront-payment-status' }, { status: 429, headers: rateLimit.headers });
  if (!tenantSlug || !storeSlug || !orderId || !paymentToken) return json({ ok: false, error: 'Missing storefront payment confirmation details.' }, { status: 400, headers: rateLimit.headers });
  const confirmation = await verifyStorefrontPaymentConfirmation(request, { tenantSlug, storeSlug, orderId, paymentToken, sessionId, page });
  return json({ ok: confirmation.valid, source: 'storefront-payment-status', confirmation }, { status: confirmation.valid ? 200 : 403, headers: rateLimit.headers });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const tenantSlug = slug(body.tenantSlug);
  const storeSlug = slug(body.storeSlug);
  const orderId = clean(body.orderId);
  const paymentToken = clean(body.paymentToken || body.payment_token);
  const action = clean(body.action || 'retry').toLowerCase();
  const rateLimit = publicRateLimit(request, { scope: 'storefront-payment-retry', limit: 8, windowMs: 10 * 60 * 1000, identifier: [tenantSlug, storeSlug, orderId].filter(Boolean).join(':') });
  if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'storefront-payment-retry' }, { status: 429, headers: rateLimit.headers });
  if (action !== 'retry') return json({ ok: false, error: 'Unsupported payment action.' }, { status: 400, headers: rateLimit.headers });
  if (!tenantSlug || !storeSlug || !orderId || !paymentToken) return json({ ok: false, error: 'Missing storefront payment retry details.' }, { status: 400, headers: rateLimit.headers });
  try {
    const retry = await retryStorefrontPayment(request, { tenantSlug, storeSlug, orderId, paymentToken });
    return json({ ok: true, source: 'storefront-payment-retry', ...retry }, { headers: rateLimit.headers });
  } catch (error) {
    return json({ ok: false, source: 'storefront-payment-retry', error: error instanceof Error ? error.message : 'Payment could not be restarted.' }, { status: 400, headers: rateLimit.headers });
  }
}
