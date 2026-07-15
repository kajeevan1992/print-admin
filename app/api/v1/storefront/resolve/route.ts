import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { resolveStoreByHost } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:resolve']);
    if (!auth.ok) return auth.response;
    const url = new URL(request.url);
    const requestedHost = String(url.searchParams.get('host') || '').trim();
    if (!requestedHost) return error(400, 'HOST_REQUIRED', 'host is required.');
    const store = await resolveStoreByHost(auth.ctx, requestedHost);
    if (!store || store.status !== 'published') {
      return error(404, 'STORE_NOT_FOUND', 'No published store/domain was found for this host.');
    }
    if (auth.store && auth.store.storeId !== store.storeId) {
      return error(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the resolved store.');
    }
    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'resolve', tenant: { tenantId: auth.ctx.tenantId, siteId: store.storeId }, store });
  } catch (cause) {
    return error(500, 'STOREFRONT_RESOLVE_FAILED', cause instanceof Error ? cause.message : 'Resolve failed.');
  }
}
