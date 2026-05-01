export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { readCartItems } from '@/core/storefront/cart-checkout-bridge';
import { normaliseArtworkFiles, readArtworkRecords, updateCartItemArtwork, type StorefrontArtworkFileInput } from '@/core/storefront/artwork-preflight-bridge';
import { readStorefrontBody, storefrontError, storefrontSuccess } from '@/core/storefront/storefront-integrity';

const SOURCE = 'internal-storefront-artwork-bridge';

export async function GET(request: NextRequest) {
  try {
    const [cartItems, artworkRecords] = await Promise.all([readCartItems(request), readArtworkRecords(request)]);
    return storefrontSuccess(SOURCE, {
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
    });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readStorefrontBody(request);
    const cartItemId = String(body.cartItemId || body.itemId || '').trim();
    const notes = String(body.notes || body.artworkNotes || '').trim();
    const files = Array.isArray(body.files) ? body.files : body.file ? [body.file] : [];

    if (!cartItemId) throw new Error('Cart item id is required for artwork upload.');
    if (files.length === 0 && !notes) throw new Error('Select at least one artwork file or add artwork notes.');

    const uploads = normaliseArtworkFiles(files as StorefrontArtworkFileInput[], notes);
    if (files.length > 0 && uploads.length === 0) throw new Error('Artwork file name is required.');

    const result = await updateCartItemArtwork(request, cartItemId, uploads, notes);
    return storefrontSuccess(SOURCE, {
      item: result.item,
      artwork: {
        required: true,
        status: result.item.artwork?.status,
        uploads: result.item.artwork?.uploads || [],
        uploadCount: result.item.artwork?.uploads?.length || 0,
      },
      preflight: result.preflight,
      artworkRecord: result.artworkRecord,
    });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
