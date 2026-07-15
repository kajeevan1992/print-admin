import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { getStorefrontBootstrap, StorefrontApiError } from '@/core/storefront/storefront-api.service';
import { requireMatchingStoreSelectors, storefrontRouteError } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const storeId = requireMatchingStoreSelectors(request);
    if (!storeId) throw new StorefrontApiError(400, 'STORE_ID_REQUIRED', 'storeId and x-store-id are required.');
    const auth = await requirePublicApiCredentials(request, ['storefront:read']);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ ok: true, data: await getStorefrontBootstrap(auth, request, storeId) });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
