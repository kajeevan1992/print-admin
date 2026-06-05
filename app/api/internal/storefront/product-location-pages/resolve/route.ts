import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { holoPrintLaunchProducts } from '@/data/holo-print-launch-catalogue';
import { listFulfilmentLocations } from '@/core/locations/location-manager.service';
import { resolveSeoForPath } from '@/core/seo/seo-public-output.service';

export const dynamic = 'force-dynamic';

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function productAliases(slug: string) {
  const clean = slugify(slug);
  const aliases: Record<string, string[]> = {
    flyers: ['flyers-leaflets', 'leaflets', 'flyers'],
    leaflets: ['flyers-leaflets', 'leaflets', 'flyers'],
    banners: ['pvc-banners', 'banners', 'pvc-banner'],
    'pvc-banner': ['pvc-banners', 'banners', 'pvc-banner'],
    signage: ['shop-boards-signage', 'signage', 'shop-boards'],
    'shop-boards': ['shop-boards-signage', 'signage', 'shop-boards'],
  };
  return [clean, ...(aliases[clean] || [])];
}

async function findProduct(request: Request, slug: string) {
  const ctx = tenantContextFromRequest(request);
  const candidates = productAliases(slug);
  const live = await (prisma as any).product.findFirst({
    where: { tenantId: ctx.tenantId, isActive: true, slug: { in: candidates } },
    include: { category: true },
  }).catch(() => null);
  if (live) return { id: live.id, slug: live.slug, name: live.title || live.name || live.slug, description: live.description || '', priceFromMinor: live.priceFromMinor || 0, currency: live.currency || 'GBP', categoryName: live.category?.name || '', source: 'live-product' };
  const fallback = holoPrintLaunchProducts.find((item) => candidates.includes(item.slug));
  if (fallback) return { id: fallback.id, slug: fallback.slug, name: fallback.title || fallback.name, description: fallback.description || '', priceFromMinor: fallback.priceFromMinor || 0, currency: fallback.currency || 'GBP', categoryName: fallback.categorySlug || '', source: 'launch-catalogue' };
  return { id: `product-${slugify(slug)}`, slug: slugify(slug), name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), description: 'Local print product from Holo Print.', priceFromMinor: 0, currency: 'GBP', categoryName: 'Print', source: 'fallback' };
}

function publicLocation(item: any) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: item.type,
    status: item.status,
    address: item.type === 'service-area' ? { town: item.address?.town, county: item.address?.county, country: item.address?.country } : item.address,
    collectionHours: item.collectionHours,
    openingHours: item.openingHours,
    cutoffTime: item.cutoffTime,
    dropSchedule: item.dropSchedule,
    pickupInstructions: item.pickupInstructions,
    description: item.customerFacingDescription,
    collectionFeeMinor: item.collectionFeeMinor,
    publicPageEnabled: item.publicPageEnabled,
    seoPath: item.seo?.path,
    googleBusinessEligible: item.googleBusinessEligible,
    collectionTruth: item.metadata?.collectionTruth || '',
  };
}

function productPath(productSlug: string, locationSlug: string) {
  return `/${slugify(productSlug)}/${slugify(locationSlug)}`;
}

function localTruth(location: any) {
  if (!location) return 'Location availability will be confirmed during checkout.';
  if (location.type === 'main-store' || location.type === 'owned-branch') return `${location.name} is a genuine Holo Print collection/production location.`;
  if (location.type === 'partner-collection-point') return `${location.name} is a partner collection point when available, not a fake Holo Print branch.`;
  return `${location.name} is a service area for online ordering, delivery or future collection options, not a fake Holo Print branch.`;
}

function fallbackSeo(product: any, location: any, path: string) {
  const loc = location?.name || path.split('/').filter(Boolean)[1] || 'your area';
  const productName = product?.name || 'Printing';
  return {
    found: false,
    path,
    pageType: 'product-location',
    status: 'fallback',
    title: `${productName} in ${loc} | Order Online & Collect Locally | Holo Print`,
    metaDescription: `Order ${productName} in ${loc} with Holo Print. Upload artwork online, request design help, choose delivery or local collection where available.`,
    h1: `${productName} in ${loc}`,
    targetKeyword: `${productName} ${loc}`,
    introCopy: `Holo Print helps customers in ${loc} order ${productName} online with artwork upload, quote support, payment options and honest local collection or delivery information.`,
    faqItems: [
      { question: `Can I order ${productName} in ${loc}?`, answer: `Yes. You can order online and Holo Print will show available collection or delivery options at checkout.` },
      { question: `Can I collect in ${loc}?`, answer: localTruth(location) },
      { question: 'Can I upload artwork later?', answer: 'Yes. You can upload artwork during checkout or provide it after placing the order.' },
    ],
    internalLinks: [{ label: 'All products', href: '/all-products' }, { label: 'Artwork guide', href: '/artwork-guide' }, { label: 'Request quote', href: '/bespoke-quote' }],
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage', 'WebPage'],
    robots: 'index,follow',
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productSlug = String(url.searchParams.get('productSlug') || '').trim();
    const locationSlug = String(url.searchParams.get('locationSlug') || '').trim();
    const path = String(url.searchParams.get('path') || productPath(productSlug, locationSlug));
    if (!productSlug || !locationSlug) return NextResponse.json({ ok: false, source: 'internal-product-location-resolve', error: 'productSlug and locationSlug are required.' }, { status: 400 });

    const [product, locations, seo] = await Promise.all([
      findProduct(request, productSlug),
      listFulfilmentLocations(request, { publicOnly: true }),
      resolveSeoForPath(request, path).catch(() => null),
    ]);
    const location = locations.items.find((item) => item.slug === slugify(locationSlug)) || null;
    const locationPublic = location ? publicLocation(location) : null;
    const seoData = seo?.found ? seo : fallbackSeo(product, locationPublic, path);
    return NextResponse.json({
      ok: true,
      source: 'internal-product-location-resolve',
      data: {
        product,
        location: locationPublic,
        seo: seoData,
        localTruth: localTruth(locationPublic),
        orderPath: `/${product.slug}`,
        quotePath: '/bespoke-quote',
        artworkGuidePath: '/artwork-guide',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-product-location-resolve', error: error instanceof Error ? error.message : 'Failed to resolve product-location page.' }, { status: 500 });
  }
}
