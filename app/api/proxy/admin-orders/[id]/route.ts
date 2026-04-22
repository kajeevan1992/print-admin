import { NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const res = await fetch(`${getExternalApiBaseUrl()}/orders/${encodeURIComponent(id)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const text = await res.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    return NextResponse.json({ ok: res.ok, upstreamStatus: res.status, payload }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, error: 'EXTERNAL_ADMIN_ORDER_DETAIL_UNREACHABLE' }, { status: 502 });
  }
}
