import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { createCheckoutSession } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:checkout']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const data = await createCheckoutSession(request, auth, body);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'checkout.session', tenantId: auth.ctx.tenantId, storeId: auth.store?.storeId || auth.ctx.siteId || '', data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STOREFRONT_CHECKOUT_SESSION_FAILED', message: error instanceof Error ? error.message : 'Checkout session failed.' }, { status: 500 });
  }
}
