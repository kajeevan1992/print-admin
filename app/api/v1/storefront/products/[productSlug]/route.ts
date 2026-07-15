import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { productContract } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { productSlug: string } }) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:read']);
    if (!auth.ok) return auth.response;
    const data = await productContract(request, auth, params.productSlug);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'product', tenantId: auth.ctx.tenantId, storeId: auth.store?.storeId || auth.ctx.siteId || '', data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STOREFRONT_PRODUCT_FAILED', message: error instanceof Error ? error.message : 'Product lookup failed.' }, { status: 500 });
  }
}
