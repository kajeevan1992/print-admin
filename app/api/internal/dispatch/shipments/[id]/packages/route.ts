import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { listShipmentPackages, runShipmentPackageAction } from '@/core/dispatch/shipment-packages.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Packing operation failed.';
  if (/admin session required/i.test(message)) return json({ ok: false, error: message }, 401);
  if (/tenant access denied/i.test(message)) return json({ ok: false, error: message }, 403);
  if (/not found/i.test(message)) return json({ ok: false, error: message }, 404);
  if (/required|only|cannot|must|unsupported|invalid|up to|before|match|keep|add /i.test(message)) return json({ ok: false, error: message }, 400);
  return json({ ok: false, error: message }, 500);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = clean(url.searchParams.get('storeSlug'));
    if (!storeSlug) return json({ ok: false, error: 'storeSlug is required.' }, 400);
    const data = await listShipmentPackages(session.tenantId, storeSlug, context.params.id);
    return json({ ok: true, source: 'tenant-multi-box-packing', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireTenantSession();
    const input = await request.json().catch(() => null) as Record<string, any> | null;
    if (!input) return json({ ok: false, error: 'Packing request body is required.' }, 400);
    const storeSlug = clean(input.storeSlug);
    if (!storeSlug) return json({ ok: false, error: 'storeSlug is required.' }, 400);
    const actor = { id: session.id, label: session.name || session.email };
    const data = await runShipmentPackageAction(session.tenantId, storeSlug, context.params.id, input, actor);
    return json({ ok: true, source: 'tenant-multi-box-packing', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
