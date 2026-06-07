import { NextResponse } from 'next/server';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';

export const dynamic = 'force-dynamic';

function locationTypeForCheckout(type: string) {
  if (type === 'main-store') return 'main-store';
  if (type === 'owned-branch') return 'owned-branch';
  if (type === 'service-area') return 'service-area';
  return 'partner-collection-point';
}

function truthFor(item: any) {
  if (item.type === 'main-store' || item.type === 'owned-branch') return 'Real Holo Print collection location';
  if (item.type === 'service-area') return 'Service area only, not a Holo Print branch';
  return 'Partner collection point, not a Holo Print branch';
}

function labelFor(item: any) {
  if (item.type === 'main-store' || item.type === 'owned-branch') return `Collect from Holo Print ${item.name}`;
  if (item.type === 'service-area') return `Delivery / future collection for ${item.name}`;
  return `Collect from ${item.name} partner point`;
}

function publicLocation(item: any) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: locationTypeForCheckout(item.type),
    kind: item.type === 'partner-collection-point' ? 'partner-collection' : item.type === 'service-area' ? 'service-area' : 'owned-branch',
    publicLabel: labelFor(item),
    status: item.status,
    address: item.type === 'service-area' ? { town: item.address?.town, county: item.address?.county, country: item.address?.country } : item.address,
    town: item.address?.town || '',
    postcode: item.address?.postcode || '',
    openingHours: item.openingHours,
    collectionHours: item.collectionHours,
    cutoffTime: item.cutoffTime,
    dropSchedule: item.dropSchedule,
    pickupInstructions: item.pickupInstructions,
    description: item.customerFacingDescription,
    checkoutDescription: item.customerFacingDescription || item.pickupInstructions,
    allowedProductSlugs: item.allowedProductSlugs,
    blockedProductSlugs: item.blockedProductSlugs,
    collectionFeeMinor: Number(item.collectionFeeMinor || 0),
    partnerFeeMinor: Number(item.partnerFeeMinor || 0),
    checkoutEnabled: Boolean(item.checkoutEnabled),
    publicPageEnabled: item.publicPageEnabled,
    seoPath: item.seo?.path,
    googleBusinessEligible: Boolean(item.googleBusinessEligible),
    collectionTruth: item.metadata?.collectionTruth || truthFor(item),
    priority: item.priority || 100,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productSlug = String(url.searchParams.get('productSlug') || '').trim();
    const includeServiceAreas = url.searchParams.get('includeServiceAreas') === 'true';
    const data = await listFulfilmentLocations(request, {
      status: 'active',
      type: url.searchParams.get('type') || 'all',
      search: url.searchParams.get('search') || '',
      publicOnly: true,
      checkoutOnly: url.searchParams.get('checkoutOnly') !== 'false',
      productSlug,
    });
    const items = data.items
      .filter((item) => includeServiceAreas || item.type !== 'service-area')
      .map(publicLocation);
    return NextResponse.json({ ok: true, source: 'internal-storefront-locations', data: { items, count: items.length, summary: { ...data.summary, checkoutCount: items.length } } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-locations', error: error instanceof Error ? error.message : 'Failed to load storefront locations.' }, { status: 500 });
  }
}
