import { NextResponse } from 'next/server';
import { verifyCredential, verifySignedCredential } from '@/core/platform/credentials.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const signed = request.headers.has('x-print-signature');
    const auth = signed ? await verifySignedCredential(request, 'catalog:read') : await verifyCredential(request, 'catalog:read');
    return NextResponse.json({ ok: true, source: 'public-api-v1-ping', auth });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Public API auth failed.' }, { status: 401 });
  }
}
