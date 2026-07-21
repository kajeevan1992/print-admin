import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { listAdminArtworkProofs, resendArtworkProof, withdrawArtworkProof } from '@/core/operations/artwork-proofs.service';
import { sendArtworkProofReadyEmail } from '@/core/storefront/artwork-proof-notifications.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };
function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Artwork proof request failed.';
  if (/admin session required/i.test(message)) return json({ ok: false, error: message }, 401);
  if (/tenant access denied/i.test(message)) return json({ ok: false, error: message }, 403);
  if (/not found/i.test(message)) return json({ ok: false, error: message }, 404);
  if (/required|choose|only a proof|awaiting/i.test(message)) return json({ ok: false, error: message }, 400);
  return json({ ok: false, error: message }, 500);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const ticketId = clean(url.searchParams.get('ticketId'));
    const storeSlug = clean(url.searchParams.get('storeSlug'));
    if (!ticketId || !storeSlug) return json({ ok: false, error: 'Storefront and production ticket are required.' }, 400);
    const data = await listAdminArtworkProofs(session.tenantId, { ticketId, storeSlug });
    const proof = data.items.find((item: any) => item.id === context.params.id);
    if (!proof) return json({ ok: false, error: 'Artwork proof was not found.' }, 404);
    return json({ ok: true, source: 'internal-artwork-proofs', data: { proof } });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ ok: false, error: 'An artwork proof request body is required.' }, 400);
    const action = clean(body.action);
    if (action === 'resend') {
      const result = await resendArtworkProof(session.tenantId, { storeSlug: clean(body.storeSlug), proofId: context.params.id, actorId: session.id, actorLabel: session.name || session.email });
      const notification = await sendArtworkProofReadyEmail(request, {
        tenantSlug: result.tenantSlug,
        storeSlug: result.proof.storeSlug,
        storeName: result.storeName,
        email: result.customerEmail,
        customerName: result.customerName,
        orderNumber: result.proof.orderNumber,
        productName: result.proof.productName,
        revisionNumber: result.proof.revisionNumber,
        message: result.proof.message,
        accessToken: result.accessToken,
      }).catch(() => null);
      return json({ ok: true, source: 'internal-artwork-proofs', data: { proof: result.proof, notificationRequested: true, notificationQueued: Boolean(notification) } });
    }
    if (action === 'withdraw') {
      const proof = await withdrawArtworkProof(session.tenantId, { storeSlug: clean(body.storeSlug), proofId: context.params.id, actorId: session.id, actorLabel: session.name || session.email, note: clean(body.note) });
      return json({ ok: true, source: 'internal-artwork-proofs', data: { proof } });
    }
    return json({ ok: false, error: 'Choose resend or withdraw.' }, 400);
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST() {
  return json({ ok: false, error: 'Upload new proof revisions through POST /api/internal/artwork-proofs.' }, 410);
}
