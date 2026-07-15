import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { publishStorefront } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { storeId: string } }) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:publish']);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ ok: true, data: await publishStorefront(auth, params.storeId) });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
