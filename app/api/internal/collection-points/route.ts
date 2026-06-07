import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listFulfilmentLocations, saveFulfilmentLocation, seedFulfilmentLocations } from '@/core/locations/location-manager.service';

export const dynamic = 'force-dynamic';

const RESOURCE = 'fulfilment-locations';

function kindToType(kind: string) {
  if (kind === 'owned-branch') return 'owned-branch';
  if (kind === 'service-area') return 'service-area';
  return 'partner-collection-point';
}
function typeToKind(type: string) {
  if (type === 'partner-collection-point') return 'partner-collection';
  if (type === 'service-area') return 'service-area';
  return 'owned-branch';
}
function statusToLocation(status: string) {
  if (status === 'all') return 'all';
  if (status === 'active') return 'active';
  if (status === 'inactive') return 'paused';
  if (status === 'hidden') return 'hidden';
  return 'draft';
}
function statusFromLocation(status: string) {
  if (status === 'active') return 'active';
  if (status === 'paused' || status === 'hidden') return 'inactive';
  return 'draft';
}
function slugify(value: string) { return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function csv(value: unknown) { if (Array.isArray(value)) return value.map(String).filter(Boolean); return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function hoursObjectToRows(value: any) {
  if (Array.isArray(value)) return value;
  const input = value && typeof value === 'object' ? value : {};
  return Object.entries(input).map(([day, hours]) => {
    const text = String(hours || 'Closed');
    if (/closed/i.test(text)) return { day, open: '', close: '', closed: true };
    const [open = '', close = ''] = text.split('-');
    return { day, open: open.trim(), close: close.trim() };
  });
}
function rowsToHoursObject(rows: any[]) {
  const out: Record<string, string> = {};
  for (const row of rows || []) out[String(row.day || '').toLowerCase()] = row.closed ? 'Closed' : `${row.open || ''}-${row.close || ''}`;
  return out;
}
function toCollectionPoint(item: any) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    kind: typeToKind(item.type),
    status: statusFromLocation(item.status),
    areaName: item.name,
    addressLine1: item.address?.line1 || '',
    addressLine2: item.address?.line2 || '',
    town: item.address?.town || '',
    postcode: item.address?.postcode || '',
    country: item.address?.country || 'GB',
    contactName: item.contact?.managerName || '',
    contactEmail: item.contact?.email || '',
    contactPhone: item.contact?.phone || '',
    openingHours: rowsToHoursObject(item.collectionHours || item.openingHours || []),
    collectionInstructions: item.pickupInstructions || '',
    customerNotes: item.customerFacingDescription || '',
    partnerNotes: item.adminNotes || '',
    checkoutEnabled: Boolean(item.checkoutEnabled),
    publicPageEnabled: Boolean(item.publicPageEnabled),
    googleBusinessEligible: Boolean(item.googleBusinessEligible),
    productAvailabilityMode: item.allowedProductSlugs?.length ? 'selected-products' : item.blockedProductSlugs?.length ? 'excluded-products' : 'all-products',
    productSlugs: item.allowedProductSlugs || [],
    excludedProductSlugs: item.blockedProductSlugs || [],
    seoPath: item.seo?.path || '',
    sortOrder: item.priority || 100,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
function toLocationInput(body: any) {
  const kind = String(body.kind || 'partner-collection');
  const type = kindToType(kind);
  const slug = body.slug || slugify(body.areaName || body.name);
  const productMode = String(body.productAvailabilityMode || 'all-products');
  return {
    id: body.id || undefined,
    slug,
    name: body.areaName || body.name || slug,
    type,
    status: statusToLocation(body.status || 'draft'),
    publicPageEnabled: body.publicPageEnabled !== false,
    seoPageEnabled: body.publicPageEnabled !== false,
    googleBusinessEligible: type === 'owned-branch' && Boolean(body.googleBusinessEligible),
    checkoutEnabled: Boolean(body.checkoutEnabled),
    address: { line1: body.addressLine1 || '', line2: body.addressLine2 || '', town: body.town || body.areaName || '', postcode: body.postcode || '', country: body.country || 'GB' },
    contact: { managerName: body.contactName || '', email: body.contactEmail || '', phone: body.contactPhone || '' },
    openingHours: hoursObjectToRows(body.openingHours),
    collectionHours: hoursObjectToRows(body.openingHours),
    cutoffTime: body.cutoffTime || '15:00',
    pickupInstructions: body.collectionInstructions || '',
    customerFacingDescription: body.customerNotes || body.collectionInstructions || '',
    adminNotes: body.partnerNotes || '',
    allowedProductSlugs: productMode === 'selected-products' ? csv(body.productSlugs) : [],
    blockedProductSlugs: productMode === 'excluded-products' ? csv(body.excludedProductSlugs) : [],
    collectionFeeMinor: Number(body.collectionFeeMinor || 0),
    partnerFeeMinor: Number(body.partnerFeeMinor || 0),
    priority: Number(body.sortOrder || 100),
    seo: body.seoPath ? { path: body.seoPath } : undefined,
    metadata: { collectionTruth: type === 'partner-collection-point' ? 'partner collection point, not a Holo Print branch' : type === 'service-area' ? 'service area, not a Holo Print branch' : 'owned Holo Print branch' },
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') || 'all';
    const data = await listFulfilmentLocations(request, {
      search: url.searchParams.get('search') || '',
      status: statusToLocation(url.searchParams.get('status') || 'all'),
      type: kind === 'all' ? 'all' : kindToType(kind),
      checkoutOnly: url.searchParams.get('checkoutOnly') === 'true',
      productSlug: url.searchParams.get('productSlug') || '',
    });
    const items = data.items.map(toCollectionPoint);
    return NextResponse.json({ ok: true, source: 'internal-collection-points-alias', data: { items, summary: { total: items.length, active: items.filter((i) => i.status === 'active').length, checkoutEnabled: items.filter((i) => i.checkoutEnabled && i.status === 'active').length, ownedBranches: items.filter((i) => i.kind === 'owned-branch').length, partnerPoints: items.filter((i) => i.kind === 'partner-collection').length, serviceAreas: items.filter((i) => i.kind === 'service-area').length } } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-points-alias', error: error instanceof Error ? error.message : 'Failed to load collection points.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === 'seed') {
      const saved = await seedFulfilmentLocations(request);
      const items = saved.map((entry: any) => toCollectionPoint(entry.item || entry));
      return NextResponse.json({ ok: true, source: 'internal-collection-points-alias', action: 'seed', data: { items, count: items.length } });
    }
    const data = await saveFulfilmentLocation(request, toLocationInput(body || {}));
    return NextResponse.json({ ok: true, source: 'internal-collection-points-alias', data: { item: toCollectionPoint(data.item), seoPage: data.seoPage } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-points-alias', error: error instanceof Error ? error.message : 'Failed to save collection point.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }

export async function DELETE(request: Request) {
  try {
    const ctx = tenantContextFromRequest(request);
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const id = url.searchParams.get('id') || body.id || body.slug;
    if (!id) return NextResponse.json({ ok: false, source: 'internal-collection-points-alias', error: 'Collection point delete requires id or slug.' }, { status: 400 });
    const slug = slugify(String(id));
    const rows = await (prisma as any).$queryRaw<any[]>`SELECT * FROM "CoreCatalogRecord" WHERE "tenantId" = ${ctx.tenantId} AND "resource" = ${RESOURCE} AND ("id" = ${String(id)} OR "slug" = ${slug}) LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ ok: true, source: 'internal-collection-points-alias', data: { deleted: 0 } });
    await (prisma as any).$executeRaw`DELETE FROM "CoreCatalogRecord" WHERE "id" = ${rows[0].id}`;
    return NextResponse.json({ ok: true, source: 'internal-collection-points-alias', data: { deleted: 1, item: rows[0] } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-collection-points-alias', error: error instanceof Error ? error.message : 'Failed to delete collection point.' }, { status: 500 });
  }
}
