import { NextResponse } from 'next/server';
import { listProductionJobTickets } from '@/core/production/internal-production-jobs';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}
function text(value: unknown) { return String(value || '').trim().toLowerCase(); }
function paymentReleased(ticket: Record<string, any>) {
  const status = text(ticket.paymentStatus || ticket.paymentGate);
  return ['paid', 'captured', 'authorized', 'manual-paid'].includes(status) || text(ticket.paymentGate) === 'paid';
}
function proofReleased(ticket: Record<string, any>) {
  return ['approved', 'ready-for-print'].includes(text(ticket.customerProofStatus)) || text(ticket.artworkStatus) === 'approved' || text(ticket.handoffState) === 'ready-for-print';
}
function gateFor(ticket: Record<string, any>) {
  const payment = paymentReleased(ticket);
  const proof = proofReleased(ticket);
  if (payment && proof) return 'ready-to-print';
  if (!payment && proof) return 'payment-held';
  if (payment && !proof) return 'proof-held';
  return 'proof-and-payment-held';
}
function summarize(items: Record<string, any>[]) {
  const gates = items.map(gateFor);
  return {
    total: items.length,
    readyToPrint: gates.filter((gate) => gate === 'ready-to-print').length,
    paymentHeld: gates.filter((gate) => gate === 'payment-held' || gate === 'proof-and-payment-held').length,
    proofHeld: gates.filter((gate) => gate === 'proof-held' || gate === 'proof-and-payment-held').length,
    blocked: gates.filter((gate) => gate !== 'ready-to-print').length,
    hasPaymentHold: gates.some((gate) => gate === 'payment-held' || gate === 'proof-and-payment-held'),
    hasProofHold: gates.some((gate) => gate === 'proof-held' || gate === 'proof-and-payment-held'),
    releaseState: gates.length === 0 ? 'no-production-jobs' : gates.every((gate) => gate === 'ready-to-print') ? 'released' : gates.some((gate) => gate === 'payment-held') ? 'payment-held' : gates.some((gate) => gate === 'proof-held') ? 'proof-held' : 'proof-and-payment-held',
  };
}
function enrichTicket(ticket: Record<string, any>) {
  const gate = gateFor(ticket);
  return {
    ...ticket,
    paymentReleased: paymentReleased(ticket),
    proofReleased: proofReleased(ticket),
    releaseGate: gate,
    releaseLabel: gate === 'ready-to-print' ? 'Proof and payment released' : gate === 'payment-held' ? 'Proof ready, payment held' : gate === 'proof-held' ? 'Payment ready, proof held' : 'Proof and payment held',
    canSchedule: gate === 'ready-to-print',
    canDispatch: gate === 'ready-to-print' && ['dispatch', 'completed', 'ready-to-dispatch'].includes(text(ticket.stage || ticket.status || ticket.handoffState)),
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request, context: RouteContext) {
  const id = context.params.id;
  const tickets = await listProductionJobTickets(request);
  const items = tickets.filter((ticket) => String(ticket.orderId || '') === id || String(ticket.orderNumber || '') === id || String(ticket.artworkUploadId || '') === id).map(enrichTicket);
  return json({ ok: true, source: 'internal-order-production-jobs', data: { items, count: items.length, summary: summarize(items) } });
}
