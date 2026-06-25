import { NextResponse } from 'next/server';
import { resolveStoreDomain } from '@/core/storefront/store-domain-bindings.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const host = url.searchParams.get('host') || request.headers.get('host') || '';
    const data = await resolveStoreDomain(host);
    return NextResponse.json({ ok: true, source: 'store-domain-resolver', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'store-domain-resolver', error: error instanceof Error ? error.message : 'Domain could not be resolved.' }, { status: 500 });
  }
}
