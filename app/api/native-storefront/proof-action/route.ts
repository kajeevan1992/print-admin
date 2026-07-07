import { NextRequest, NextResponse } from 'next/server';
import { submitCustomerProofAction } from '@/core/storefront/customer-proof-action.service';
import { resolveCustomerOrderStatus } from '@/core/storefront/customer-order-status.service';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await submitCustomerProofAction(request, body || {});
    const status = await resolveCustomerOrderStatus(request, result.orderNumber, body?.email).catch(() => null);
    return json({ ok: true, source: 'native-storefront-proof-action', result, data: { result, status } });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-proof-action', error: error instanceof Error ? error.message : 'Proof action failed.' }, { status: 400 });
  }
}
