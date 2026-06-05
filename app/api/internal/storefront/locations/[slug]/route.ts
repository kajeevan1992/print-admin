import { NextResponse } from 'next/server';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

function publicLocation(item: any) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: item.type,
    status: item.status,
    address: item.type === 'service-area' ? { town: item.address?.town, county: item.address?.county, country: item.address?.country } : item.address,
    contact: item.type === 'main-store' || item.type === 'owned-branch' ? item.contact : {},
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
    seo: item.seo,
    googleBusinessEligible: item.googleBusinessEligible,
    collectionTruth: item.metadata?.collectionTruth || '',
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const slug = String(context.params.slug || '').trim().toLowerCase();
    const data = await listFulfilmentLocations(request, { publicOnly: true });
    const item = data.items.find((entry) => entry.slug === slug || entry.seo?.path?.endsWith(`/${slug}`));
    if (!item) return NextResponse.json({ ok: false, source: 'internal-storefront-location-detail', error: 'Location not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, source: 'internal-storefront-location-detail', data: { item: publicLocation(item) } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-location-detail', error: error instanceof Error ? error.message : 'Failed to load storefront location.' }, { status: 500 });
  }
}
