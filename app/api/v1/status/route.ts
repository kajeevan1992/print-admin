import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requirePublicApiCredentials(request, ['storefront:read']);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    api: 'public',
    version: 'v1',
    authenticated: true,
    tenantId: auth.ctx.tenantId,
    storeId: auth.store?.storeId || auth.ctx.siteId || '',
    scopes: auth.scopes,
    message: 'API credentials verified by the public API gateway foundation.',
  });
}
