import { NextResponse } from 'next/server';
import { getCustomerReuploadContext, saveReplacementArtwork } from '@/core/storefront/internal-artwork-reupload';

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const upload = await getCustomerReuploadContext(token);
  if (!upload) return json({ ok: false, error: 'This artwork upload link is invalid or expired.' }, { status: 404 });
  return json({ ok: true, source: 'internal-storefront-artwork-reupload', upload });
}

export async function POST(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    const result = await saveReplacementArtwork(request, token);
    return json({ ok: true, source: 'internal-storefront-artwork-reupload', upload: result.upload });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Replacement artwork upload failed.' }, { status: 500 });
  }
}
