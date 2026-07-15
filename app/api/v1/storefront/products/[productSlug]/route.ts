import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { getStorefrontProductContract, StorefrontApiError } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError, storefrontStoreId } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { productSlug: string } }) {
  try {
    const storeId = storefrontStoreId(request);
    if (!storeId) throw new StorefrontApiError(400, 'STORE_ID_REQUIRED', 'x-store-id is required.');
    const auth = await requirePublicApiCredentials(request, ['catalog:read']);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ ok: true, data: await getStorefrontProductContract(auth, request, storeId, params.productSlug) });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
