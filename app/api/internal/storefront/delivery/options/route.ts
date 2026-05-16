import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveDeliveryOptions } from '@/core/storefront/internal-storefront-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await resolveDeliveryOptions(tenantContextFromRequest(request), {
      postcode: url.searchParams.get('postcode') || undefined,
      subtotalMinor: Number(url.searchParams.get('subtotalMinor') || 0),
    });
    return NextResponse.json({ ok: true, source: 'internal-storefront-resolver', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to resolve delivery options.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await resolveDeliveryOptions(tenantContextFromRequest(request), {
      postcode: body.postcode,
      subtotalMinor: body.subtotalMinor,
    });
    return NextResponse.json({ ok: true, source: 'internal-storefront-resolver', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to resolve delivery options.' }, { status: 500 });
  }
}
