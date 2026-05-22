import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveArtworkPreflight } from '@/core/storefront/internal-artwork-preflight';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, source: 'internal-catalog-artwork-preflight', status: 'ready' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await resolveArtworkPreflight(tenantContextFromRequest(request), body || {});
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-catalog-artwork-preflight', error: error instanceof Error ? error.message : 'Failed to preflight artwork.' }, { status: 500 });
  }
}
