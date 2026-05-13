export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listArtworkProofs, saveArtworkProof } from '@/core/operations/artwork-proofs.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-artwork-proofs-db',
    error: error instanceof Error ? error.message : 'Artwork proofs request failed.',
  }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId');
    const status = request.nextUrl.searchParams.get('status');
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);

    const proofs = await listArtworkProofs(request, { orderId, status, limit });

    return NextResponse.json({
      ok: true,
      source: 'internal-artwork-proofs-db',
      data: { proofs, count: proofs.length },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const proof = await saveArtworkProof(request, body);

    return NextResponse.json({
      ok: true,
      source: 'internal-artwork-proofs-db',
      data: { proof },
    });
  } catch (error) {
    return responseError(error);
  }
}
