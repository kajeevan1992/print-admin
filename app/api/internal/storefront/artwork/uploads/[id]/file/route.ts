import { NextResponse } from 'next/server';
import { readArtworkUploadFile } from '@/core/storefront/internal-artwork-storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url);
    const { meta, buffer } = await readArtworkUploadFile(context.params.id);
    const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${meta.originalName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Artwork file not found.' }, { status: 404 });
  }
}
