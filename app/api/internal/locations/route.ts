import { NextResponse } from 'next/server';
import { listFulfilmentLocations, saveFulfilmentLocation, seedFulfilmentLocations } from '@/core/locations/location-manager.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listFulfilmentLocations(request, {
      status: url.searchParams.get('status') || 'all',
      type: url.searchParams.get('type') || 'all',
      search: url.searchParams.get('search') || '',
      publicOnly: url.searchParams.get('publicOnly') === '1' || url.searchParams.get('publicOnly') === 'true',
      checkoutOnly: url.searchParams.get('checkoutOnly') === '1' || url.searchParams.get('checkoutOnly') === 'true',
      productSlug: url.searchParams.get('productSlug') || '',
    });
    return NextResponse.json({ ok: true, source: 'internal-locations-manager', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-locations-manager', error: error instanceof Error ? error.message : 'Failed to load locations.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (String(body.action || '') === 'seed') {
      const items = await seedFulfilmentLocations(request);
      return NextResponse.json({ ok: true, source: 'internal-locations-manager', action: 'seed', data: { items, count: items.length } });
    }
    const data = await saveFulfilmentLocation(request, body || {});
    return NextResponse.json({ ok: true, source: 'internal-locations-manager', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-locations-manager', error: error instanceof Error ? error.message : 'Failed to save location.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
