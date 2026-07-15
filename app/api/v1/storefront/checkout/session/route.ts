import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { createCheckoutSession } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['checkout:create']);
    if (!auth.ok) return auth.response;
    const idempotencyKey = String(request.headers.get('idempotency-key') || '').trim();
    if (idempotencyKey.length < 16 || idempotencyKey.length > 200) {
      return error(400, 'IDEMPOTENCY_KEY_INVALID', 'idempotency-key must be between 16 and 200 characters.');
    }
    const body = await request.json().catch(() => ({}));
    const data = await createCheckoutSession(request, auth, { ...body, idempotencyKey });
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'checkout.session', tenantId: auth.ctx.tenantId, storeId: auth.store?.storeId || auth.ctx.siteId || '', data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Checkout session failed.';
    const status = /required|invalid/i.test(message) ? 400 : 500;
    return error(status, 'STOREFRONT_CHECKOUT_SESSION_FAILED', message);
  }
}
