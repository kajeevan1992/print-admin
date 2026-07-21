import { NextResponse } from 'next/server';
import { readStorefrontMediaAsset } from '@/theme-runtime/storefront-media.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { tenantSlug: string; storeSlug: string; assetId: string } };

function safeHeaderFilename(value: string) {
  return String(value || 'storefront-image').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 160);
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const asset = await readStorefrontMediaAsset(params.tenantSlug, params.storeSlug, params.assetId);
    if (!asset) return NextResponse.json({ ok: false, error: 'Storefront media asset not found.' }, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
    const body = asset.content instanceof Buffer ? asset.content : Buffer.from(asset.content as any);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': String(asset.sizeBytes),
        'Content-Disposition': `inline; filename="${safeHeaderFilename(asset.filename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: `"${asset.checksum}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Storefront media asset not found.' }, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
  }
}
