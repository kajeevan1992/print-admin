import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import {
  listStorefrontPublishHistory,
  restoreStorefrontPublishVersion,
} from '@/theme-runtime/storefront-publish-history.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Storefront publish history operation failed.';
  if (/admin session required/i.test(message)) return json({ ok: false, error: { code: 'ADMIN_SESSION_REQUIRED', message } }, 401);
  if (/tenant access denied/i.test(message)) return json({ ok: false, error: { code: 'TENANT_ACCESS_DENIED', message } }, 403);
  if (/not found/i.test(message)) return json({ ok: false, error: { code: 'STOREFRONT_HISTORY_NOT_FOUND', message } }, 404);
  if (/choose|valid|confirm|already live|changed after|no longer installed/i.test(message)) return json({ ok: false, error: { code: 'STOREFRONT_HISTORY_INVALID', message } }, 400);
  return json({ ok: false, error: { code: 'STOREFRONT_HISTORY_FAILED', message } }, 500);
}

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = String(url.searchParams.get('storeSlug') || '').trim();
    if (!storeSlug) return json({ ok: false, error: { code: 'STOREFRONT_STORE_REQUIRED', message: 'Choose a storefront before viewing publish history.' } }, 400);
    const data = await listStorefrontPublishHistory(session.tenantId, storeSlug);
    return json({ ok: true, resource: 'internal.storefront-publish-history', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ ok: false, error: { code: 'STOREFRONT_HISTORY_BODY_REQUIRED', message: 'A restore request body is required.' } }, 400);
    if (String(body.action || '') !== 'restore') return json({ ok: false, error: { code: 'STOREFRONT_HISTORY_ACTION_INVALID', message: 'Choose the restore action.' } }, 400);
    const data = await restoreStorefrontPublishVersion(session.tenantId, {
      storeSlug: String(body.storeSlug || ''),
      version: Number(body.version),
      expectedCurrentVersion: body.expectedCurrentVersion === undefined ? undefined : Number(body.expectedCurrentVersion),
      confirmation: String(body.confirmation || ''),
      actorId: session.id,
    });
    return json({ ok: true, resource: 'internal.storefront-publish-history', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
