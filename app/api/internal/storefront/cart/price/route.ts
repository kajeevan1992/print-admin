import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveStorefrontCartPrice } from '@/core/storefront/internal-storefront-resolver';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.productId && !body?.slug) {
      return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: 'Cart price resolve requires productId or slug.' }, { status: 400 });
    }
    const data = await resolveStorefrontCartPrice(tenantContextFromRequest(request), {
      productId: String(body.productId || body.slug),
      selections: body.selections || {},
      quantity: body.quantity,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to resolve cart price.' }, { status: 500 });
  }
}
