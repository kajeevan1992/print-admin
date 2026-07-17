import { platformPrisma } from '@/core/db/platform-prisma';

export type StorefrontCollectionPoint = {
  slug: string;
  name: string;
  address: string;
  note: string;
  status: string;
  enabled: boolean;
  cutoffTime: string;
  workingDays: number[];
  dailyCapacity: number;
  blackoutDates: string[];
};

const RESOURCES = ['collection-points', 'store-collection-points', 'pickup-locations', 'store-locations', 'stores'];

function text(...values: unknown[]) {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

function numberList(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map(Number).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  return items.length ? [...new Set(items)] : fallback;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

function normalise(row: any): StorefrontCollectionPoint | null {
  const raw = row?.metadataJson || row || {};
  const name = text(raw.name, raw.label, raw.title, row?.name, row?.slug);
  const slug = text(raw.slug, row?.slug, name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug || !name) return null;
  const status = text(raw.status, raw.availability, 'Available');
  const unavailable = /(closed|paused|inactive|disabled|unavailable)/i.test(status);
  return {
    slug,
    name,
    address: text(raw.address, raw.fullAddress, raw.location, raw.line1),
    note: text(raw.note, raw.description, raw.openingNote),
    status,
    enabled: raw.enabled !== false && raw.isActive !== false && !unavailable,
    cutoffTime: text(raw.cutoffTime, raw.collectionCutoff, '17:00'),
    workingDays: numberList(raw.workingDays, [1, 2, 3, 4, 5, 6]),
    dailyCapacity: Math.max(0, Math.round(Number(raw.dailyCapacity || raw.collectionCapacity || 0))),
    blackoutDates: stringList(raw.blackoutDates),
  };
}

function dedupe(items: StorefrontCollectionPoint[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

export async function loadStorefrontCollectionPoints(tenantIds: string[]) {
  const points: StorefrontCollectionPoint[] = [];
  for (const tenantId of tenantIds.filter(Boolean)) {
    for (const resource of RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ slug: string; name?: string; metadataJson: any }>>(
          'SELECT slug,name,"metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 ORDER BY "updatedAt" DESC LIMIT 100',
          tenantId,
          resource,
        );
        rows.forEach((row) => {
          const point = normalise(row);
          if (point) points.push(point);
        });
        if (points.length) return dedupe(points);
      } catch {}
    }
  }
  return [];
}
