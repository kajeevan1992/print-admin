import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { findStore, resolveStoreByHost } from '@/core/api/storefront-v1.service';

export const dynamic = 'force-dynamic';

function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function normaliseHost(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
}

function isTrustedPreviewHost(value: unknown) {
  const requestedHost = normaliseHost(value);
  return requestedHost === 'localhost'
    || requestedHost.endsWith('.localhost')
    || requestedHost.endsWith('.vercel.run')
    || requestedHost.endsWith('.vercel.app');
}

function authenticationRequest(request: Request, requestedHost: string) {
  if (!isTrustedPreviewHost(requestedHost)) return request;
  const url = new URL(request.url);
  url.searchParams.delete('host');
  return new Request(url, { method: request.method, headers: request.headers });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedHost = String(url.searchParams.get('host') || '').trim();
    if (!requestedHost) return error(400, 'HOST_REQUIRED', 'host is required.');

    const auth = await requirePublicApiCredentials(authenticationRequest(request, requestedHost), ['storefront:resolve']);
    if (!auth.ok) return auth.response;

    let store = await resolveStoreByHost(auth.ctx, requestedHost);
    if ((!store || store.status !== 'published') && isTrustedPreviewHost(requestedHost) && auth.store) {
      const authorisedStore = await findStore(auth.ctx, auth.store.storeId);
      if (authorisedStore?.status === 'published') store = authorisedStore;
    }

    if (!store || store.status !== 'published') {
      return error(404, 'STORE_NOT_FOUND', 'No published store/domain was found for this host.');
    }

    if (auth.stores.length > 0 && !auth.stores.some((allowed) => allowed.storeId === store.storeId)) {
      return error(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the resolved store.');
    }

    return NextResponse.json({ ok: true, api: 'storefront-v1', resource: 'resolve', tenant: { tenantId: auth.ctx.tenantId, siteId: store.storeId }, store });
  } catch (cause) {
    return error(500, 'STOREFRONT_RESOLVE_FAILED', cause instanceof Error ? cause.message : 'Resolve failed.');
  }
}
