import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getPublicHostedThemeSettings } from '@/core/themes/hosted-theme-editor.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanHost(value: string) {
  return String(value || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
}

function cleanSlug(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

async function tenantIdFromSlug(tenantSlugInput: string) {
  const tenantSlug = cleanSlug(tenantSlugInput);
  if (!tenantSlug) return '';
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    tenantSlug,
  );
  return rows[0]?.id || tenantSlug;
}

async function resolveTenantId(url: URL) {
  const tenantId = url.searchParams.get('tenantId');
  if (tenantId) return tenantId;
  return tenantIdFromSlug(url.searchParams.get('tenantSlug') || 'holo-print');
}

async function resolveByStorePath(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const tenantIdParam = parsed.searchParams.get('tenantId');
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'stores' || !parts[1] || !parts[2]) return null;
    const tenantId = tenantIdParam || await tenantIdFromSlug(parts[1]);
    const channelSlug = cleanSlug(parts[2]) || 'default-store';
    if (!tenantId) return null;
    return { tenantId, channelSlug, storePath: parsed.pathname, tenantSlug: cleanSlug(parts[1]) };
  } catch {
    return null;
  }
}

async function resolveByHost(hostInput: string) {
  const host = cleanHost(hostInput);
  if (!host) return null;
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT "tenantId","metadataJson" FROM "CoreCatalogRecord" WHERE resource=$1 AND (slug=$2 OR slug=$3 OR lower("metadataJson"::text) LIKE lower($4)) ORDER BY "updatedAt" DESC LIMIT 1', 'store-domain-bindings', host, `www.${host}`, `%"domain":"${host}"%`);
  const row = rows[0];
  if (!row) return null;
  const meta = row.metadataJson || {};
  return { tenantId: String(row.tenantId || meta.tenantId || ''), channelSlug: String(meta.channelSlug || meta.storeSlug || 'default-store'), host, binding: meta };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const resolved = await resolveByHost(url.searchParams.get('host') || request.headers.get('host') || '');
    const storePath = await resolveByStorePath(request.headers.get('referer'));
    const tenantId = resolved?.tenantId || url.searchParams.get('tenantId') || storePath?.tenantId || await resolveTenantId(url);
    const channelSlug = resolved?.channelSlug || url.searchParams.get('channelSlug') || storePath?.channelSlug || 'default-store';
    const data = await getPublicHostedThemeSettings(tenantId, channelSlug);
    return NextResponse.json({ ok: true, source: 'hosted-theme-settings', resolver: storePath ? 'store-path-aware' : 'host-aware', data: { ...data, resolvedHost: resolved, resolvedStorePath: storePath } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'hosted-theme-settings', error: error instanceof Error ? error.message : 'Hosted theme settings could not load.' }, { status: 500 });
  }
}
