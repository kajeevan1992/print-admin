import { NextRequest, NextResponse } from 'next/server';
import { submitCustomerProofAction } from '@/core/storefront/customer-proof-action.service';
import { resolveCustomerOrderStatus } from '@/core/storefront/customer-order-status.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';

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
    const email = String(body?.email || '').trim();
    if (!email) return json({ ok: false, source: 'native-storefront-proof-action', error: 'Customer email is required to submit a proof decision.' }, { status: 400 });
    const rate = publicRateLimit(request, { scope: 'native-storefront-proof-action', limit: 12, windowMs: 10 * 60 * 1000, identifier: `${body?.orderId || body?.orderNumber || ''}:${email}:${body?.proofToken || body?.token || ''}` });
    if (rate.enforced) return json(rateLimitPayload(rate), { status: 429, headers: rate.headers });
    const result = await submitCustomerProofAction(request, { ...(body || {}), email });
    const status = await resolveCustomerOrderStatus(request, result.orderNumber, email).catch(() => null);
    return json({ ok: true, source: 'native-storefront-proof-action', result, data: { result, status } }, { headers: rate.headers });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-proof-action', error: error instanceof Error ? error.message : 'Proof action failed.' }, { status: 400 });
  }
}
