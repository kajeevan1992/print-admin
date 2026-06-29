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

type StoreMatch = {
  id: string;
  tenantId: string;
  metadataJson: Record<string, any>;
};

const INTERNAL_THEME_ROUTES: Record<string, string> = {
  base: '/theme/atlantis',
  atlantis: '/theme/atlantis',
  'holo-default': '/theme/atlantis',
  'holo-print': '/theme/atlantis',
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

function envThemeBaseUrl() {
  return (
    process.env.HOSTED_THEME_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_HOSTED_THEME_URL ||
    process.env.UPLOADED_THEME_RENDERER_URL ||
    ''
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

function absoluteAdminUrl(pathname: string) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `https://${adminBaseUrl()}${path}`;
}

function firstUrl(...values: any[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (/^https?:\/\//i.test(text)) return text.replace(/\/$/, '');
  }
  return '';
}

function selectedThemeKey(meta: Record<string, any>) {
  return cleanSegment(String(meta.themeKey || meta.themeId || meta.selectedThemeKey || meta.selectedThemeId || meta.theme || 'base')) || 'base';
}

function rendererUrlFromMeta(meta: Record<string, any>) {
  const manifest = meta.manifest && typeof meta.manifest === 'object' ? meta.manifest : {};
  return firstUrl(
    meta.rendererUrl,
    meta.publicRendererUrl,
    meta.hostedRendererUrl,
    meta.themeRendererUrl,
    meta.publicUrl,
    meta.previewUrl,
    meta.deployedUrl,
    meta.deploymentUrl,
    meta.appUrl,
    meta.themeUrl,
    meta.storefrontUrl,
    manifest.rendererUrl,
    manifest.publicRendererUrl,
    manifest.hostedRendererUrl,
    manifest.themeRendererUrl,
    manifest.publicUrl,
    manifest.previewUrl,
    manifest.deployedUrl,
    manifest.deploymentUrl,
    manifest.appUrl,
    manifest.themeUrl,
    manifest.storefrontUrl,
  );
}

async function resolveTenantIdentity(tenantSlugInput: string): Promise<TenantIdentity | null> {
  const tenantSlug = cleanSegment(tenantSlugInput);
  if (!tenantSlug) return null;

  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
      'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
      tenantSlug,
    );
    const row = rows[0];
    const identifiers = unique([tenantSlug, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
    return { canonicalTenantId: row?.id || tenantSlug, identifiers };
  } catch {
    return { canonicalTenantId: tenantSlug, identifiers: [tenantSlug] };
  }
}

async function storeExistsForTenant(identity: TenantIdentity, storeSlug: string): Promise<StoreMatch | null> {
  if (!identity.identifiers.length || !storeSlug) return null;

  for (const tenantId of identity.identifiers) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string; metadataJson: any }>>(
        `SELECT id,"tenantId","metadataJson" FROM "CoreCatalogRecord"
         WHERE "tenantId"=$1
           AND slug=$2
           AND resource IN ($3,$4,$5,$6,$7,$8,$9)
         LIMIT 1`,
        tenantId,
        storeSlug,
        'store-channels',
        'hosted-theme-settings',
        'store-domain-bindings',
        'storefront-stores',
        'storefront-store',
        'store-channel',
        'tenant-stores',
      );
      if (rows[0]?.id) return { id: rows[0].id, tenantId: rows[0].tenantId || tenantId, metadataJson: rows[0].metadataJson || {} };
    } catch {
      // Try the next tenant identifier. Public preview should never crash on a validation query.
    }
  }
  return null;
}

async function resolveThemeRendererUrl(store: StoreMatch) {
  const envUrl = envThemeBaseUrl();
  if (envUrl) return envUrl;

  const storeMeta = store.metadataJson || {};
  const directStoreRenderer = rendererUrlFromMeta(storeMeta);
  if (directStoreRenderer) return directStoreRenderer;

  const themeKey = selectedThemeKey(storeMeta);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>(
      'SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
      'platform',
      'platform-themes',
      themeKey,
    );
    const themeMeta = rows[0]?.metadataJson || {};
    const themeRenderer = rendererUrlFromMeta(themeMeta);
    if (themeRenderer) return themeRenderer;
  } catch {
    // Fall through to internal renderer map.
  }

  const internalRoute = INTERNAL_THEME_ROUTES[themeKey] || INTERNAL_THEME_ROUTES.base;
  return absoluteAdminUrl(internalRoute);
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

  const themeBaseUrl = await resolveThemeRendererUrl(validStore);
  if (!themeBaseUrl) notFound();

  const themePathParts = slug.slice(1).filter(Boolean);
  const themePath = themePathParts.length ? `/${themePathParts.map(encodeURIComponent).join('/')}` : '/';

  const url = new URL(`${themeBaseUrl}${themePath}`);
  url.searchParams.set('tenantSlug', cleanTenantSlug);
  url.searchParams.set('tenantId', validStore.tenantId || tenantIdentity.canonicalTenantId);
  url.searchParams.set('channelSlug', storeSlug);
  url.searchParams.set('storeSlug', storeSlug);
  url.searchParams.set('platformUrl', `https://${adminBaseUrl()}`);
  url.searchParams.set('disableHomepageTakeover', '1');

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
