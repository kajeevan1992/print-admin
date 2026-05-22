import { NextResponse } from 'next/server';
import { listArtworkUploads } from '@/core/storefront/internal-artwork-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId') || '';
  const quoteId = url.searchParams.get('quoteId') || '';
  const productIds = (url.searchParams.get('productIds') || '').split(',').map((item) => item.trim()).filter(Boolean);
  const uploads = await listArtworkUploads();
  const filtered = uploads.filter((item) => {
    if (orderId && item.orderId === orderId) return true;
    if (quoteId && item.quoteId === quoteId) return true;
    if (productIds.length && item.productId && productIds.includes(item.productId)) return true;
    if (!orderId && !quoteId && !productIds.length) return true;
    return false;
  });
  return NextResponse.json({ ok: true, source: 'internal-storefront-artwork-uploads', data: { items: filtered, count: filtered.length } });
}
