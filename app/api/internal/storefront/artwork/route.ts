export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readCartItems } from '@/core/storefront/cart-checkout-bridge';
import { normaliseArtworkFiles, readArtworkRecords, updateCartItemArtwork, type StorefrontArtworkFileInput } from '@/core/storefront/artwork-preflight-bridge';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, source: 'internal-storefront-artwork-bridge', error: error instanceof Error ? error.message : 'Storefront artwork request failed.' }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const [cartItems, artworkRecords] = await Promise.all([readCartItems(request), readArtworkRecords(request)]);
    return NextResponse.json({
      ok: true,
      source: 'internal-storefront-artwork-bridge',
      data: {
        items: cartItems.map((item) => ({
          cartItemId: item.id,
          productId: item.productId,
          productSlug: item.productSlug,
          productName: item.productName,
          artworkRequired: item.artwork?.required !== false,
          artworkStatus: item.artwork?.status || 'not-uploaded',
          uploadCount: Array.isArray(item.artworkUploads) ? item.artworkUploads.length : 0,
          preflightStatus: item.artwork?.preflightStatus || item.preflightStatus || 'pending',
          productionBlock: Boolean(item.artwork?.productionBlock || item.productionBlocked),
          issues: item.artwork?.issues || item.preflightIssues || [],
        })),
        artworkRecords,
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cartItemId = String(body.cartItemId || body.itemId || '').trim();
    const notes = String(body.notes || body.artworkNotes || '').trim();
    const files = Array.isArray(body.files) ? body.files : body.file ? [body.file] : [];

    if (!cartItemId) return responseError(new Error('Cart item id is required for artwork upload.'), 400);
    if (files.length === 0 && !notes) return responseError(new Error('Select at least one artwork file or add artwork notes.'), 400);

    const uploads = normaliseArtworkFiles(files as StorefrontArtworkFileInput[], notes);
    if (files.length > 0 && uploads.length === 0) return responseError(new Error('Artwork file name is required.'), 400);

    const result = await updateCartItemArtwork(request, cartItemId, uploads, notes);
    return NextResponse.json({
      ok: true,
      source: 'internal-storefront-artwork-bridge',
      data: {
        item: result.item,
        artwork: {
          required: true,
          status: result.item.artwork?.status,
          uploads: result.item.artwork?.uploads || [],
          uploadCount: result.item.artwork?.uploads?.length || 0,
        },
        preflight: result.preflight,
        artworkRecord: result.artworkRecord,
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return responseError(error, status);
  }
}
