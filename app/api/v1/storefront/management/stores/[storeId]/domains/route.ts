import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { addStorefrontDomain } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:domains']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data: await addStorefrontDomain(auth, params.storeId, body) }, { status: 201 });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
