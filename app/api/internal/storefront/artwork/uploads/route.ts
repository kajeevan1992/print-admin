import { NextResponse } from 'next/server';
import { listArtworkUploads } from '@/core/storefront/internal-artwork-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uploads = await listArtworkUploads();
  return NextResponse.json({ ok: true, source: 'internal-storefront-artwork-uploads', data: { items: uploads, count: uploads.length } });
}
