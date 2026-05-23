import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readArtworkUploadFile } from '@/core/storefront/internal-artwork-storage';
import { readArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(request: Request, context: RouteContext) {
  try {
    const ctx = tenantContextFromRequest(request);
    const { searchParams } = new URL(request.url);
    const file = await readArtworkUploadFile(context.params.id);
    const dbMeta = await readArtworkMetadataDb(context.params.id, ctx).catch(() => null);
    const meta = dbMeta || file.meta;
    const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline';
    return new NextResponse(file.buffer, {
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${meta.originalName}"`,
        'Cache-Control': 'private, no-store',
        'X-Artwork-Storage': dbMeta ? 'db-metadata-file-bytes' : 'file-fallback',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Artwork file not found.' }, { status: 404 });
  }
}
