import { NextResponse } from 'next/server';
import { listProductionJobTickets, saveProductionJobTicket, transitionProductionJobTicket } from '@/core/production/internal-production-jobs';
import { syncPlannerFromWorkflow, updatePlannerJob } from '@/core/storefront/production-planner';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function text(value: unknown) { return String(value || '').trim(); }
function riskFor(ticket: any) { if (ticket.status === 'blocked' || ticket.warnings?.length) return 'high'; if (ticket.priority === 'urgent' || ticket.priority === 'high' || ticket.priority === 'rush') return 'medium'; return 'low'; }
function plannerRisk(job: any) { if (job.stage === 'blocked' || job.productionBlocked || job.handoffState === 'blocked') return 'high'; if (job.lateRisk || job.priority === 'rush') return 'medium'; return 'low'; }
function dispatchStage(ticket: any) { if (ticket.status === 'dispatched') return 'handover'; if (ticket.dispatch?.manifestNumber) return 'manifested'; if (ticket.status === 'packing') return 'ready'; return 'ready'; }
function serviceFromMethod(method: string) { const value = method.toLowerCase(); if (value.includes('same')) return 'same-day'; if (value.includes('royal')) return 'tracked-24'; if (value.includes('courier') || value.includes('local')) return 'next-day'; if (value.includes('collection')) return 'collection'; return 'tracked-24'; }
function carrierFromMethod(method: string) { const value = method.toLowerCase(); if (value.includes('royal')) return 'Royal Mail'; if (value.includes('ups')) return 'UPS'; if (value.includes('dhl')) return 'DHL'; return 'DPD'; }
function isPlannerReleased(job: any) { return !(job.stage === 'blocked' || job.productionBlocked || job.handoffState === 'blocked') && ['dispatch', 'completed'].includes(String(job.stage)); }
function toShipment(ticket: any) {
  const dispatch = ticket.dispatch || {};
  return { id: ticket.id, productionJobId: ticket.id, source: 'production-ticket', batchCode: dispatch.dispatchBatchId || `JOB-${ticket.orderNumber || ticket.id}`, orderCount: 1, orderNumber: ticket.orderNumber, productName: ticket.productName, customerName: ticket.customerName, carrier: dispatch.carrier || 'DPD', service: dispatch.service || 'tracked-24', dock: dispatch.dock || 'North Dock', stage: dispatchStage(ticket), risk: riskFor(ticket), destinationZone: dispatch.destinationZone || 'UK', scanStatus: dispatch.scanStatus || (ticket.status === 'dispatched' ? 'complete' : 'partial'), cutoffAt: dispatch.cutoffAt || '15:00', trackingNumber: dispatch.trackingNumber || '', manifestNumber: dispatch.manifestNumber || '', status: ticket.status, storageSource: ticket.storageSource, notes: ticket.operatorNotes || ticket.notes || '', updatedAt: ticket.updatedAt };
}
function toPlannerShipment(job: any) {
  const method = text(job.dispatchMethod || job.selectedDelivery || job.delivery || 'courier');
  const stage = job.stage === 'completed' ? 'handover' : job.manifestNumber ? 'manifested' : 'ready';
  return { id: `planner-dispatch-${job.id}`, plannerJobId: job.id, productionJobId: job.id, source: 'production-planner', batchCode: job.dispatchBatchId || `JOB-${job.orderNumber || job.id}`, orderCount: 1, orderNumber: job.orderNumber, productName: job.productName || job.product || job.productSlug, customerName: job.customerName || job.customer, carrier: job.carrier || carrierFromMethod(method), service: job.service || serviceFromMethod(method), dock: job.dock || (method.toLowerCase().includes('collection') ? 'Front Counter' : 'North Dock'), stage, risk: plannerRisk(job), destinationZone: job.destinationZone || 'UK', scanStatus: job.stage === 'completed' ? 'complete' : job.scanStatus || 'partial', cutoffAt: job.cutoffAt || '15:00', trackingNumber: job.trackingNumber || '', manifestNumber: job.manifestNumber || '', status: job.status || job.stage, storageSource: job.source || 'production-planner', artworkUploadId: job.artworkUploadId || null, notes: job.blockReason || job.productionNotes || 'Released from artwork-gated production planner.', updatedAt: job.updatedAt };
}
function mergeShipments(items: any[]) { const byKey = new Map<string, any>(); for (const item of items) { const key = String(item.orderNumber || item.productionJobId || item.id); if (!byKey.has(key)) byKey.set(key, item); else byKey.set(key, { ...byKey.get(key), ...item }); } return Array.from(byKey.values()); }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: Request) {
  const [tickets, planner] = await Promise.all([listProductionJobTickets(request).catch(() => []), syncPlannerFromWorkflow(request).catch(() => ({ jobs: [] }))]);
  const ticketShipments = tickets.filter((ticket: any) => ['packing', 'dispatched'].includes(ticket.status)).map(toShipment);
  const plannerShipments = (Array.isArray((planner as any).jobs) ? (planner as any).jobs : []).filter(isPlannerReleased).map(toPlannerShipment);
  const items = mergeShipments([...ticketShipments, ...plannerShipments]);
  const held = (Array.isArray((planner as any).jobs) ? (planner as any).jobs : []).filter((job: any) => job.stage === 'blocked' || job.productionBlocked || job.handoffState === 'blocked').length;
  return json({ ok: true, source: 'dispatch-from-production-tickets-and-artwork-gated-planner', data: { items, count: items.length, heldByArtworkGate: held } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = text(body.plannerJobId || body.productionJobId || body.id);
    if (!id) return json({ ok: false, error: 'productionJobId or plannerJobId is required.' }, { status: 400 });
    const action = body.action || (body.stage === 'handover' || body.status === 'dispatched' ? 'mark-dispatched' : null);
    const planner = await syncPlannerFromWorkflow(request).catch(() => ({ jobs: [] }));
    const plannerJob = (Array.isArray((planner as any).jobs) ? (planner as any).jobs : []).find((job: any) => String(job.id) === id || String(job.orderNumber) === id);
    if (plannerJob) {
      if (plannerJob.stage === 'blocked' || plannerJob.productionBlocked || plannerJob.handoffState === 'blocked') return json({ ok: false, source: 'production-planner', error: plannerJob.blockReason || 'Artwork approval is required before dispatch.' }, { status: 400 });
      if (action === 'mark-dispatched' || body.stage === 'handover') {
        const result = await updatePlannerJob(request, { jobId: plannerJob.id, action: 'complete', note: 'Marked dispatched from Dispatch Center.' });
        const updated = (result.jobs || []).find((job: any) => String(job.id) === String(plannerJob.id)) || result.job || plannerJob;
        return json({ ok: true, source: 'production-planner', item: updated, shipment: toPlannerShipment(updated) });
      }
      return json({ ok: true, source: 'production-planner', item: plannerJob, shipment: toPlannerShipment(plannerJob) });
    }
    const ticketAction = action || (body.stage === 'handover' || body.status === 'dispatched' ? 'mark-dispatched' : null);
    const item = ticketAction ? await transitionProductionJobTicket(id, ticketAction, body, request) : await saveProductionJobTicket({ id, dispatch: body.dispatch || body, status: body.status }, request);
    return json({ ok: true, source: 'internal-dispatch-production-tickets', item, shipment: toShipment(item) });
  } catch (error) {
    return json({ ok: false, source: 'dispatch-from-production-tickets-and-planner', error: error instanceof Error ? error.message : 'Failed to update dispatch shipment.' }, { status: 500 });
  }
}
