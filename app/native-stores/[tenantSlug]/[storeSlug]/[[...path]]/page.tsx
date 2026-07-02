import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { loadTenantThemeCategories, loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import { loadRuntimeMenuItems } from '@/theme-runtime/menu-loader';
import { getDefaultStorefrontThemeManifest, renderStorefrontTheme } from '@/theme-runtime/registry';
import type { StorefrontRuntimeContext } from '@/theme-runtime/types';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }> };

const STORE_RESOURCES = ['store-channels', 'hosted-theme-settings', 'store-domain-bindings', 'storefront-stores', 'storefront-store', 'store-channel', 'tenant-stores'];
function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function titleFromSlug(value: string) { return String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }
async function tenantIds(tenantSlugInput: string) { const baseCandidates = tenantCandidates(tenantSlugInput); const tenantSlug = clean(tenantSlugInput); try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug); const row = rows[0]; return uniq([...baseCandidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']); } catch { return uniq(baseCandidates); } }
async function storeExists(ids: string[], storeSlug: string) { for (const tenantId of ids) for (const resource of STORE_RESOURCES) { try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string }>>('SELECT "tenantId" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource=$3 LIMIT 1', tenantId, storeSlug, resource); if (rows[0]?.tenantId) return true; } catch {} } return storeSlug === 'default-store' && ids.length > 0; }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const cleanPath = path.map(clean).filter(Boolean);
  const title = cleanPath.length ? titleFromSlug(cleanPath[cleanPath.length - 1]) : titleFromSlug(cleanTenantSlug);
  const description = cleanPath.length ? `${title} from ${titleFromSlug(cleanTenantSlug)}.` : `${titleFromSlug(cleanTenantSlug)} online print storefront.`;
  const canonical = `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}${cleanPath.length ? `/${cleanPath.join('/')}` : ''}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: 'website' } };
}

export default async function NativeStorePreview({ params }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const ids = await tenantIds(cleanTenantSlug);
  if (!cleanTenantSlug || !cleanStoreSlug || !(await storeExists(ids, cleanStoreSlug))) notFound();
  const products = await loadTenantThemeProducts(ids);
  const context: StorefrontRuntimeContext = {
    tenantSlug: cleanTenantSlug,
    storeSlug: cleanStoreSlug,
    tenantIds: ids,
    storeBase: `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}`,
    routeSegments: path.map(clean).filter(Boolean),
    themeKey: 'atlantis-print-hosted',
    themeSource: 'default',
    themeManifest: getDefaultStorefrontThemeManifest(),
    uploadedThemes: [],
    navItems: buildNavItems(await loadRuntimeMenuItems(ids)),
    products,
    categories: await loadTenantThemeCategories(ids, products),
    collectionPoints: await loadCollectionPoints(ids),
  };
  return renderStorefrontTheme(context);
}
