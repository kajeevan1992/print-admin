import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { saveArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';

export const dynamic = 'force-dynamic';

function headers() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: headers() });
}

export async function POST(request: Request) {
  try {
    const ctx = tenantContextFromRequest(request);
    const formData = await request.formData();
    const upload = await saveArtworkUpload(ctx, formData);
    const dbUpload = await saveArtworkMetadataDb(upload, ctx).catch(() => null);
    const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
    return NextResponse.json({ ok: true, source: 'internal-storefront-artwork-upload', storage, upload: dbUpload || upload }, { headers: headers() });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-artwork-upload', error: error instanceof Error ? error.message : 'Artwork upload failed.' }, { status: 500, headers: headers() });
  }
}
