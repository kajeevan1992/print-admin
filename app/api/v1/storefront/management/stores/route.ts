import { NextResponse } from 'next/server';
import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { createStorefront } from '@/core/storefront/storefront-api.service';
import { storefrontRouteError } from '@/core/storefront/storefront-api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requirePublicApiCredentials(request, ['storefront:manage']);
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = request.headers.get('idempotency-key') || '';
    return NextResponse.json({ ok: true, data: await createStorefront(auth, idempotencyKey, body) }, { status: 201 });
  } catch (cause) {
    return storefrontRouteError(cause);
  }
}
