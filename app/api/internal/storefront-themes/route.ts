import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import {
  getStorefrontThemeAdminState,
  mutateStorefrontThemeAdmin,
  type StorefrontThemeAdminAction,
} from '@/theme-runtime/admin-service';
import { validateStorefrontSectionValues } from '@/theme-runtime/section-payload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function responseError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function action(value: unknown): StorefrontThemeAdminAction | null {
  const next = String(value || '').trim();
  return ['save-draft', 'publish', 'discard-draft'].includes(next) ? next as StorefrontThemeAdminAction : null;
}

function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Storefront theme operation failed.';
  if (/admin session required/i.test(message)) return responseError(401, 'ADMIN_SESSION_REQUIRED', message);
  if (/tenant access denied/i.test(message)) return responseError(403, 'TENANT_ACCESS_DENIED', message);
  if (/not found|not registered/i.test(message)) return responseError(404, 'STOREFRONT_THEME_NOT_FOUND', message);
  if (/must be|invalid|unsupported|required|too large|too many|nested/i.test(message)) return responseError(400, 'STOREFRONT_THEME_INVALID', message);
  return responseError(500, 'STOREFRONT_THEME_FAILED', message);
}

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const data = await getStorefrontThemeAdminState(session.tenantId, url.searchParams.get('storeSlug') || undefined);
    return NextResponse.json({ ok: true, resource: 'internal.storefront-themes', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return responseError(400, 'STOREFRONT_THEME_BODY_REQUIRED', 'A storefront theme request body is required.');
    const requestedAction = action(body.action);
    if (!requestedAction) return responseError(400, 'STOREFRONT_THEME_ACTION_INVALID', 'Choose save-draft, publish or discard-draft.');
    const storeSlug = String(body.storeSlug || '').trim();
    if (!storeSlug) return responseError(400, 'STOREFRONT_STORE_REQUIRED', 'Choose a storefront before changing its theme.');
    const rawValues = body.values && typeof body.values === 'object' && !Array.isArray(body.values) ? body.values as Record<string, unknown> : {};
    const values = requestedAction === 'discard-draft' ? rawValues : validateStorefrontSectionValues(rawValues);
    const data = await mutateStorefrontThemeAdmin(session.tenantId, {
      action: requestedAction,
      storeSlug,
      themeKey: String(body.themeKey || '').trim() || undefined,
      values,
    });
    return NextResponse.json({ ok: true, resource: 'internal.storefront-themes', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
