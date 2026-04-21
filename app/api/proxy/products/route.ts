import { NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/external-api/config';
import { normalizeExternalProducts } from '@/external-api/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '12';
    const page = searchParams.get('page') || '1';
    const search = searchParams.get('search');

    const upstream = new URL(`${getExternalApiBaseUrl()}/products`);
    upstream.searchParams.set('limit', limit);
    upstream.searchParams.set('page', page);
    if (search) upstream.searchParams.set('search', search);

    const res = await fetch(upstream.toString(), { cache: 'no-store' });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, upstreamStatus: res.status, payload },
        { status: 502 }
      );
    }

    const items = normalizeExternalProducts(payload);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        raw: payload,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'EXTERNAL_PRODUCTS_UNREACHABLE' },
      { status: 502 }
    );
  }
}
