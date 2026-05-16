import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveStorefrontProduct } from '@/core/storefront/internal-storefront-resolver';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

function readSelections(request: Request) {
  const url = new URL(request.url);
  const selections: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'tenantId' && key !== 'siteId' && key !== 'databaseConnectionId') selections[key] = value;
  });
  return selections;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const data = await resolveStorefrontProduct(tenantContextFromRequest(request), decodeURIComponent(context.params.slug), readSelections(request));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to resolve product.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await resolveStorefrontProduct(tenantContextFromRequest(request), decodeURIComponent(context.params.slug), body?.selections || body || {});
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to resolve product.' }, { status: 500 });
  }
}
