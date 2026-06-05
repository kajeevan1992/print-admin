import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateCollectionPass } from '@/core/collection/collection-handover.service';

export const dynamic = 'force-dynamic';
type RouteContext = { params: { id: string } };

function customerEmail(request: NextRequest) {
  return String(request.nextUrl.searchParams.get('email') || request.headers.get('x-customer-email') || '').trim().toLowerCase();
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const result = await getOrCreateCollectionPass(request, context.params.id, { email: customerEmail(request) });
    const status = result.ok ? 200 : result.reason === 'order-not-found' || result.reason === 'email-mismatch' ? 404 : 200;
    return NextResponse.json({ ok: result.ok, source: 'internal-customer-collection-pass', data: result, error: result.ok ? undefined : result.reason }, { status });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-customer-collection-pass', error: error instanceof Error ? error.message : 'Failed to load collection pass.' }, { status: 500 });
  }
}
