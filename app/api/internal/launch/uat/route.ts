import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { readHoloLaunchUat, signOffHoloLaunchUat, updateHoloLaunchUatTask } from '@/core/launch/holo-launch-uat.service';
import { HOLO_LAUNCH_DEFAULTS } from '@/core/launch/holo-launch-uat-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
function errorResponse(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Launch UAT operation failed.';
  if (/admin session required/i.test(message)) return json({ ok: false, error: message }, 401);
  if (/tenant access denied|super admin/i.test(message)) return json({ ok: false, error: message }, 403);
  if (/not found/i.test(message)) return json({ ok: false, error: message }, 404);
  if (/choose|required|cannot|must|type |evidence|valid|all required|hard blockers/i.test(message)) return json({ ok: false, error: message }, 400);
  return json({ ok: false, error: message }, 500);
}

export async function GET(request: Request) {
  try {
    const session = await requireTenantSession();
    const url = new URL(request.url);
    const storeSlug = clean(url.searchParams.get('storeSlug')) || HOLO_LAUNCH_DEFAULTS.storeSlug;
    const data = await readHoloLaunchUat(session.tenantId, storeSlug);
    return json({ ok: true, source: 'holo-launch-uat', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantSession();
    const input = await request.json().catch(() => null) as Record<string, any> | null;
    if (!input) return json({ ok: false, error: 'Launch UAT request body is required.' }, 400);
    const storeSlug = clean(input.storeSlug) || HOLO_LAUNCH_DEFAULTS.storeSlug;
    const actor = { id: session.id, label: session.name || session.email };
    const action = clean(input.action).toLowerCase();
    const data = action === 'update-task'
      ? await updateHoloLaunchUatTask(session.tenantId, storeSlug, input, actor)
      : action === 'signoff'
        ? await signOffHoloLaunchUat(session.tenantId, storeSlug, input, actor)
        : null;
    if (!data) return json({ ok: false, error: 'Unsupported launch UAT action.' }, 400);
    return json({ ok: true, source: 'holo-launch-uat', data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
