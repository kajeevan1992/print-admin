import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { decideArtworkProof, getCustomerArtworkProof, listCustomerArtworkProofs } from '@/core/operations/artwork-proofs.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function json(data: unknown, status = 200, headers: Record<string, string> = {}) { return NextResponse.json(data, { status, headers: { ...headers, 'Cache-Control': 'private, no-store' } }); }
function errorStatus(message: string) { if (/sign-in|required|valid proof link/i.test(message)) return 401; if (/does not belong/i.test(message)) return 403; if (/not found/i.test(message)) return 404; return 400; }

export async function GET(request: NextRequest) {
  const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug'));
  const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug'));
  const token = clean(request.nextUrl.searchParams.get('token'));
  const proofId = clean(request.nextUrl.searchParams.get('proofId'));
  const limit = publicRateLimit(request, { scope: 'storefront-artwork-proof-read', limit: 30, windowMs: 15 * 60 * 1000, identifier: `${tenantSlug}:${storeSlug}:${proofId || token.slice(0, 12)}` });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'storefront-artwork-proof' }, 429, limit.headers);
  if (!tenantSlug || !storeSlug) return json({ ok: false, error: 'Storefront scope is required.' }, 400, limit.headers);
  try {
    if (!token && !proofId) {
      const data = await listCustomerArtworkProofs(request, { tenantSlug, storeSlug });
      return json({ ok: true, source: 'storefront-artwork-proof', data }, 200, limit.headers);
    }
    const proof = await getCustomerArtworkProof(request, { tenantSlug, storeSlug, token, proofId });
    return json({ ok: true, source: 'storefront-artwork-proof', data: { proof } }, 200, limit.headers);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Artwork proof could not be loaded.';
    return json({ ok: false, source: 'storefront-artwork-proof', error: message }, errorStatus(message), limit.headers);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const tenantSlug = slug(body?.tenantSlug);
  const storeSlug = slug(body?.storeSlug);
  const proofId = clean(body?.proofId);
  const token = clean(body?.token);
  const action = clean(body?.action).toLowerCase();
  const limit = publicRateLimit(request, { scope: 'storefront-artwork-proof-decision', limit: 10, windowMs: 15 * 60 * 1000, identifier: `${tenantSlug}:${storeSlug}:${proofId}:${action}` });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'storefront-artwork-proof' }, 429, limit.headers);
  if (!body || !tenantSlug || !storeSlug || !proofId) return json({ ok: false, error: 'Storefront and proof details are required.' }, 400, limit.headers);
  if (!['approve', 'request-changes'].includes(action)) return json({ ok: false, error: 'Choose approve or request-changes.' }, 400, limit.headers);
  try {
    const proof = await decideArtworkProof(request, {
      tenantSlug,
      storeSlug,
      proofId,
      token,
      decision: action as 'approve' | 'request-changes',
      note: clean(body.note),
    });
    return json({ ok: true, source: 'storefront-artwork-proof', data: { proof } }, 200, limit.headers);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Artwork proof decision failed.';
    return json({ ok: false, source: 'storefront-artwork-proof', error: message }, errorStatus(message), limit.headers);
  }
}
