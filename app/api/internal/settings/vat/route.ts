import { NextRequest, NextResponse } from 'next/server';
import { getGlobalVatSettings, saveGlobalVatSettings } from '@/core/tax/global-vat-settings';

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

export async function GET() {
  const settings = await getGlobalVatSettings();
  return json({ ok: true, source: 'internal-global-vat-settings', data: { settings }, settings });
}

async function handleWrite(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveGlobalVatSettings(body.settings || body);
    return json({ ok: true, source: 'internal-global-vat-settings', data: { settings }, settings });
  } catch (error) {
    return json({ ok: false, source: 'internal-global-vat-settings', error: error instanceof Error ? error.message : 'Failed to save VAT settings.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) { return handleWrite(request); }
export async function POST(request: NextRequest) { return handleWrite(request); }
