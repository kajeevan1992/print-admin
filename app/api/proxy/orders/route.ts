import { NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_ORDER_PAYLOAD' },
        { status: 400 }
      );
    }

    const res = await fetch(`${getExternalApiBaseUrl()}/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await res.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    return NextResponse.json(
      {
        ok: res.ok,
        upstreamStatus: res.status,
        payload,
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'EXTERNAL_ORDER_SUBMIT_UNREACHABLE',
      },
      { status: 502 }
    );
  }
}
