import { NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(`${getExternalApiBaseUrl()}/health`, { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
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
        error: 'EXTERNAL_API_UNREACHABLE',
      },
      { status: 502 }
    );
  }
}
