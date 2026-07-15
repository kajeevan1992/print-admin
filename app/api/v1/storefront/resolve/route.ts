import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { resolveStorefrontByHost } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:resolve']);
    if (!auth.ok) return auth.response;
    const host = new URL(request.url).searchParams.get('host') || '';
    return NextResponse.json({ ok: true, data: await resolveStorefrontByHost(auth, host) });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
