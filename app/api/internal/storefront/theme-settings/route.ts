import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getPublicHostedThemeSettings } from '@/core/themes/hosted-theme-editor.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanHost(value: string) {
  return String(value || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
}

async function resolveTenantId(url: URL) {
  const tenantId = url.searchParams.get('tenantId');
  if (tenantId) return tenantId;
  const tenantSlug = url.searchParams.get('tenantSlug') || 'holo-print';
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug);
  return rows[0]?.id || 'holo-print';
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
    const tenantId = resolved?.tenantId || await resolveTenantId(url);
    const channelSlug = resolved?.channelSlug || url.searchParams.get('channelSlug') || 'default-store';
    const data = await getPublicHostedThemeSettings(tenantId, channelSlug);
    return NextResponse.json({ ok: true, source: 'hosted-theme-settings', data: { ...data, resolvedHost: resolved } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'hosted-theme-settings', error: error instanceof Error ? error.message : 'Hosted theme settings could not load.' }, { status: 500 });
  }
}
