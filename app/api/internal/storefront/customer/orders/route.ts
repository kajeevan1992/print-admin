import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listOrders } from '@/core/orders/orders.service';
import { listArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { listArtworkUploads } from '@/core/storefront/internal-artwork-storage';
import { listProductionJobTickets } from '@/core/production/internal-production-jobs';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id, X-Customer-Email',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

function customerEmail(request: NextRequest) { return String(request.nextUrl.searchParams.get('email') || request.headers.get('x-customer-email') || '').trim().toLowerCase(); }
function money(value: number) { return Math.round(Number(value || 0) * 100) / 100; }
function minorToMoney(value: unknown) { return money(Number(value || 0) / 100); }
function taxSummary(order: any) {
  const netMinor = Number(order.subtotalMinor || 0);
  const vatMinor = Number(order.taxMinor || 0);
  const deliveryMinor = Number(order.shippingMinor || 0);
  const grossMinor = Number(order.totalMinor || Math.round(Number(order.total || 0) * 100));
  return {
    currency: order.currency || 'GBP',
    netMinor,
    vatMinor,
    deliveryMinor,
    grossMinor,
    net: minorToMoney(netMinor),
    vat: minorToMoney(vatMinor),
    delivery: minorToMoney(deliveryMinor),
    gross: minorToMoney(grossMinor),
    vatBreakdown: Array.isArray(order.vatBreakdown) ? order.vatBreakdown : [],
    taxEnforcedAt: order.taxEnforcedAt || '',
  };
}
function artworkSummary(order: any, uploads: any[]) {
  const ids = new Set([...(order.artworkUploadIds || []), ...(order.items || []).map((item: any) => item.metadataJson?.artworkUploadId)].filter(Boolean).map(String));
  const productIds = new Set((order.items || []).map((item: any) => String(item.productId || item.sku || '')).filter(Boolean));
  const matched = uploads.filter((u) => (u.orderId && (u.orderId === order.id || u.orderId === order.orderNumber)) || ids.has(String(u.id)) || (u.productId && productIds.has(String(u.productId))));
  const latest = matched[0] || null;
  const blocked = matched.some((u) => u.reviewStatus === 'rejected' || u.reviewStatus === 'replacement-requested' || u.preflight?.preflight?.status === 'blocked');
  const approved = matched.length > 0 && matched.every((u) => u.reviewStatus === 'approved');
  const pending = matched.some((u) => !u.reviewStatus || u.reviewStatus === 'pending-review');
  return { count: matched.length, status: blocked ? 'replacement-required' : approved ? 'approved' : pending ? 'pending-review' : 'awaiting-artwork', latest, items: matched.slice(0, 12) };
}
function productionSummary(order: any, jobs: any[]) {
  const matched = jobs.filter((job) => job.orderId === order.id || job.orderId === order.orderNumber || job.orderNumber === order.orderNumber || job.orderNumber === order.id);
  const latest = matched[0] || null;
  return { count: matched.length, status: latest?.status || (order.status === 'DISPATCHED' ? 'dispatched' : order.status === 'IN_PRODUCTION' ? 'in-production' : 'not-started'), latest, items: matched.slice(0, 12) };
}
function deliverySummary(order: any, production: any) {
  const dispatch = production.latest?.dispatch || {};
  return { status: order.status === 'DISPATCHED' ? 'dispatched' : production.status === 'packing' ? 'packing' : 'not-dispatched', method: order.shippingMethod || dispatch.service || 'Standard', trackingNumber: dispatch.trackingNumber || order.trackingNumber || '', carrier: dispatch.carrier || '', dispatchedAt: production.latest?.dispatchedAt || dispatch.dispatchedAt || '' };
}
function normalise(order: any, uploads: any[], jobs: any[]) {
  const artwork = artworkSummary(order, uploads);
  const production = productionSummary(order, jobs);
  const delivery = deliverySummary(order, production);
  const tax = taxSummary(order);
  return { ...order, id: order.id, orderNumber: order.orderNumber, created_at: order.createdAt, total: tax.gross || money(order.total), artwork_status: artwork.status, delivery: delivery.method, customer: { name: order.customerName, email: order.customerEmail }, artwork, production, deliveryStatus: delivery, taxSummary: tax };
}

export async function GET(request: NextRequest) {
  try {
    const email = customerEmail(request);
    if (!email) return json({ ok: true, source: 'internal-storefront-customer-orders', data: { items: [], orders: [], count: 0, needsCustomerEmail: true } });
    const ctx = tenantContextFromRequest(request);
    const [orders, dbUploads, jobs] = await Promise.all([
      listOrders(request, { email, limit: Number(request.nextUrl.searchParams.get('limit') || 50) }),
      listArtworkMetadataDb(ctx).catch(() => null),
      listProductionJobTickets(request),
    ]);
    const uploads = dbUploads || await listArtworkUploads(ctx).catch(() => []);
    const items = orders.map((order) => normalise(order, uploads, jobs));
    return json({ ok: true, source: 'internal-storefront-customer-orders', data: { items, orders: items, count: items.length, customerEmail: email } });
  } catch (error) {
    return json({ ok: false, source: 'internal-storefront-customer-orders', error: error instanceof Error ? error.message : 'Failed to load customer orders.' }, { status: 500 });
  }
}
