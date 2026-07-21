import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { readCustomerArtworkProofFile } from '@/core/operations/artwork-proofs.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function safeName(value: string) { return String(value || 'proof.pdf').replace(/[\r\n"\\]/g, '-').replace(/[^a-zA-Z0-9._ -]+/g, '-') || 'proof.pdf'; }

export async function GET(request: NextRequest) {
  const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug'));
  const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug'));
  const proofId = clean(request.nextUrl.searchParams.get('proofId'));
  const token = clean(request.nextUrl.searchParams.get('token'));
  const limit = publicRateLimit(request, { scope: 'storefront-artwork-proof-file', limit: 40, windowMs: 15 * 60 * 1000, identifier: `${tenantSlug}:${storeSlug}:${proofId}` });
  if (limit.enforced) return NextResponse.json({ ...rateLimitPayload(limit), source: 'storefront-artwork-proof-file' }, { status: 429, headers: { ...limit.headers, 'Cache-Control': 'private, no-store' } });
  if (!tenantSlug || !storeSlug || !proofId) return NextResponse.json({ ok: false, error: 'Storefront and proof details are required.' }, { status: 400, headers: { ...limit.headers, 'Cache-Control': 'private, no-store' } });
  try {
    const file = await readCustomerArtworkProofFile(request, { tenantSlug, storeSlug, proofId, token });
    const disposition = request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline';
    return new NextResponse(file.buffer, { headers: {
      ...limit.headers,
      'Content-Type': file.mimeType,
      'Content-Disposition': `${disposition}; filename="${safeName(file.fileName)}"`,
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'ETag': `"${file.checksum}"`,
    } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Artwork proof file was not found.';
    const status = /sign-in|required|valid proof link/i.test(message) ? 401 : /does not belong/i.test(message) ? 403 : /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ ok: false, source: 'storefront-artwork-proof-file', error: message }, { status, headers: { ...limit.headers, 'Cache-Control': 'private, no-store' } });
  }
}
