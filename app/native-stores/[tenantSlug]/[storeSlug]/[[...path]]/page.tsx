import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { loadTenantThemeCategories, loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import StorefrontSensitiveUrlGuard from '@/themes/atlantis-native/StorefrontSensitiveUrlGuard';
import { appendStorefrontContentPageMenuItems, resolveStorefrontContentPage } from '@/theme-runtime/content-pages';
import { loadRuntimeMenuItems } from '@/theme-runtime/menu-loader';
import { STOREFRONT_PRIVATE_ROUTE_TITLES, STOREFRONT_SENSITIVE_URL_ROUTES } from '@/theme-runtime/private-route-policy';
import { getStorefrontThemeManifest, renderStorefrontTheme } from '@/theme-runtime/registry';
import { loadStorefrontRuntimeSettings, resolveStorefrontTenantIds } from '@/theme-runtime/storefront-settings-loader';
import type { StorefrontRuntimeContext, StorefrontRuntimeSearchParams } from '@/theme-runtime/types';

export const dynamic = 'force-dynamic';
type RawSearchParams = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }>; searchParams?: Promise<RawSearchParams> };
const clean = (value: string) => String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
const titleFromSlug = (value: string) => String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
function normaliseSearchParams(input: RawSearchParams | undefined): StorefrontRuntimeSearchParams { const out: StorefrontRuntimeSearchParams = {}; Object.entries(input || {}).forEach(([key, value]) => { const first = Array.isArray(value) ? value[0] : value; if (typeof first === 'string' && first.trim()) out[key] = first.trim(); }); return out; }
const isPublishedStore = (status: string) => ['published', 'active', 'live'].includes(String(status || '').toLowerCase());

function privateRouteMetadata(routeRoot: string, storeName: string): Metadata {
  const title = `${STOREFRONT_PRIVATE_ROUTE_TITLES[routeRoot] || 'Private storefront page'} | ${storeName}`;
  return {
    title,
    description: '',
    referrer: 'no-referrer',
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      googleBot: { index: false, follow: false, noimageindex: true, 'max-snippet': 0, 'max-image-preview': 'none' },
    },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug), cleanStoreSlug = clean(storeSlug), cleanPath = path.map(clean).filter(Boolean);
  const ids = await resolveStorefrontTenantIds(cleanTenantSlug);
  const settings = await loadStorefrontRuntimeSettings(cleanTenantSlug, cleanStoreSlug, ids).catch(() => null);
  if (!settings?.storeFound || !isPublishedStore(settings.storeStatus)) return { title: 'Storefront unavailable', referrer: 'no-referrer', robots: { index: false, follow: false } };
  const routeRoot = cleanPath[0] || '';
  if (STOREFRONT_PRIVATE_ROUTE_TITLES[routeRoot]) return privateRouteMetadata(routeRoot, settings.storeName);
  let title = cleanPath.length ? titleFromSlug(cleanPath[cleanPath.length - 1]) : settings.storeName;
  let description = cleanPath.length ? `${title} from ${settings.storeName}.` : String(settings.content?.seoDescription || settings.content?.description || '');
  let image = String(settings.content?.socialImage || settings.content?.heroImage || '');
  let index = true;
  try {
    const products = await loadTenantThemeProducts(ids), categories = await loadTenantThemeCategories(ids, products);
    const contentPage = resolveStorefrontContentPage(settings.pages || [], cleanPath, products, categories, { includeDisabled: true });
    if (contentPage) { title = contentPage.seoTitle || contentPage.title; description = contentPage.seoDescription || contentPage.summary || description; image = contentPage.socialImage || image; index = contentPage.enabled && !contentPage.noIndex; }
    else { const category = cleanPath[0] ? categories.find((item) => item.slug === cleanPath[0]) : undefined; const product = cleanPath[1] ? products.find((item) => item.category === cleanPath[0] && item.slug === cleanPath[cleanPath.length - 1]) : undefined; title = product?.title || category?.title || title; description = product?.text || category?.description || description; image = product?.image || category?.image || image; }
  } catch {}
  const canonical = `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}${cleanPath.length ? `/${cleanPath.join('/')}` : ''}`;
  const fullTitle = cleanPath.length && settings.storeName ? `${title} | ${settings.storeName}` : title;
  return { title: fullTitle, description, alternates: { canonical }, openGraph: { title: fullTitle, description, url: canonical, type: 'website', images: image ? [{ url: image }] : undefined }, twitter: { card: 'summary_large_image', title: fullTitle, description, images: image ? [image] : undefined }, robots: { index, follow: index } };
}

export default async function NativeStorePreview({ params, searchParams }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug), cleanStoreSlug = clean(storeSlug), routeSegments = path.map(clean).filter(Boolean);
  if (!cleanTenantSlug || !cleanStoreSlug) notFound();
  const ids = await resolveStorefrontTenantIds(cleanTenantSlug);
  const [products, settings] = await Promise.all([loadTenantThemeProducts(ids), loadStorefrontRuntimeSettings(cleanTenantSlug, cleanStoreSlug, ids)]);
  if (!settings.storeFound || !isPublishedStore(settings.storeStatus)) notFound();
  const menuPromise = settings.navigationManaged || settings.navigation.length ? Promise.resolve(settings.navigation) : loadRuntimeMenuItems(ids);
  const [rawMenuItems, categories, collectionPoints] = await Promise.all([menuPromise, loadTenantThemeCategories(ids, products), loadCollectionPoints(ids)]);
  const hiddenPage = resolveStorefrontContentPage(settings.pages || [], routeSegments, products, categories, { includeDisabled: true });
  if (hiddenPage && !hiddenPage.enabled) notFound();
  const menuItems = appendStorefrontContentPageMenuItems(rawMenuItems, settings.pages || []);
  const themeManifest = getStorefrontThemeManifest(settings.themeKey);
  const context: StorefrontRuntimeContext = { tenantSlug: cleanTenantSlug, storeSlug: cleanStoreSlug, tenantIds: ids, storeBase: `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}`, routeSegments, searchParams: normaliseSearchParams(await searchParams), themeKey: themeManifest.key, themeSource: settings.source === 'defaults' ? 'default' : 'tenant-setting', themeManifest, uploadedThemes: [], navItems: buildNavItems(menuItems, { allowFallback: !settings.navigationManaged }), products, categories, collectionPoints, settings };
  const rendered = await renderStorefrontTheme(context);
  return <>{STOREFRONT_SENSITIVE_URL_ROUTES.has(routeSegments[0] || '') ? <StorefrontSensitiveUrlGuard /> : null}{rendered}</>;
}
