import { NextResponse } from 'next/server';
import { listCollectionPoints } from '@/core/locations/collection-points.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listCollectionPoints(request, {
      search: url.searchParams.get('search') || '',
      status: 'active',
      kind: url.searchParams.get('kind') || 'all',
      checkoutOnly: url.searchParams.get('checkoutOnly') !== 'false',
      productSlug: url.searchParams.get('productSlug') || '',
    });
    const items = data.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      kind: item.kind,
      areaName: item.areaName,
      town: item.town,
      postcode: item.postcode,
      openingHours: item.openingHours,
      collectionInstructions: item.collectionInstructions,
      customerNotes: item.customerNotes,
      checkoutEnabled: item.checkoutEnabled,
      productAvailabilityMode: item.productAvailabilityMode,
      seoPath: item.seoPath,
      sortOrder: item.sortOrder,
    }));
    return NextResponse.json({ ok: true, source: 'internal-storefront-collection-points', data: { items, summary: data.summary } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-collection-points', error: error instanceof Error ? error.message : 'Failed to load storefront collection points.' }, { status: 500 });
  }
}
