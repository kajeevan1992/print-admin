import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { loadTenantThemeCategories, loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import { loadRuntimeMenuItems } from '@/theme-runtime/menu-loader';
import { getStorefrontThemeManifest, renderStorefrontTheme } from '@/theme-runtime/registry';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';
import type { StorefrontRuntimeContext, StorefrontRuntimeSearchParams } from '@/theme-runtime/types';

export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }>; searchParams?: Promise<RawSearchParams> };

const STORE_RESOURCES = ['store-channels', 'hosted-theme-settings', 'store-domain-bindings', 'storefront-stores', 'storefront-store', 'store-channel', 'tenant-stores'];
function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function titleFromSlug(value: string) { return String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }
function normaliseSearchParams(input: RawSearchParams | undefined): StorefrontRuntimeSearchParams { const out: StorefrontRuntimeSearchParams = {}; Object.entries(input || {}).forEach(([key, value]) => { const first = Array.isArray(value) ? value[0] : value; if (typeof first === 'string' && first.trim()) out[key] = first.trim(); }); return out; }
async function tenantIds(tenantSlugInput: string) { const baseCandidates = tenantCandidates(tenantSlugInput); const tenantSlug = clean(tenantSlugInput); try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug); const row = rows[0]; return uniq([...baseCandidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']); } catch { return uniq(baseCandidates); } }
async function storeExists(ids: string[], storeSlug: string) { for (const tenantId of ids) for (const resource of STORE_RESOURCES) { try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string }>>('SELECT "tenantId" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND (slug=$2 OR "metadataJson"->>\'storeId\'=$2 OR "metadataJson"->>\'slug\'=$2) AND resource=$3 LIMIT 1', tenantId, storeSlug, resource); if (rows[0]?.tenantId) return true; } catch {} } return storeSlug === 'default-store' && ids.length > 0; }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const cleanPath = path.map(clean).filter(Boolean);
  const settings = await loadStorefrontRuntimeSettings(cleanTenantSlug, cleanStoreSlug).catch(() => null);
  let title = cleanPath.length ? titleFromSlug(cleanPath[cleanPath.length - 1]) : settings?.storeName || titleFromSlug(cleanTenantSlug);
  let description = cleanPath.length ? `${title} from ${settings?.storeName || titleFromSlug(cleanTenantSlug)}.` : String(settings?.content?.seoDescription || settings?.content?.description || `${settings?.storeName || titleFromSlug(cleanTenantSlug)} online print storefront.`);
  let image = String(settings?.content?.socialImage || settings?.content?.heroImage || '');
  try {
    const ids = await tenantIds(cleanTenantSlug);
    const products = await loadTenantThemeProducts(ids);
    const categories = await loadTenantThemeCategories(ids, products);
    const category = cleanPath[0] ? categories.find((item) => item.slug === cleanPath[0]) : undefined;
    const product = cleanPath[1] ? products.find((item) => item.category === cleanPath[0] && item.slug === cleanPath[1]) : undefined;
    title = product?.title || category?.title || title;
    description = product?.text || category?.description || description;
    image = product?.image || category?.image || image;
  } catch {}
  const canonical = `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}${cleanPath.length ? `/${cleanPath.join('/')}` : ''}`;
  const fullTitle = cleanPath.length && settings?.storeName ? `${title} | ${settings.storeName}` : title;
  const openGraph = { title: fullTitle, description, url: canonical, type: 'website' as const, images: image ? [{ url: image }] : undefined };
  const twitter = { card: 'summary_large_image' as const, title: fullTitle, description, images: image ? [image] : undefined };
  return { title: fullTitle, description, alternates: { canonical }, openGraph, twitter, robots: { index: true, follow: true } };
}

export default async function NativeStorePreview({ params, searchParams }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const ids = await tenantIds(cleanTenantSlug);
  if (!cleanTenantSlug || !cleanStoreSlug || !(await storeExists(ids, cleanStoreSlug))) notFound();
  const [products, settings] = await Promise.all([
    loadTenantThemeProducts(ids),
    loadStorefrontRuntimeSettings(cleanTenantSlug, cleanStoreSlug),
  ]);
  const menuItems = settings.navigation.length ? settings.navigation : await loadRuntimeMenuItems(ids);
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
    categories: await loadTenantThemeCategories(ids, products),
    collectionPoints: await loadCollectionPoints(ids),
  };
  return renderStorefrontTheme(context);
}
