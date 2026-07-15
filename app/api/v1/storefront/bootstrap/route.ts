import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { bootstrapStore } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:read']);
    if (!auth.ok) return auth.response;
    const url = new URL(request.url);
    const storeId = String(url.searchParams.get('storeId') || auth.store?.storeId || '').trim();
    if (!storeId) return NextResponse.json({ ok: false, error: { code: 'STORE_ID_REQUIRED', message: 'storeId is required.' } }, { status: 400 });
    const data = await bootstrapStore(auth.ctx, storeId);
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'bootstrap', ...data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { code: 'STOREFRONT_BOOTSTRAP_FAILED', message: error instanceof Error ? error.message : 'Bootstrap failed.' } }, { status: 500 });
  }
}
