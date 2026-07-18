import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceSettings, saveInvoiceSettings } from '@/core/documents/invoice-settings';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: NextRequest) {
  const settings = await getInvoiceSettings(request);
  return json({ ok: true, source: 'tenant-invoice-settings', data: { settings }, settings });
}

async function handleWrite(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveInvoiceSettings(body.settings || body, request);
    return json({ ok: true, source: 'tenant-invoice-settings', data: { settings }, settings });
  } catch (error) {
    return json({ ok: false, source: 'tenant-invoice-settings', error: error instanceof Error ? error.message : 'Failed to save invoice settings.' }, { status: 500 });
  }
}
export async function PATCH(request: NextRequest) { return handleWrite(request); }
export async function POST(request: NextRequest) { return handleWrite(request); }
