import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { loadTenantThemeProducts } from '@/themes/atlantis-native/catalog-adapter';
import type { MenuItem } from '@/themes/atlantis-native/types';
import { DEFAULT_STOREFRONT_MENU } from '@/theme-runtime/default-menu';
import { renderStorefrontTheme } from '@/theme-runtime/registry';
import type { StorefrontRuntimeContext } from '@/theme-runtime/types';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }> };

const STORE_RESOURCES = ['store-channels', 'hosted-theme-settings', 'store-domain-bindings', 'storefront-stores', 'storefront-store', 'store-channel', 'tenant-stores'];
function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }
async function tenantIds(tenantSlugInput: string) { const baseCandidates = tenantCandidates(tenantSlugInput); const tenantSlug = clean(tenantSlugInput); try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug); const row = rows[0]; return uniq([...baseCandidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']); } catch { return uniq(baseCandidates); } }
async function storeExists(ids: string[], storeSlug: string) { for (const tenantId of ids) for (const resource of STORE_RESOURCES) { try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string }>>('SELECT "tenantId" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource=$3 LIMIT 1', tenantId, storeSlug, resource); if (rows[0]?.tenantId) return true; } catch {} } return storeSlug === 'default-store' && ids.length > 0; }
function normaliseMenuItem(raw: any, index: number): MenuItem { const label = String(raw?.label || raw?.name || raw?.title || raw?.path || `Menu ${index + 1}`); const path = String(raw?.path || raw?.href || raw?.url || '/'); return { id: String(raw?.id || raw?.slug || label), slug: clean(String(raw?.slug || label)), label, path: path.startsWith('/') ? path : `/${path}`, enabled: raw?.enabled !== false && raw?.status !== 'hidden' && raw?.status !== 'disabled', order: Number(raw?.order || raw?.sortOrder || index + 1), parentId: String(raw?.parentId || raw?.parent || raw?.parentKey || ''), parentSlug: clean(String(raw?.parentSlug || raw?.parentLabel || '')), description: String(raw?.description || raw?.featureBody || '') }; }
async function loadMenuItems(ids: string[]) { for (const tenantId of ids) { try { const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, 'admin-config', 'storefront-menu-builder'); const items = Array.isArray(rows[0]?.metadataJson?.items) ? rows[0].metadataJson.items.map(normaliseMenuItem).filter((item: MenuItem) => item.enabled && item.label && item.path).sort((a: MenuItem, b: MenuItem) => a.order - b.order) : []; if (items.length) return items; } catch {} } return DEFAULT_STOREFRONT_MENU; }

export default async function NativeStorePreview({ params }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const ids = await tenantIds(cleanTenantSlug);
  if (!cleanTenantSlug || !cleanStoreSlug || !(await storeExists(ids, cleanStoreSlug))) notFound();
  const context: StorefrontRuntimeContext = {
    tenantSlug: cleanTenantSlug,
    storeSlug: cleanStoreSlug,
    tenantIds: ids,
    storeBase: `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}`,
    routeSegments: path.map(clean).filter(Boolean),
    themeKey: 'atlantis-print-hosted',
    themeSource: 'default',
    navItems: buildNavItems(await loadMenuItems(ids)),
    products: await loadTenantThemeProducts(ids),
  };
  return renderStorefrontTheme(context);
}
