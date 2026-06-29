import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Accept,X-Tenant-Id,X-Print-Tenant,X-Site-Id,X-Print-Store',
  'Access-Control-Max-Age': '86400',
};

function json(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, { ...init, headers: { ...CORS_HEADERS, ...(init?.headers || {}) } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function clean(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function candidates(input: string) {
  const slug = clean(input);
  const list = [slug, slug ? `tenant-${slug}` : ''];
  if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print');
  return list;
}

function normalize(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any, index) => ({
      ...item,
      id: String(item?.id || `menu-${index + 1}`),
      label: String(item?.label || item?.name || item?.title || item?.path || `Menu ${index + 1}`),
      path: String(item?.path || item?.href || item?.url || '/'),
      enabled: item?.enabled !== false,
      order: Number(item?.order || item?.sortOrder || index + 1),
      parentId: item?.parentId || '',
      parentSlug: item?.parentSlug || '',
      group: item?.group || item?.column || 'Menu',
      imageUrl: item?.imageUrl || item?.image || '',
      description: item?.description || '',
    }))
    .filter((item) => item.enabled && item.label && item.path)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = clean(url.searchParams.get('tenantSlug') || '');
  const tenantId = clean(url.searchParams.get('tenantId') || '');
  const ids = uniq([...candidates(tenantSlug), ...candidates(tenantId)]);

  for (const id of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; metadataJson: any; updatedAt: string }>>(
        'SELECT "tenantId","metadataJson","updatedAt" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
        id,
        'admin-config',
        'storefront-menu-builder',
      );
      const row = rows[0];
      const items = normalize(row?.metadataJson?.items || []);
      if (items.length) return json({ ok: true, source: 'storefront-menu-v2', data: { items, tenantId: row.tenantId, matched: id, checked: ids, updatedAt: row.updatedAt } });
    } catch {}
  }

  return json({ ok: true, source: 'storefront-menu-v2', data: { items: [], checked: ids } });
}
