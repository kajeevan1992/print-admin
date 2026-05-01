export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { buildCartItem, readCartItems, saveCartItems, summarizeCart, type StorefrontCartInput } from '@/core/storefront/cart-checkout-bridge';
import { recalculateCartSnapshot, readStorefrontBody, storefrontError, storefrontSuccess, validateStorefrontCartInput } from '@/core/storefront/storefront-integrity';

const SOURCE = 'internal-storefront-cart-bridge';

export async function GET(request: NextRequest) {
  try {
    const items = await recalculateCartSnapshot(request, await readCartItems(request));
    return storefrontSuccess(SOURCE, { items, totals: summarizeCart(items) });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await readStorefrontBody(request)) as StorefrontCartInput;
    validateStorefrontCartInput(body);

    const item = await buildCartItem(request, body);
    const existing = await readCartItems(request);
    const next = [item, ...existing.filter((entry) => String(entry.id) !== String(item.id))];
    await saveCartItems(request, next);

    const items = await recalculateCartSnapshot(request, next);
    return storefrontSuccess(SOURCE, { item, items, totals: summarizeCart(items) });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await readStorefrontBody(request)) as StorefrontCartInput;
    if (!body.id) throw new Error('Cart item id is required for update.');
    validateStorefrontCartInput(body);

    const existing = await readCartItems(request);
    const previous = existing.find((entry) => String(entry.id) === String(body.id));
    if (!previous) throw new Error('Cart item was not found.');

    const updated = await buildCartItem(request, { ...previous, ...body });
    const next = existing.map((entry) => String(entry.id) === String(updated.id) ? updated : entry);
    await saveCartItems(request, next);

    const items = await recalculateCartSnapshot(request, next);
    return storefrontSuccess(SOURCE, { item: updated, items, totals: summarizeCart(items) });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}

export const PATCH = PUT;

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const clear = request.nextUrl.searchParams.get('clear');
    const existing = await readCartItems(request);
    const next = clear === '1' || clear === 'true' ? [] : existing.filter((entry) => String(entry.id) !== String(id));

    if (!id && next.length === existing.length) {
      throw new Error('Cart item id is required, or pass clear=true to empty the cart.');
    }

    await saveCartItems(request, next);
    const items = await recalculateCartSnapshot(request, next);
    return storefrontSuccess(SOURCE, { deletedId: id, items, totals: summarizeCart(items) });
  } catch (error) {
    return storefrontError(SOURCE, error);
  }
}
