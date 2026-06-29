import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONFIG_RESOURCE = 'admin-config';
const CONFIG_KEY = 'storefront-menu-builder';

function cleanSlug(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

async function tenantIdentifiers(url: URL) {
  const tenantId = url.searchParams.get('tenantId') || '';
  const tenantSlug = cleanSlug(url.searchParams.get('tenantSlug') || url.searchParams.get('tenant') || '');
  const seed = unique([tenantId, tenantSlug]);
  const identifiers = [...seed];

  for (const value of seed) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
        'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
        value,
      );
      const row = rows[0];
      if (row) identifiers.push(row.id, row.slug || '', row.defaultSubdomain || '');
    } catch {
      // Keep public menu lookup safe. If one identifier fails, try the remaining values.
    }
  }
  return unique(identifiers);
}

function normaliseItems(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any, index) => ({
      ...item,
      id: String(item?.id || item?.slug || `menu-${index + 1}`),
      label: String(item?.label || item?.name || item?.title || item?.path || `Menu ${index + 1}`),
      path: String(item?.path || item?.href || item?.url || '/'),
      type: item?.type || 'custom',
      enabled: item?.enabled !== false,
      order: Number(item?.order || item?.sortOrder || index + 1),
      column: item?.column || (item?.parentId ? 'Dropdown' : 'Main menu'),
      group: item?.group || item?.column || (item?.parentId ? 'Menu' : 'Main menu'),
      parentId: item?.parentId || '',
      parentSlug: item?.parentSlug || '',
      description: item?.description || '',
      imageUrl: item?.imageUrl || item?.image || '',
    }))
    .filter((item) => item.enabled && item.label && item.path)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const identifiers = await tenantIdentifiers(url);
    if (!identifiers.length) return NextResponse.json({ ok: true, source: 'public-storefront-menu', data: { items: [], identifiers: [] } });

    for (const tenantId of identifiers) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; metadataJson: any; updatedAt: string }>>(
          'SELECT "tenantId","metadataJson","updatedAt" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
          tenantId,
          CONFIG_RESOURCE,
          CONFIG_KEY,
        );
        const row = rows[0];
        const items = normaliseItems(row?.metadataJson?.items || []);
        if (items.length) {
          return NextResponse.json({ ok: true, source: 'public-storefront-menu', data: { items, tenantId: row.tenantId, matchedIdentifier: tenantId, updatedAt: row.updatedAt } });
        }
      } catch {
        // Try the next tenant identifier.
      }
    }

    return NextResponse.json({ ok: true, source: 'public-storefront-menu', data: { items: [], identifiers } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'public-storefront-menu', error: error instanceof Error ? error.message : 'Storefront menu could not load.' }, { status: 500 });
  }
}
