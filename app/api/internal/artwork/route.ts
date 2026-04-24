import { NextResponse } from 'next/server';
import { listArtwork } from '@/core/artwork/artwork.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || 'platform-demo';
  const data = await listArtwork({ tenantId });

  return NextResponse.json({
    ok: true,
    source: 'internal-core',
    data,
  });
}
