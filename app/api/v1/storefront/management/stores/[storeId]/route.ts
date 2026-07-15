import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { updateStorefront } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:manage']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data: await updateStorefront(auth, params.storeId, body, request) });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
