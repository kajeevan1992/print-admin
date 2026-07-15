import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';
import { provisionStorefrontTestTarget } from '@/core/api/storefront-provisioning.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json().catch(() => null);
    if (!body) return error(400, 'PROVISIONING_BODY_REQUIRED', 'A JSON provisioning payload is required.');

    const data = await provisionStorefrontTestTarget(request, body);
    return NextResponse.json({
      ok: true,
      resource: 'internal.platform.storefront-provisioning',
      data,
    }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Storefront provisioning failed.';
    if (/admin session required/i.test(message)) return error(401, 'ADMIN_SESSION_REQUIRED', message);
    if (/super admin access required/i.test(message)) return error(403, 'SUPER_ADMIN_REQUIRED', message);
    if (/required|must contain|invalid/i.test(message)) return error(400, 'STOREFRONT_PROVISIONING_INVALID', message);
    return error(500, 'STOREFRONT_PROVISIONING_FAILED', message);
  }
}
