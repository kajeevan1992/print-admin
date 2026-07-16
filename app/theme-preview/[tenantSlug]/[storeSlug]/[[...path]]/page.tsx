import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { loadTenantThemeCategories, loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import { loadRuntimeMenuItems } from '@/theme-runtime/menu-loader';
import { getStorefrontThemeManifest, renderStorefrontTheme } from '@/theme-runtime/registry';
import { loadStorefrontDraftRuntimeSettings } from '@/theme-runtime/draft-preview-loader';
import { resolveStorefrontTenantIds } from '@/theme-runtime/storefront-settings-loader';
import type { StorefrontRuntimeContext, StorefrontRuntimeSearchParams } from '@/theme-runtime/types';

export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }>; searchParams?: Promise<RawSearchParams> };

function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function normaliseSearchParams(input: RawSearchParams | undefined): StorefrontRuntimeSearchParams { const out: StorefrontRuntimeSearchParams = {}; Object.entries(input || {}).forEach(([key, value]) => { const first = Array.isArray(value) ? value[0] : value; if (typeof first === 'string' && first.trim()) out[key] = first.trim(); }); return out; }

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Draft storefront preview',
    description: 'Authenticated storefront theme draft preview.',
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ThemeDraftPreview({ params, searchParams }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  if (!cleanTenantSlug || !cleanStoreSlug) notFound();

  try {
    await requireTenantSession(cleanTenantSlug);
  } catch {
    notFound();
  }

  const ids = await resolveStorefrontTenantIds(cleanTenantSlug);
  const [products, settings] = await Promise.all([
    loadTenantThemeProducts(ids),
    loadStorefrontDraftRuntimeSettings(cleanTenantSlug, cleanStoreSlug, ids),
  ]);
  if (!settings.storeFound) notFound();

  const [menuItems, categories, collectionPoints] = await Promise.all([
    settings.navigation.length ? Promise.resolve(settings.navigation) : loadRuntimeMenuItems(ids),
    loadTenantThemeCategories(ids, products),
    loadCollectionPoints(ids),
  ]);
  const themeManifest = getStorefrontThemeManifest(settings.themeKey);
  const storeBase = `/theme-preview/${cleanTenantSlug}/${cleanStoreSlug}`;
  const context: StorefrontRuntimeContext = {
    tenantSlug: cleanTenantSlug,
    storeSlug: cleanStoreSlug,
    tenantIds: ids,
    storeBase,
    routeSegments: path.map(clean).filter(Boolean),
    searchParams: normaliseSearchParams(await searchParams),
    themeKey: themeManifest.key,
    themeSource: 'tenant-setting',
    themeManifest,
    uploadedThemes: [],
    navItems: buildNavItems(menuItems),
    products,
    categories,
    collectionPoints,
    settings,
  };
  const storefront = await renderStorefrontTheme(context);
  return <>
    <div className="sticky top-0 z-[1000] flex min-h-10 items-center justify-center bg-amber-300 px-4 py-2 text-center text-[12px] font-black text-black shadow-md">Draft preview · Only authenticated store administrators can view this page · Changes are not live</div>
    {storefront}
  </>;
}
