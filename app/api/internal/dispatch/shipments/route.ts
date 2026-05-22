import { NextResponse } from 'next/server';
import { listProductionJobTickets, saveProductionJobTicket, transitionProductionJobTicket } from '@/core/production/internal-production-jobs';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}

function riskFor(ticket: any) {
  if (ticket.status === 'blocked' || ticket.warnings?.length) return 'high';
  if (ticket.priority === 'urgent' || ticket.priority === 'high') return 'medium';
  return 'low';
}

function dispatchStage(ticket: any) {
  if (ticket.status === 'dispatched') return 'handover';
  if (ticket.dispatch?.manifestNumber) return 'manifested';
  if (ticket.status === 'packing') return 'ready';
  return 'ready';
}

function toShipment(ticket: any) {
  const dispatch = ticket.dispatch || {};
  return {
    id: ticket.id,
    productionJobId: ticket.id,
    batchCode: dispatch.dispatchBatchId || `JOB-${ticket.orderNumber || ticket.id}`,
    orderCount: 1,
    orderNumber: ticket.orderNumber,
    productName: ticket.productName,
    customerName: ticket.customerName,
    carrier: dispatch.carrier || 'DPD',
    service: dispatch.service || 'tracked-24',
    dock: dispatch.dock || 'North Dock',
    stage: dispatchStage(ticket),
    risk: riskFor(ticket),
    destinationZone: dispatch.destinationZone || 'UK',
    scanStatus: dispatch.scanStatus || (ticket.status === 'dispatched' ? 'complete' : 'partial'),
    cutoffAt: dispatch.cutoffAt || '15:00',
    trackingNumber: dispatch.trackingNumber || '',
    manifestNumber: dispatch.manifestNumber || '',
    status: ticket.status,
    notes: ticket.operatorNotes || ticket.notes || '',
    updatedAt: ticket.updatedAt,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  const tickets = await listProductionJobTickets();
  const dispatchable = tickets.filter((ticket) => ['packing', 'dispatched'].includes(ticket.status));
  const items = dispatchable.map(toShipment);
  return json({ ok: true, source: 'internal-dispatch-production-tickets', data: { items, count: items.length } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.productionJobId || body.id || '').trim();
    if (!id) return json({ ok: false, error: 'productionJobId is required.' }, { status: 400 });
    const action = body.action || (body.stage === 'handover' || body.status === 'dispatched' ? 'mark-dispatched' : null);
    const item = action
      ? await transitionProductionJobTicket(id, action, body)
      : await saveProductionJobTicket({ id, dispatch: body.dispatch || body, status: body.status });
    return json({ ok: true, source: 'internal-dispatch-production-tickets', item, shipment: toShipment(item) });
  } catch (error) {
    return json({ ok: false, source: 'internal-dispatch-production-tickets', error: error instanceof Error ? error.message : 'Failed to update dispatch shipment.' }, { status: 500 });
  }
}
