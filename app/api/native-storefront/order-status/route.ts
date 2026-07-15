import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerOrderStatus } from '@/core/storefront/customer-order-status.service';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function normalizedStatus(status: any) {
  const actions = [];
  if (status?.artwork?.needsReplacementArtwork && status.artwork.uploadArtworkUrl) actions.push({ type: 'upload-artwork', label: 'Upload artwork', title: 'Replacement artwork needed', href: status.artwork.uploadArtworkUrl, priority: 'high' });
  if (status?.artwork?.needsCustomerDecision && status.artwork.proofActionUrl) actions.push({ type: 'proof-review', label: 'Review proof', title: 'Proof approval needed', href: status.artwork.proofActionUrl, priority: 'high' });
  return { ...status, actions, nextAction: status?.nextAction || actions[0] || null };
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: NextRequest) {
  try {
    const orderId = String(request.nextUrl.searchParams.get('orderId') || request.nextUrl.searchParams.get('orderNumber') || '').trim();
    const email = String(request.nextUrl.searchParams.get('email') || '').trim();
    if (!orderId) return json({ ok: false, error: 'orderId or orderNumber is required.' }, { status: 400 });
    if (!email) return json({ ok: false, error: 'Customer email is required to view order status.' }, { status: 400 });
    const status = await resolveCustomerOrderStatus(request, orderId, email);
    if (!status) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    if ((status as any).forbidden) return json({ ok: false, error: 'Order email does not match.' }, { status: 403 });
    return json({ ok: true, source: 'native-storefront-order-status', data: normalizedStatus(status) });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-order-status', error: error instanceof Error ? error.message : 'Order status failed.' }, { status: 500 });
  }
}
