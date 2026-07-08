import { NextResponse } from 'next/server';
import { getProductionJobTicket, saveProductionJobTicket, transitionProductionJobTicket } from '@/core/production/internal-production-jobs';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

const releaseRequiredActions = new Set(['queue', 'start-printing', 'finish-printing', 'start-packing', 'mark-dispatched', 'unblock']);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}
function text(value: unknown) { return String(value || '').trim().toLowerCase(); }
function paymentReleased(item: Record<string, any>) {
  const status = text(item.paymentStatus || item.paymentGate);
  return ['paid', 'captured', 'authorized', 'manual-paid'].includes(status) || text(item.paymentGate) === 'paid' || item.paymentReleased === true;
}
function proofReleased(item: Record<string, any>) {
  return item.proofReleased === true || ['approved', 'ready-for-print'].includes(text(item.customerProofStatus)) || text(item.artworkStatus) === 'approved' || text(item.handoffState) === 'ready-for-print';
}
function releaseGate(item: Record<string, any>) {
  const payment = paymentReleased(item);
  const proof = proofReleased(item);
  if (payment && proof) return 'ready-to-print';
  if (!payment && proof) return 'payment-held';
  if (payment && !proof) return 'proof-held';
  return 'proof-and-payment-held';
}
function releaseError(item: Record<string, any>, action: string) {
  if (!releaseRequiredActions.has(action)) return null;
  const gate = releaseGate(item);
  if (gate === 'ready-to-print' && text(item.status) !== 'blocked') return null;
  const reason = item.blockReason || item.blockedReason || (gate === 'payment-held' ? 'Payment has not been captured or authorised.' : gate === 'proof-held' ? 'Customer proof/artwork approval is still required.' : gate === 'proof-and-payment-held' ? 'Proof and payment are both holding this job.' : 'Job is blocked.');
  return `Production action "${action}" is blocked by release gate: ${reason}`;
}
function enrich(item: Record<string, any>) {
  const gate = releaseGate(item);
  return {
    ...item,
    paymentReleased: paymentReleased(item),
    proofReleased: proofReleased(item),
    releaseGate: gate,
    releaseLabel: gate === 'ready-to-print' ? 'Proof and payment released' : gate === 'payment-held' ? 'Proof ready, payment held' : gate === 'proof-held' ? 'Payment ready, proof held' : 'Proof and payment held',
    canSchedule: gate === 'ready-to-print' && text(item.status) !== 'blocked',
    canDispatch: gate === 'ready-to-print' && ['packing', 'dispatch', 'dispatched', 'completed'].includes(text(item.status || item.stage || item.handoffState)),
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request, context: RouteContext) {
  const item = await getProductionJobTicket(context.params.id, request);
  if (!item) return json({ ok: false, source: 'internal-production-job-tickets', error: 'Production job ticket not found.' }, { status: 404 });
  const enriched = enrich(item as Record<string, any>);
  return json({ ok: true, source: 'internal-production-job-tickets', data: enriched, item: enriched });
}

async function update(request: Request, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    const existing = await getProductionJobTicket(context.params.id, request);
    if (!existing) return json({ ok: false, source: 'internal-production-job-tickets', error: 'Production job ticket not found.' }, { status: 404 });
    if (action) {
      const block = releaseError(existing as Record<string, any>, action);
      if (block) return json({ ok: false, source: 'internal-production-job-tickets', releaseGate: releaseGate(existing as Record<string, any>), error: block }, { status: 409 });
    }
    const item = action
      ? await transitionProductionJobTicket(context.params.id, action as any, body, request)
      : await saveProductionJobTicket({ ...body, id: context.params.id }, request);
    const enriched = enrich(item as Record<string, any>);
    return json({ ok: true, source: 'internal-production-job-tickets', data: enriched, item: enriched });
  } catch (error) {
    return json({ ok: false, source: 'internal-production-job-tickets', error: error instanceof Error ? error.message : 'Failed to update production job ticket.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return update(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return update(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return update(request, context);
}
