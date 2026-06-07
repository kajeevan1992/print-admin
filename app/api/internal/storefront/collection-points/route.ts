import { NextResponse } from 'next/server';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || url.searchParams.get('kind') || 'all';
    const data = await listFulfilmentLocations(request, {
      status: 'active',
      type: type === 'partner-collection' ? 'partner-collection-point' : type,
      search: url.searchParams.get('search') || '',
      publicOnly: true,
      checkoutOnly: url.searchParams.get('checkoutOnly') !== 'false',
      productSlug: url.searchParams.get('productSlug') || '',
    });
    const items = data.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      type: item.type,
      kind: item.type === 'partner-collection-point' ? 'partner-collection' : item.type === 'service-area' ? 'service-area' : 'owned-branch',
      areaName: item.name,
      town: item.address?.town || '',
      postcode: item.address?.postcode || '',
      openingHours: item.collectionHours || item.openingHours,
      cutoffTime: item.cutoffTime,
      collectionInstructions: item.pickupInstructions,
      customerNotes: item.customerFacingDescription,
      checkoutEnabled: item.checkoutEnabled,
      allowedProductSlugs: item.allowedProductSlugs,
      blockedProductSlugs: item.blockedProductSlugs,
      seoPath: item.seo?.path,
      sortOrder: item.priority,
      collectionFeeMinor: item.collectionFeeMinor,
    }));
    return NextResponse.json({ ok: true, source: 'internal-storefront-collection-points', data: { items, summary: data.summary } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-collection-points', error: error instanceof Error ? error.message : 'Failed to load storefront collection points.' }, { status: 500 });
  }
}
