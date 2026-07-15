import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { resolveStoreByHost } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:read']);
    if (!auth.ok) return auth.response;
    const url = new URL(request.url);
    const host = String(url.searchParams.get('host') || request.headers.get('host') || '').trim();
    if (!host) return NextResponse.json({ ok: false, error: 'HOST_REQUIRED', message: 'host is required.' }, { status: 400 });
    const store = await resolveStoreByHost(auth.ctx, host);
    if (!store) return NextResponse.json({ ok: false, error: 'STORE_NOT_FOUND', message: 'No published store/domain was found for this host.' }, { status: 404 });
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'resolve', tenant: { tenantId: auth.ctx.tenantId, siteId: store.storeId }, store });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STOREFRONT_RESOLVE_FAILED', message: error instanceof Error ? error.message : 'Resolve failed.' }, { status: 500 });
  }
}
