import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { createStore } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:manage']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const store = await createStore(auth.ctx, body, request);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'management.stores.create', tenantId: auth.ctx.tenantId, store });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STORE_CREATE_FAILED', message: error instanceof Error ? error.message : 'Store creation failed.' }, { status: 500 });
  }
}
