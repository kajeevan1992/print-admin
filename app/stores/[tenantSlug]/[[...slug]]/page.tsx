import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ tenantSlug: string; slug?: string[] }>;
};

type TenantIdentity = {
  canonicalTenantId: string;
  identifiers: string[];
};

function cleanSegment(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
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

async function resolveTenantIdentity(tenantSlugInput: string): Promise<TenantIdentity | null> {
  const tenantSlug = cleanSegment(tenantSlugInput);
  if (!tenantSlug) return null;

  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    tenantSlug,
  );
  const row = rows[0];
  const identifiers = unique([tenantSlug, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  return { canonicalTenantId: row?.id || tenantSlug, identifiers };
}

async function storeExistsForTenant(identity: TenantIdentity, storeSlug: string) {
  if (!identity.identifiers.length || !storeSlug) return false;

  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string }>>(
    `SELECT id,"tenantId" FROM "CoreCatalogRecord"
     WHERE "tenantId" = ANY($1::text[])
       AND slug=$2
       AND resource IN ($3,$4,$5,$6,$7,$8,$9)
     LIMIT 1`,
    identity.identifiers,
    storeSlug,
    'store-channels',
    'hosted-theme-settings',
    'store-domain-bindings',
    'storefront-stores',
    'storefront-store',
    'store-channel',
    'tenant-stores',
  );
  return rows[0] || null;
}

export default async function PublicStoreThemeFrame({ params }: PageProps) {
  const { tenantSlug, slug = [] } = await params;
  const cleanTenantSlug = cleanSegment(tenantSlug);
  const storeSlug = cleanSegment(slug[0] || '');

  if (!cleanTenantSlug || !storeSlug) notFound();

  const tenantIdentity = await resolveTenantIdentity(cleanTenantSlug);
  if (!tenantIdentity) notFound();

  const validStore = await storeExistsForTenant(tenantIdentity, storeSlug);
  if (!validStore) notFound();

  const themePathParts = slug.slice(1).filter(Boolean);
  const themePath = themePathParts.length ? `/${themePathParts.map(encodeURIComponent).join('/')}` : '/';

  const url = new URL(`${hostedThemeBaseUrl()}${themePath}`);
  url.searchParams.set('tenantSlug', cleanTenantSlug);
  url.searchParams.set('tenantId', validStore.tenantId || tenantIdentity.canonicalTenantId);
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
