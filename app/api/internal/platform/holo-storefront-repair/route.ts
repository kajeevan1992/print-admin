import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';
import {
  getHoloStorefrontRepairStatus,
  repairHoloDefaultStore,
} from '@/core/api/holo-storefront-repair.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONFIRMATION = 'REPAIR HOLO STOREFRONT';

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function failure(status: number, code: string, message: string) {
  return response({ ok: false, error: { code, message } }, status);
}

function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'HOLO storefront repair failed.';
  if (/admin session required/i.test(message)) return failure(401, 'ADMIN_SESSION_REQUIRED', message);
  if (/super admin access required/i.test(message)) return failure(403, 'SUPER_ADMIN_REQUIRED', message);
  if (/tenant .* was not found|multiple holo tenant/i.test(message)) return failure(409, 'HOLO_TENANT_UNSAFE', message);
  if (/no writable tenant database/i.test(message)) return failure(503, 'TENANT_DATABASE_REQUIRED', message);
  return failure(500, 'HOLO_STOREFRONT_REPAIR_FAILED', message);
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const data = await getHoloStorefrontRepairStatus();
    return response({ ok: true, resource: 'internal.platform.holo-storefront-repair', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (String(body?.confirmation || '').trim() !== CONFIRMATION) {
      return failure(400, 'HOLO_STOREFRONT_CONFIRMATION_REQUIRED', `Confirmation must be exactly ${CONFIRMATION}.`);
    }

    const data = await repairHoloDefaultStore(request);
    return response({ ok: true, resource: 'internal.platform.holo-storefront-repair', data }, data.changed ? 201 : 200);
  } catch (cause) {
    return errorResponse(cause);
  }
}
