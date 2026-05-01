import { NextResponse } from 'next/server';
import { listStorefrontProducts, getStorefrontProduct } from '@/core/storefront/storefront-product-catalog';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('slug') || url.searchParams.get('id')) {
      const data = await getStorefrontProduct(request);
      return NextResponse.json({ ok: true, data });
    }
    const data = await listStorefrontProducts(request);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Storefront products failed.' } }, { status: 500 });
  }
}
