import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ tenantSlug: string; slug?: string[] }>;
};

function cleanSegment(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hostedThemeBaseUrl() {
  return (
    process.env.HOSTED_THEME_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_HOSTED_THEME_URL ||
    'https://hosted-theme.vercel.app'
  ).replace(/\/$/, '');
}

function adminBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_PLATFORM_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'print-admin-teal.vercel.app'
  ).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

async function resolveTenantId(tenantSlug: string) {
  const slug = cleanSegment(tenantSlug);
  if (!slug) return '';
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    slug,
  );
  return rows[0]?.id || '';
}

async function storeExistsForTenant(tenantId: string, storeSlug: string) {
  if (!tenantId || !storeSlug) return false;

  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource IN ($3,$4,$5,$6,$7,$8,$9) LIMIT 1',
      tenantId,
      storeSlug,
      'hosted-theme-settings',
      'store-domain-bindings',
      'storefront-stores',
      'storefront-store',
      'store-channels',
      'store-channel',
      'tenant-stores',
    );
    return Boolean(rows[0]?.id);
  } catch {
    return false;
  }
}

export default async function PublicStoreThemeFrame({ params }: PageProps) {
  const { tenantSlug, slug = [] } = await params;
  const cleanTenantSlug = cleanSegment(tenantSlug);
  const storeSlug = cleanSegment(slug[0] || '');

  if (!cleanTenantSlug || !storeSlug) notFound();

  const tenantId = await resolveTenantId(cleanTenantSlug);
  if (!tenantId) notFound();

  const validStore = await storeExistsForTenant(tenantId, storeSlug);
  if (!validStore) notFound();

  const themePathParts = slug.slice(1).filter(Boolean);
  const themePath = themePathParts.length ? `/${themePathParts.map(encodeURIComponent).join('/')}` : '/';

  const url = new URL(`${hostedThemeBaseUrl()}${themePath}`);
  url.searchParams.set('tenantSlug', cleanTenantSlug);
  url.searchParams.set('channelSlug', storeSlug);
  url.searchParams.set('storeSlug', storeSlug);
  url.searchParams.set('platformUrl', `https://${adminBaseUrl()}`);

  return (
    <main className="holo-public-theme-frame">
      <iframe
        title={`${cleanTenantSlug} ${storeSlug} hosted storefront`}
        src={url.toString()}
        className="holo-public-theme-frame__iframe"
        allow="payment *; clipboard-read; clipboard-write"
      />
      <style>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
        .holo-public-theme-frame { position: fixed; inset: 0; min-height: 100vh; width: 100vw; overflow: hidden; background: #ffffff; }
        .holo-public-theme-frame__iframe { display: block; width: 100%; height: 100%; min-height: 100vh; border: 0; background: #ffffff; }
      `}</style>
    </main>
  );
}
