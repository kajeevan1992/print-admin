import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { createQuoteRequest } from '@/core/storefront/internal-storefront-resolver';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await createQuoteRequest(tenantContextFromRequest(request), body || {});
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to create quote request.' }, { status: 500 });
  }
}
