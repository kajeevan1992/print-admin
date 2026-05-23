import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listArtworkUploads } from '@/core/storefront/internal-artwork-storage';
import { artworkStorageStatus, listArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ctx = tenantContextFromRequest(request);
  const orderId = url.searchParams.get('orderId') || '';
  const quoteId = url.searchParams.get('quoteId') || '';
  const productIds = (url.searchParams.get('productIds') || '').split(',').map((item) => item.trim()).filter(Boolean);
  const dbUploads = await listArtworkMetadataDb(ctx).catch(() => null);
  const uploads = dbUploads || await listArtworkUploads();
  const filtered = uploads.filter((item) => {
    if (orderId && item.orderId === orderId) return true;
    if (quoteId && item.quoteId === quoteId) return true;
    if (productIds.length && item.productId && productIds.includes(item.productId)) return true;
    if (!orderId && !quoteId && !productIds.length) return true;
    return false;
  });
  const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
  return NextResponse.json({ ok: true, source: 'internal-storefront-artwork-uploads', storage, data: { items: filtered, count: filtered.length } });
}
