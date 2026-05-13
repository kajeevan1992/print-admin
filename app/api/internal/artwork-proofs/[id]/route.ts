export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { addArtworkProofVersion, getArtworkProof, saveArtworkProof } from '@/core/operations/artwork-proofs.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-artwork-proofs-db',
    error: error instanceof Error ? error.message : 'Artwork proof request failed.',
  }, { status });
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const proof = await getArtworkProof(request, context.params.id);

    if (!proof) {
      return responseError(new Error('Artwork proof not found.'), 404);
    }

    return NextResponse.json({
      ok: true,
      source: 'internal-artwork-proofs-db',
      data: { proof },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const proof = await saveArtworkProof(request, { ...body, id: context.params.id });

    return NextResponse.json({
      ok: true,
      source: 'internal-artwork-proofs-db',
      data: { proof },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await addArtworkProofVersion(request, context.params.id, body);

    return NextResponse.json({
      ok: true,
      source: 'internal-artwork-proofs-db',
      data: result,
    });
  } catch (error) {
    return responseError(error);
  }
}
