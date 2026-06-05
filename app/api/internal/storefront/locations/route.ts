import { NextResponse } from 'next/server';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';

export const dynamic = 'force-dynamic';

function publicLocation(item: any) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: item.type,
    status: item.status,
    address: item.type === 'service-area' ? { town: item.address?.town, county: item.address?.county, country: item.address?.country } : item.address,
    openingHours: item.openingHours,
    collectionHours: item.collectionHours,
    cutoffTime: item.cutoffTime,
    dropSchedule: item.dropSchedule,
    pickupInstructions: item.pickupInstructions,
    description: item.customerFacingDescription,
    allowedProductSlugs: item.allowedProductSlugs,
    blockedProductSlugs: item.blockedProductSlugs,
    collectionFeeMinor: item.collectionFeeMinor,
    publicPageEnabled: item.publicPageEnabled,
    seoPath: item.seo?.path,
    googleBusinessEligible: item.googleBusinessEligible,
    collectionTruth: item.metadata?.collectionTruth || '',
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productSlug = String(url.searchParams.get('productSlug') || '').trim();
    const data = await listFulfilmentLocations(request, { publicOnly: true, type: url.searchParams.get('type') || 'all' });
    let items = data.items;
    if (productSlug) {
      items = items.filter((item) => {
        if (item.blockedProductSlugs?.includes(productSlug)) return false;
        if (item.allowedProductSlugs?.length && !item.allowedProductSlugs.includes(productSlug)) return false;
        return true;
      });
    }
    return NextResponse.json({ ok: true, source: 'internal-storefront-locations', data: { items: items.map(publicLocation), count: items.length } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-locations', error: error instanceof Error ? error.message : 'Failed to load storefront locations.' }, { status: 500 });
  }
}
