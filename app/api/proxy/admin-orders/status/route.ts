import { NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.orderId || !body?.status) {
      return NextResponse.json({ ok: false, error: 'INVALID_STATUS_PAYLOAD' }, { status: 400 });
    }

    const res = await fetch(`${getExternalApiBaseUrl()}/orders/${encodeURIComponent(body.orderId)}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: body.status }),
      cache: 'no-store',
    });

    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }

    return NextResponse.json({ ok: res.ok, upstreamStatus: res.status, payload }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, error: 'EXTERNAL_ADMIN_ORDER_STATUS_UNREACHABLE' }, { status: 502 });
  }
}
