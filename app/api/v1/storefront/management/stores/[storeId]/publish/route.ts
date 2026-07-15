import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { publishStore } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:manage']);
    if (!auth.ok) return auth.response;
    const store = await publishStore(auth.ctx, params.storeId);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'management.stores.publish', tenantId: auth.ctx.tenantId, store });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STORE_PUBLISH_FAILED', message: error instanceof Error ? error.message : 'Store publish failed.' }, { status: 500 });
  }
}
