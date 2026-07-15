import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { addStoreDomain } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:manage']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const data = await addStoreDomain(auth.ctx, params.storeId, body);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'management.stores.domains', tenantId: auth.ctx.tenantId, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STORE_DOMAIN_ADD_FAILED', message: error instanceof Error ? error.message : 'Store domain add failed.' }, { status: 500 });
  }
}
