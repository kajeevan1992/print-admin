import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import {
  STOREFRONT_MEDIA_LIMITS,
  createStorefrontMediaAsset,
  deleteStorefrontMediaAsset,
  listStorefrontMediaAssets,
  updateStorefrontMediaAsset,
} from '@/theme-runtime/storefront-media.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function responseError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Storefront media operation failed.';
  if (/admin session required/i.test(message)) return responseError(401, 'ADMIN_SESSION_REQUIRED', message);
  if (/tenant access denied/i.test(message)) return responseError(403, 'TENANT_ACCESS_DENIED', message);
  if (/not found/i.test(message)) return responseError(404, 'STOREFRONT_MEDIA_NOT_FOUND', message);
  if (/choose|upload|must be|allowed|maximum|reached|still used|invalid|smaller|not allowed/i.test(message)) return responseError(400, 'STOREFRONT_MEDIA_INVALID', message);
  return responseError(500, 'STOREFRONT_MEDIA_FAILED', message);
}

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = url.searchParams.get('storeSlug') || '';
    if (!storeSlug) return responseError(400, 'STOREFRONT_STORE_REQUIRED', 'Choose a storefront before managing media.');
    const data = await listStorefrontMediaAssets(session.tenantId, storeSlug);
    return NextResponse.json({ ok: true, resource: 'internal.storefront-media', data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > STOREFRONT_MEDIA_LIMITS.maxFileBytes + 1024 * 1024) {
      return responseError(413, 'STOREFRONT_MEDIA_TOO_LARGE', `Storefront images must be ${Math.round(STOREFRONT_MEDIA_LIMITS.maxFileBytes / 1024 / 1024)} MB or smaller.`);
    }
    const form = await request.formData();
    const storeSlug = String(form.get('storeSlug') || '').trim();
    const file = form.get('file');
    if (!storeSlug) return responseError(400, 'STOREFRONT_STORE_REQUIRED', 'Choose a storefront before uploading media.');
    if (!(file instanceof File)) return responseError(400, 'STOREFRONT_MEDIA_FILE_REQUIRED', 'Choose an image to upload.');
    const data = await createStorefrontMediaAsset(session.tenantId, storeSlug, {
      filename: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
      label: String(form.get('label') || ''),
      altText: String(form.get('altText') || ''),
      createdBy: session.id,
    });
    return NextResponse.json({ ok: true, resource: 'internal.storefront-media', data }, { status: 201 });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireTenantSession();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return responseError(400, 'STOREFRONT_MEDIA_BODY_REQUIRED', 'A storefront media request body is required.');
    const storeSlug = String(body.storeSlug || '').trim();
    const assetId = String(body.assetId || '').trim();
    if (!storeSlug || !assetId) return responseError(400, 'STOREFRONT_MEDIA_TARGET_REQUIRED', 'Choose a storefront media asset to update.');
    const data = await updateStorefrontMediaAsset(session.tenantId, storeSlug, assetId, {
      label: String(body.label || ''),
      altText: String(body.altText || ''),
    });
    return NextResponse.json({ ok: true, resource: 'internal.storefront-media', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = url.searchParams.get('storeSlug') || '';
    const assetId = url.searchParams.get('assetId') || '';
    if (!storeSlug || !assetId) return responseError(400, 'STOREFRONT_MEDIA_TARGET_REQUIRED', 'Choose a storefront media asset to delete.');
    const data = await deleteStorefrontMediaAsset(session.tenantId, storeSlug, assetId);
    return NextResponse.json({ ok: true, resource: 'internal.storefront-media', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
