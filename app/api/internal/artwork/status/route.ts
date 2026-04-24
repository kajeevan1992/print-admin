import { NextResponse } from 'next/server';
import { updateArtworkStatus } from '@/core/artwork/artwork.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const artworkId = body?.artworkId;
  const status = body?.status;

  if (!artworkId || !status) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_ARTWORK_STATUS_INPUT', message: 'artworkId and status are required.' } }, { status: 400 });
  }

  const data = await updateArtworkStatus({ tenantId: body?.tenantId || 'platform-demo' }, String(artworkId), String(status));
  return NextResponse.json({ ok: true, source: 'internal-core', data });
}
