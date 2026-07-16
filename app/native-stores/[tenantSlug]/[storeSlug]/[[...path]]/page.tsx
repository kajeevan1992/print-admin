import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { loadTenantThemeCategories, loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import { loadRuntimeMenuItems } from '@/theme-runtime/menu-loader';
import { getStorefrontThemeManifest, renderStorefrontTheme } from '@/theme-runtime/registry';
import { loadStorefrontRuntimeSettings, resolveStorefrontTenantIds } from '@/theme-runtime/storefront-settings-loader';
import type { StorefrontRuntimeContext, StorefrontRuntimeSearchParams } from '@/theme-runtime/types';

export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }>; searchParams?: Promise<RawSearchParams> };

function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function titleFromSlug(value: string) { return String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function normaliseSearchParams(input: RawSearchParams | undefined): StorefrontRuntimeSearchParams { const out: StorefrontRuntimeSearchParams = {}; Object.entries(input || {}).forEach(([key, value]) => { const first = Array.isArray(value) ? value[0] : value; if (typeof first === 'string' && first.trim()) out[key] = first.trim(); }); return out; }
function isPublishedStore(status: string) { return ['published', 'active', 'live'].includes(String(status || '').toLowerCase()); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const cleanPath = path.map(clean).filter(Boolean);
  const ids = await resolveStorefrontTenantIds(cleanTenantSlug);
  const settings = await loadStorefrontRuntimeSettings(cleanTenantSlug, cleanStoreSlug, ids).catch(() => null);

  if (!settings?.storeFound || !isPublishedStore(settings.storeStatus)) {
    return { title: 'Storefront unavailable', robots: { index: false, follow: false } };
  }

  let title = cleanPath.length ? titleFromSlug(cleanPath[cleanPath.length - 1]) : settings.storeName;
  let description = cleanPath.length ? `${title} from ${settings.storeName}.` : String(settings.content?.seoDescription || settings.content?.description || '');
  let image = String(settings.content?.socialImage || settings.content?.heroImage || '');
  try {
    const products = await loadTenantThemeProducts(ids);
    const categories = await loadTenantThemeCategories(ids, products);
    const category = cleanPath[0] ? categories.find((item) => item.slug === cleanPath[0]) : undefined;
    const product = cleanPath[1] ? products.find((item) => item.category === cleanPath[0] && item.slug === cleanPath[1]) : undefined;
    title = product?.title || category?.title || title;
    description = product?.text || category?.description || description;
    image = product?.image || category?.image || image;
  } catch {}
  const canonical = `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}${cleanPath.length ? `/${cleanPath.join('/')}` : ''}`;
  const fullTitle = cleanPath.length && settings.storeName ? `${title} | ${settings.storeName}` : title;
  const openGraph = { title: fullTitle, description, url: canonical, type: 'website' as const, images: image ? [{ url: image }] : undefined };
  const twitter = { card: 'summary_large_image' as const, title: fullTitle, description, images: image ? [image] : undefined };
  return { title: fullTitle, description, alternates: { canonical }, openGraph, twitter, robots: { index: true, follow: true } };
}

export default async function NativeStorePreview({ params, searchParams }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  if (!cleanTenantSlug || !cleanStoreSlug) notFound();

  const ids = await resolveStorefrontTenantIds(cleanTenantSlug);
  const [products, settings] = await Promise.all([
    loadTenantThemeProducts(ids),
    loadStorefrontRuntimeSettings(cleanTenantSlug, cleanStoreSlug, ids),
  ]);
  if (!settings.storeFound || !isPublishedStore(settings.storeStatus)) notFound();

  const [menuItems, categories, collectionPoints] = await Promise.all([
    settings.navigation.length ? Promise.resolve(settings.navigation) : loadRuntimeMenuItems(ids),
    loadTenantThemeCategories(ids, products),
    loadCollectionPoints(ids),
  ]);
  const themeManifest = getStorefrontThemeManifest(settings.themeKey);
  const context: StorefrontRuntimeContext = {
    tenantSlug: cleanTenantSlug,
    storeSlug: cleanStoreSlug,
    tenantIds: ids,
    storeBase: `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}`,
    routeSegments: path.map(clean).filter(Boolean),
    searchParams: normaliseSearchParams(await searchParams),
    themeKey: themeManifest.key,
    themeSource: settings.source === 'defaults' ? 'default' : 'tenant-setting',
    themeManifest,
    uploadedThemes: [],
    navItems: buildNavItems(menuItems),
    products,
    categories,
    collectionPoints,
    settings,
  };
  return renderStorefrontTheme(context);
}
