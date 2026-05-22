import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { saveArtworkUpload } from '@/core/storefront/internal-artwork-storage';

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
    const formData = await request.formData();
    const upload = await saveArtworkUpload(tenantContextFromRequest(request), formData);
    return NextResponse.json({ ok: true, source: 'internal-storefront-artwork-upload', upload }, { headers: headers() });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-artwork-upload', error: error instanceof Error ? error.message : 'Artwork upload failed.' }, { status: 500, headers: headers() });
  }
}
