export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buildCartItem, readCartItems, saveCartItems, summarizeCart, type StorefrontCartInput } from '@/core/storefront/cart-checkout-bridge';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, source: 'internal-storefront-cart-bridge', error: error instanceof Error ? error.message : 'Storefront cart request failed.' }, { status });
}

async function recalculateItems(request: NextRequest, items: Array<Record<string, any>>) {
  const recalculated = await Promise.all(items.map((item) => buildCartItem(request, item as StorefrontCartInput)));
  await saveCartItems(request, recalculated);
  return recalculated;
}

export async function GET(request: NextRequest) {
  try {
    const items = await recalculateItems(request, await readCartItems(request));
    return NextResponse.json({ ok: true, source: 'internal-storefront-cart-bridge', data: { items, totals: summarizeCart(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as StorefrontCartInput;
    const item = await buildCartItem(request, body);
    const existing = await readCartItems(request);
    const next = [item, ...existing.filter((entry) => String(entry.id) !== String(item.id))];
    const record = await saveCartItems(request, next);
    return NextResponse.json({ ok: true, source: 'internal-storefront-cart-bridge', data: { record, item, items: next, totals: summarizeCart(next) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as StorefrontCartInput;
    if (!body.id) return responseError(new Error('Cart item id is required for update.'), 400);
    const existing = await readCartItems(request);
    const previous = existing.find((entry) => String(entry.id) === String(body.id));
    if (!previous) return responseError(new Error('Cart item was not found.'), 404);
    const updated = await buildCartItem(request, { ...previous, ...body });
    const next = existing.map((entry) => String(entry.id) === String(updated.id) ? updated : entry);
    const record = await saveCartItems(request, next);
    return NextResponse.json({ ok: true, source: 'internal-storefront-cart-bridge', data: { record, item: updated, items: next, totals: summarizeCart(next) } });
  } catch (error) {
    return responseError(error);
  }
}

export const PATCH = PUT;

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const clear = request.nextUrl.searchParams.get('clear');
    const existing = await readCartItems(request);
    const next = clear === '1' || clear === 'true' ? [] : existing.filter((entry) => String(entry.id) !== String(id));
    if (!id && next.length === existing.length) return responseError(new Error('Cart item id is required, or pass clear=true to empty the cart.'), 400);
    const record = await saveCartItems(request, next);
    return NextResponse.json({ ok: true, source: 'internal-storefront-cart-bridge', data: { record, deletedId: id, items: next, totals: summarizeCart(next) } });
  } catch (error) {
    return responseError(error);
  }
}
