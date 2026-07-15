import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { calculateStorefrontPricing } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:pricing']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const data = await calculateStorefrontPricing(request, auth, body);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'pricing.calculate', tenantId: auth.ctx.tenantId, storeId: auth.store?.storeId || auth.ctx.siteId || '', data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STOREFRONT_PRICING_FAILED', message: error instanceof Error ? error.message : 'Pricing calculation failed.' }, { status: 500 });
  }
}
