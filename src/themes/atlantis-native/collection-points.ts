import { platformPrisma } from '@/core/db/platform-prisma';

export type CollectionPoint = {
  slug: string;
  name: string;
  address: string;
  note: string;
  status: string;
};

const RESOURCES = ['collection-points', 'store-collection-points', 'pickup-locations', 'store-locations', 'stores'];

function firstText(...values: any[]) {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

function normalise(row: any): CollectionPoint | null {
  const raw = row?.metadataJson || row || {};
  const name = firstText(raw?.name, raw?.label, raw?.title, row?.slug, 'Holo Print Sidcup');
  const slug = firstText(raw?.slug, row?.slug, name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug || !name) return null;
  return {
    slug,
    name,
    address: firstText(raw?.address, raw?.fullAddress, raw?.location, raw?.line1, 'Sidcup High Street collection point'),
    note: firstText(raw?.note, raw?.description, raw?.openingNote, 'Choose this point for local collection once your order is approved.'),
    status: firstText(raw?.status, raw?.availability, 'Available'),
  };
}

function dedupe(items: CollectionPoint[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

export async function loadCollectionPoints(tenantIds: string[]) {
  const points: CollectionPoint[] = [];
  for (const tenantId of tenantIds) {
    for (const resource of RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ slug: string; metadataJson: any }>>('SELECT slug,"metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 ORDER BY "updatedAt" DESC LIMIT 50', tenantId, resource);
        rows.forEach((row) => { const point = normalise(row); if (point) points.push(point); });
        if (points.length) return dedupe(points);
      } catch {}
    }
  }
  return [{ slug: 'holo-print-sidcup', name: 'Holo Print Sidcup', address: 'Sidcup High Street collection point', note: 'Default preview collection point. Replace with tenant collection-point records when ready.', status: 'Available' }];
}
