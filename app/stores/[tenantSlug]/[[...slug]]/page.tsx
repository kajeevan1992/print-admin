import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import { PublicStoreFrameBridge } from '@/components/storefront/public-store-frame-bridge';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; slug?: string[] }> };
type StoreMatch = { id: string; tenantId: string; metadataJson: Record<string, any> };

const INTERNAL_RENDERERS: Record<string, string> = {
  'atlantis-print-hosted': '/uploaded-theme-renderer/atlantis-print-hosted',
};

function clean(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function adminHost() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_PLATFORM_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'print-admin-teal.vercel.app'
  ).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function adminUrl(pathname: string) {
  return `https://${adminHost()}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function selectedThemeKey(meta: Record<string, any>) {
  return clean(String(meta.themeKey || meta.themeId || meta.selectedThemeKey || meta.selectedThemeId || meta.theme || ''));
}

async function tenantIds(tenantSlugInput: string) {
  const tenantSlug = clean(tenantSlugInput);
  if (!tenantSlug) return [];
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
      'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
      tenantSlug,
    );
    const row = rows[0];
    return uniq([tenantSlug, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch {
    return [tenantSlug];
  }
}

async function findStore(ids: string[], storeSlug: string): Promise<StoreMatch | null> {
  for (const tenantId of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string; metadataJson: any }>>(
        'SELECT id,"tenantId","metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource=$3 LIMIT 1',
        tenantId,
        storeSlug,
        'store-channels',
      );
      if (rows[0]?.id) return { id: rows[0].id, tenantId: rows[0].tenantId || tenantId, metadataJson: rows[0].metadataJson || {} };
    } catch {}
  }
  return null;
}

async function rendererForStore(store: StoreMatch) {
  const themeKey = selectedThemeKey(store.metadataJson || {});
  const internalRoute = INTERNAL_RENDERERS[themeKey];
  if (internalRoute) return { themeKey, url: adminUrl(internalRoute) };

  const envRenderer = String(process.env.UPLOADED_THEME_RENDERER_URL || '').replace(/\/$/, '');
  if (envRenderer) return { themeKey, url: envRenderer };

  return { themeKey, url: '' };
}

function MissingRenderer({ themeKey, storeSlug }: { themeKey: string; storeSlug: string }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', color: '#111827', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ maxWidth: 720, border: '1px solid #e5e7eb', borderRadius: 24, background: '#fff', padding: 32 }}>
        <p style={{ margin: '0 0 10px', color: '#18a7d0', fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>Uploaded theme renderer missing</p>
        <h1 style={{ margin: '0 0 12px', fontSize: 30, lineHeight: 1.1 }}>This store has a selected theme, but no internal uploaded-theme renderer is available.</h1>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.7 }}>Store: <strong>{storeSlug}</strong><br />Selected theme: <strong>{themeKey || 'not set'}</strong></p>
      </div>
    </main>
  );
}

export default async function PublicStoreThemeFrame({ params }: PageProps) {
  const { tenantSlug, slug = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const storeSlug = clean(slug[0] || '');
  if (!cleanTenantSlug || !storeSlug) notFound();

  const ids = await tenantIds(cleanTenantSlug);
  const store = await findStore(ids, storeSlug);
  if (!store) notFound();

  const theme = await rendererForStore(store);
  if (!theme.url) return <MissingRenderer themeKey={theme.themeKey} storeSlug={storeSlug} />;

  const themePathParts = slug.slice(1).filter(Boolean);
  const themePath = themePathParts.length ? `/${themePathParts.map(encodeURIComponent).join('/')}` : '/';
  const url = new URL(`${theme.url}${themePath}`);
  url.searchParams.set('tenantSlug', cleanTenantSlug);
  url.searchParams.set('tenantId', store.tenantId || ids[0] || cleanTenantSlug);
  url.searchParams.set('channelSlug', storeSlug);
  url.searchParams.set('storeSlug', storeSlug);
  url.searchParams.set('platformUrl', `https://${adminHost()}`);
  url.searchParams.set('disableHomepageTakeover', '1');

  const publicStoreBasePath = `/stores/${cleanTenantSlug}/${storeSlug}`;

  return (
    <main className="holo-public-theme-frame">
      <iframe id="holo-public-theme-frame" title={`${cleanTenantSlug} ${storeSlug} storefront`} src={url.toString()} className="holo-public-theme-frame__iframe" />
      <PublicStoreFrameBridge basePath={publicStoreBasePath} frameId="holo-public-theme-frame" rendererBasePath={`/uploaded-theme-renderer/${theme.themeKey}`} />
      <style>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
        .holo-public-theme-frame { position: fixed; inset: 0; min-height: 100vh; width: 100vw; overflow: hidden; background: #ffffff; }
        .holo-public-theme-frame__iframe { display: block; width: 100%; height: 100%; min-height: 100vh; border: 0; background: #ffffff; }
      `}</style>
    </main>
  );
}
