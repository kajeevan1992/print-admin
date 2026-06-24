import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getPublicHostedThemeSettings } from '@/core/themes/hosted-theme-editor.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveTenantId(url: URL) {
  const tenantId = url.searchParams.get('tenantId');
  if (tenantId) return tenantId;
  const tenantSlug = url.searchParams.get('tenantSlug') || 'holo-print';
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug);
  return rows[0]?.id || 'holo-print';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = await resolveTenantId(url);
    const channelSlug = url.searchParams.get('channelSlug') || 'default-store';
    const data = await getPublicHostedThemeSettings(tenantId, channelSlug);
    return NextResponse.json({ ok: true, source: 'hosted-theme-settings', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'hosted-theme-settings', error: error instanceof Error ? error.message : 'Hosted theme settings could not load.' }, { status: 500 });
  }
}
