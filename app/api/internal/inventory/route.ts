export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createInventoryItem, listInventoryItems } from '@/core/inventory/inventory.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-inventory-db',
    error: error instanceof Error ? error.message : 'Inventory request failed.',
  }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const items = await listInventoryItems(request);

    return NextResponse.json({
      ok: true,
      source: 'internal-inventory-db',
      data: {
        items,
        count: Array.isArray(items) ? items.length : 0,
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const item = await createInventoryItem(request, body);

    return NextResponse.json({
      ok: true,
      source: 'internal-inventory-db',
      data: { item },
    });
  } catch (error) {
    return responseError(error);
  }
}
