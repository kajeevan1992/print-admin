import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { readAdminArtworkProofFile } from '@/core/operations/artwork-proofs.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };
function safeName(value: string) { return String(value || 'proof.pdf').replace(/[\r\n"\\]/g, '-').replace(/[^a-zA-Z0-9._ -]+/g, '-') || 'proof.pdf'; }

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = String(url.searchParams.get('storeSlug') || '').trim();
    if (!storeSlug) return NextResponse.json({ ok: false, error: 'Choose a storefront.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    const file = await readAdminArtworkProofFile(session.tenantId, { storeSlug, proofId: context.params.id });
    const disposition = url.searchParams.get('download') === '1' ? 'attachment' : 'inline';
    return new NextResponse(file.buffer, { headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `${disposition}; filename="${safeName(file.fileName)}"`,
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'ETag': `"${file.checksum}"`,
    } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Artwork proof file was not found.';
    const status = /admin session required/i.test(message) ? 401 : /tenant access denied/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
