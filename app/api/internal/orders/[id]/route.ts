export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { runReadyCollectionAutomationForOrder } from '@/core/collection/ready-collection-automation.service';
import { getOrder, updateOrder } from '@/core/orders/orders.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';

type RouteContext = { params: { id: string } };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}
function errorResponse(error: unknown, status = 500) {
  return json({ ok: false, source: 'internal-orders-db', error: error instanceof Error ? error.message : 'Internal order request failed.' }, { status });
}
function paymentGate(status: string) {
  return ['paid', 'captured', 'authorized', 'manual-paid'].includes(String(status || '').toLowerCase()) ? 'paid' : 'awaiting-payment';
}
async function readTickets(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, TICKETS_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items as Record<string, any>[] : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}
async function writeTickets(request: Request, items: Record<string, any>[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: TICKETS_KEY,
    slug: TICKETS_KEY,
    name: 'Production Job Tickets',
    description: 'Manufacturing job tickets with storefront artwork, preflight, payment and production handoff',
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: TICKETS_KEY, source: 'internal-order-update' },
  } as any);
}
async function syncPaymentToTickets(request: Request, order: any, patch: Record<string, any>) {
  const status = String(patch.paymentStatus || order.paymentStatus || '').toLowerCase();
  if (!status) return { updated: false, reason: 'no payment status' };
  const tickets = await readTickets(request).catch(() => []);
  if (!tickets.length) return { updated: false, reason: 'no production tickets' };
  const gate = paymentGate(status);
  const now = new Date().toISOString();
  let changed = false;
  const next = tickets.map((ticket) => {
    const values = [ticket.orderId, ticket.orderNumber, ticket.id].filter(Boolean).map(String);
    const matches = values.includes(String(order.id)) || values.includes(String(order.orderNumber));
    if (!matches) return ticket;
    changed = true;
    const proofReady = ['approved', 'ready-for-print'].includes(String(ticket.customerProofStatus || '').toLowerCase()) || ['approved'].includes(String(ticket.artworkStatus || '').toLowerCase()) || String(ticket.handoffState || '').toLowerCase() === 'ready-for-print';
    const blockedByPayment = gate !== 'paid';
    return {
      ...ticket,
      paymentStatus: status,
      paymentGate: gate,
      paymentProvider: patch.paymentProvider || ticket.paymentProvider || order.paymentProvider || '',
      paymentReference: patch.paymentReference || ticket.paymentReference || order.paymentReference || '',
      orderStatus: patch.status || order.status,
      paidAt: patch.paidAt || ticket.paidAt || order.paidAt || '',
      status: proofReady && !blockedByPayment ? 'ready-to-print' : blockedByPayment ? 'payment-hold' : ticket.status,
      handoffState: proofReady && !blockedByPayment ? 'ready-for-print' : blockedByPayment ? 'blocked' : ticket.handoffState,
      blockReason: blockedByPayment ? 'Payment has not been captured or authorised.' : '',
      productionNotes: [ticket.productionNotes, `Order payment status synced from direct order update: ${status}.`].filter(Boolean).join(' '),
      updatedAt: now,
    };
  });
  if (changed) await writeTickets(request, next);
  return { updated: changed, paymentStatus: status, paymentGate: gate };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const order = await getOrder(request, params.id);
    if (!order) return errorResponse(new Error('Order was not found.'), 404);
    return json({ ok: true, source: 'internal-orders-db', order, data: { order } });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleUpdate(request: NextRequest, { params }: RouteContext) {
  try {
    const before = await getOrder(request, params.id).catch(() => null);
    const body = await request.json().catch(() => ({}));
    const order = await updateOrder(request, params.id, body || {});
    if (!order) return errorResponse(new Error('Order was not found.'), 404);
    const collectionAutomation = await runReadyCollectionAutomationForOrder(request, order, { previousStatus: before?.status, source: 'internal-order-update', sendNow: body?.sendCollectionReadyNow === true }).catch((error) => ({ ok: false, skipped: true, reason: error instanceof Error ? error.message : 'Collection automation failed.' }));
    const ticketPaymentSync = body?.paymentStatus ? await syncPaymentToTickets(request, order, body).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Ticket payment sync failed.' })) : { updated: false, skipped: true, reason: 'paymentStatus was not changed.' };
    return json({ ok: true, source: 'internal-orders-db', order, collectionAutomation, ticketPaymentSync, data: { order, collectionAutomation, ticketPaymentSync } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleUpdate(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleUpdate(request, context);
}
