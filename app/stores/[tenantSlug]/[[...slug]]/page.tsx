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

type ThemeResolution = {
  url: string;
  themeKey: string;
  reason: string;
};

const KNOWN_UPLOADED_THEME_RENDERERS: Record<string, string> = {
  'atlantis-print-hosted': 'https://hosted-theme.vercel.app',
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
  const deployment = meta.deployment && typeof meta.deployment === 'object' ? meta.deployment : {};
  const renderer = meta.renderer && typeof meta.renderer === 'object' ? meta.renderer : {};
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
    deployment.url,
    deployment.rendererUrl,
    deployment.publicUrl,
    renderer.url,
    renderer.publicUrl,
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
           AND resource=$3
         LIMIT 1`,
        tenantId,
        storeSlug,
        'store-channels',
      );
      if (rows[0]?.id) return { id: rows[0].id, tenantId: rows[0].tenantId || tenantId, metadataJson: rows[0].metadataJson || {} };
    } catch {
      // Try the next tenant identifier. Public preview should never crash on a validation query.
    }
  }
  return null;
}

async function resolveThemeRenderer(store: StoreMatch): Promise<ThemeResolution> {
  const storeMeta = store.metadataJson || {};
  const themeKey = selectedThemeKey(storeMeta);

  const directStoreRenderer = rendererUrlFromMeta(storeMeta);
  if (directStoreRenderer) return { url: directStoreRenderer, themeKey, reason: 'store-renderer-url' };

  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>(
      'SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
      'platform',
      'platform-themes',
      themeKey,
    );
    const themeMeta = rows[0]?.metadataJson || {};
    const themeRenderer = rendererUrlFromMeta(themeMeta);
    if (themeRenderer) return { url: themeRenderer, themeKey, reason: 'platform-theme-renderer-url' };
  } catch {
    // Fall through to known/env renderer.
  }

  const knownRenderer = KNOWN_UPLOADED_THEME_RENDERERS[themeKey];
  if (knownRenderer) return { url: knownRenderer, themeKey, reason: 'known-uploaded-theme-renderer' };

  const envUrl = envThemeBaseUrl();
  if (envUrl) return { url: envUrl, themeKey, reason: 'env-renderer-url' };

  return { url: '', themeKey, reason: 'missing-renderer-url' };
}

function MissingRendererMessage({ themeKey, storeSlug }: { themeKey: string; storeSlug: string }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', color: '#111827', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ maxWidth: 760, border: '1px solid #e5e7eb', borderRadius: 24, background: '#ffffff', padding: 32, boxShadow: '0 20px 50px rgba(15,23,42,.08)' }}>
        <p style={{ margin: '0 0 10px', color: '#18a7d0', fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>Uploaded theme renderer missing</p>
        <h1 style={{ margin: '0 0 12px', fontSize: 32, lineHeight: 1.1 }}>The store has a selected theme, but that theme does not have a renderer URL saved.</h1>
        <p style={{ margin: '0 0 14px', color: '#64748b', lineHeight: 1.7 }}>Store: <strong>{storeSlug}</strong><br />Selected theme: <strong>{themeKey}</strong></p>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.7 }}>Add a renderer URL to the uploaded theme manifest/record, for example <strong>rendererUrl</strong>, <strong>publicRendererUrl</strong>, <strong>previewUrl</strong>, or <strong>deployedUrl</strong>. The tenant preview will not use the internal /theme/atlantis preview because that is not the real uploaded theme layout.</p>
      </div>
    </main>
  );
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

  const theme = await resolveThemeRenderer(validStore);
  if (!theme.url) return <MissingRendererMessage themeKey={theme.themeKey} storeSlug={storeSlug} />;

  const themePathParts = slug.slice(1).filter(Boolean);
  const themePath = themePathParts.length ? `/${themePathParts.map(encodeURIComponent).join('/')}` : '/';

  const url = new URL(`${theme.url}${themePath}`);
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
