import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { calculateStorefrontPricing } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['pricing:calculate']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const data = await calculateStorefrontPricing(request, auth, body);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'pricing.calculate', tenantId: auth.ctx.tenantId, storeId: auth.store?.storeId || auth.ctx.siteId || '', data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Pricing calculation failed.';
    const status = /required|invalid/i.test(message) ? 400 : 500;
    return error(status, 'STOREFRONT_PRICING_FAILED', message);
  }
}
