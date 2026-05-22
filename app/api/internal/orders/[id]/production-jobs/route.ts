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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(_request: Request, context: RouteContext) {
  const id = context.params.id;
  const tickets = await listProductionJobTickets();
  const items = tickets.filter((ticket) =>
    String(ticket.orderId || '') === id ||
    String(ticket.orderNumber || '') === id ||
    String(ticket.artworkUploadId || '') === id
  );
  return json({ ok: true, source: 'internal-order-production-jobs', data: { items, count: items.length } });
}
