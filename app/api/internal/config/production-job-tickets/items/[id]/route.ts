import { NextResponse } from 'next/server';
import { getProductionJobTicket, saveProductionJobTicket, transitionProductionJobTicket } from '@/core/production/internal-production-jobs';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(_request: Request, context: RouteContext) {
  const item = await getProductionJobTicket(context.params.id);
  if (!item) return json({ ok: false, source: 'internal-production-job-tickets', error: 'Production job ticket not found.' }, { status: 404 });
  return json({ ok: true, source: 'internal-production-job-tickets', data: item, item });
}

async function update(request: Request, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const item = body?.action
      ? await transitionProductionJobTicket(context.params.id, body.action, body)
      : await saveProductionJobTicket({ ...body, id: context.params.id });
    return json({ ok: true, source: 'internal-production-job-tickets', data: item, item });
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
