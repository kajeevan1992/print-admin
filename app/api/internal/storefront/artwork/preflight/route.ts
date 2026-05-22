import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveArtworkPreflight } from '@/core/storefront/internal-artwork-preflight';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...corsHeaders(), ...(init?.headers || {}) },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  return json({ ok: true, source: 'internal-storefront-artwork-preflight', status: 'ready' });
}

export async function POST(request: Request) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const data = await resolveArtworkPreflight(ctx, body || {});
    return json(data);
  } catch (error) {
    return json({
      ok: false,
      source: 'internal-storefront-artwork-preflight',
      error: error instanceof Error ? error.message : 'Failed to preflight artwork.',
    }, { status: 500 });
  }
}
