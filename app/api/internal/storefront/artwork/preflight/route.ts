import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveArtworkPreflight } from '@/core/storefront/internal-artwork-preflight';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const body = await request.json().catch(() => ({}));
  const data = await resolveArtworkPreflight(ctx, body || {});
  return NextResponse.json(data);
}
