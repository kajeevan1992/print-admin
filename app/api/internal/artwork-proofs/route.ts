import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import {
  createArtworkProofRevision,
  listAdminArtworkProofs,
  resendArtworkProof,
  withdrawArtworkProof,
} from '@/core/operations/artwork-proofs.service';
import { sendArtworkProofReadyEmail } from '@/core/storefront/artwork-proof-notifications.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 22 * 1024 * 1024;
function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
function bool(value: unknown, fallback = false) { const text = clean(value).toLowerCase(); if (!text) return fallback; return ['1', 'true', 'yes', 'on'].includes(text); }
function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Artwork proof operation failed.';
  if (/admin session required/i.test(message)) return json({ ok: false, error: message }, 401);
  if (/tenant access denied/i.test(message)) return json({ ok: false, error: message }, 403);
  if (/not found/i.test(message)) return json({ ok: false, error: message }, 404);
  if (/choose|required|must be|valid|only a proof|up to|smaller|awaiting/i.test(message)) return json({ ok: false, error: message }, 400);
  return json({ ok: false, error: message }, 500);
}

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const data = await listAdminArtworkProofs(session.tenantId, {
      ticketId: url.searchParams.get('ticketId') || '',
      storeSlug: url.searchParams.get('storeSlug') || '',
    });
    return json({ ok: true, source: 'internal-artwork-proofs', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_REQUEST_BYTES) return json({ ok: false, error: 'Artwork proof requests must be 22 MB or smaller.' }, 413);
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      if ((clean(form.get('action')) || 'create-revision') !== 'create-revision') return json({ ok: false, error: 'Choose the create-revision action.' }, 400);
      const file = form.get('file');
      if (!(file instanceof File)) return json({ ok: false, error: 'Choose a proof file to upload.' }, 400);
      const result = await createArtworkProofRevision(session.tenantId, {
        storeSlug: clean(form.get('storeSlug')),
        ticketId: clean(form.get('ticketId')),
        file,
        message: clean(form.get('message')),
        customerEmail: clean(form.get('customerEmail')),
        customerName: clean(form.get('customerName')),
        actorId: session.id,
        actorLabel: session.name || session.email,
      });
      const shouldEmail = bool(form.get('sendEmail'), true);
      const notification = shouldEmail ? await sendArtworkProofReadyEmail(request, {
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
      }).catch(() => null) : null;
      return json({ ok: true, source: 'internal-artwork-proofs', data: { proof: result.proof, notificationRequested: shouldEmail, notificationQueued: Boolean(notification) } }, 201);
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ ok: false, error: 'An artwork proof request body is required.' }, 400);
    const action = clean(body.action);
    if (action === 'resend') {
      const result = await resendArtworkProof(session.tenantId, { storeSlug: clean(body.storeSlug), proofId: clean(body.proofId), actorId: session.id, actorLabel: session.name || session.email });
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
      const proof = await withdrawArtworkProof(session.tenantId, { storeSlug: clean(body.storeSlug), proofId: clean(body.proofId), actorId: session.id, actorLabel: session.name || session.email, note: clean(body.note) });
      return json({ ok: true, source: 'internal-artwork-proofs', data: { proof } });
    }
    return json({ ok: false, error: 'Choose create-revision, resend or withdraw.' }, 400);
  } catch (cause) {
    return errorResponse(cause);
  }
}
