import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { calculateStorefrontPrice, StorefrontApiError } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError, storefrontStoreId } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const storeId = storefrontStoreId(request);
    if (!storeId) throw new StorefrontApiError(400, 'STORE_ID_REQUIRED', 'x-store-id is required.');
    const auth = await requirePublicApiCredentials(request, ['pricing:calculate']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data: await calculateStorefrontPrice(auth, request, storeId, body) });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
