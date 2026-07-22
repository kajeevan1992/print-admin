import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerOrderStatus } from '@/core/storefront/customer-order-status.service';
import { customerShipmentForOrder } from '@/core/dispatch/shipment.service';
import { customerPackageSummaryForShipment } from '@/core/dispatch/shipment-packages.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), 'Cache-Control': 'private, no-store', ...(init?.headers || {}) } }); }
function normalizedStatus(status: any) {
  const actions = [];
  if (status?.artwork?.needsReplacementArtwork && status.artwork.uploadArtworkUrl) actions.push({ type: 'upload-artwork', label: 'Upload artwork', title: 'Replacement artwork needed', href: status.artwork.uploadArtworkUrl, priority: 'high' });
  if (status?.artwork?.needsCustomerDecision && status.artwork.proofActionUrl) actions.push({ type: 'proof-review', label: 'Review proof', title: 'Proof approval needed', href: status.artwork.proofActionUrl, priority: 'high' });
  return { ...status, actions, nextAction: status?.nextAction || actions[0] || null };
}
function progress(stage: string) { const order = ['order', 'artwork', 'proof', 'production', 'dispatch', 'complete']; const active = order.indexOf(stage); return [{ key: 'order', label: 'Order received' }, { key: 'artwork', label: 'Artwork check' }, { key: 'proof', label: 'Proof approval' }, { key: 'production', label: 'Production' }, { key: 'dispatch', label: 'Dispatch' }, { key: 'complete', label: 'Complete' }].map((step) => ({ ...step, state: order.indexOf(step.key) < active ? 'done' : order.indexOf(step.key) === active ? 'active' : 'pending' })); }
function shipmentMessage(shipment: any) {
  if (shipment.status === 'collection-ready') return 'Your order is ready for collection.';
  if (shipment.status === 'collected') return 'Your order has been collected.';
  if (shipment.status === 'delivered') return 'Your shipment has been delivered.';
  if (shipment.status === 'exception') return 'There is a delivery exception. The store is reviewing it.';
  if (shipment.status === 'in-transit') return 'Your shipment is in transit.';
  if (shipment.status === 'dispatched') return 'Your order has been dispatched.';
  if (shipment.status === 'manifested') return 'Your shipment has been manifested for carrier handover.';
  return 'Your order is packed and being prepared for dispatch.';
}
function withShipment(status: any, shipment: any, packing: any) {
  if (!shipment) return status;
  const complete = ['delivered', 'collected'].includes(shipment.status);
  const currentStage = complete ? 'complete' : 'dispatch';
  const dispatch = { ...shipment, packages: packing?.items || [], packageSummary: packing?.summary || null };
  return { ...status, currentStage, message: shipmentMessage(shipment), progress: progress(currentStage), dispatch, shipmentEvents: shipment.events || [] };
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: NextRequest) {
  try {
    const orderId = String(request.nextUrl.searchParams.get('orderId') || request.nextUrl.searchParams.get('orderNumber') || '').trim();
    const email = String(request.nextUrl.searchParams.get('email') || '').trim();
    if (!orderId) return json({ ok: false, error: 'orderId or orderNumber is required.' }, { status: 400 });
    if (!email) return json({ ok: false, error: 'Customer email is required to view order status.' }, { status: 400 });
    const rate = publicRateLimit(request, { scope: 'native-storefront-order-status', limit: 40, windowMs: 5 * 60 * 1000, identifier: `${orderId}:${email}` });
    if (rate.enforced) return json(rateLimitPayload(rate), { status: 429, headers: rate.headers });
    const status = await resolveCustomerOrderStatus(request, orderId, email);
    if (!status) return json({ ok: false, error: 'Order was not found.' }, { status: 404, headers: rate.headers });
    if ((status as any).forbidden) return json({ ok: false, error: 'Order email does not match.' }, { status: 403, headers: rate.headers });
    const shipment = await customerShipmentForOrder(request, orderId, email).catch(() => null);
    const packing = shipment ? await customerPackageSummaryForShipment(request, shipment.id).catch(() => null) : null;
    return json({ ok: true, source: 'native-storefront-order-status', data: normalizedStatus(withShipment(status, shipment, packing)) }, { headers: rate.headers });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-order-status', error: error instanceof Error ? error.message : 'Order status failed.' }, { status: 500 });
  }
}
