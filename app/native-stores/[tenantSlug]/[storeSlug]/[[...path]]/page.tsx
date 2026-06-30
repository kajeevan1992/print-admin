import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import EnhancedHomePage from '@/themes/atlantis-native/EnhancedHomePage';
import StorefrontChrome from '@/themes/atlantis-native/StorefrontChrome';
import { buildNavItems } from '@/themes/atlantis-native/nav-adapter';
import { BRAND, cleanSlug } from '@/themes/atlantis-native/theme-helpers';
import type { MenuItem } from '@/themes/atlantis-native/types';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; storeSlug: string; path?: string[] }> };

const STORE_RESOURCES = ['store-channels', 'hosted-theme-settings', 'store-domain-bindings', 'storefront-stores', 'storefront-store', 'store-channel', 'tenant-stores'];

const DEFAULT_MENU: MenuItem[] = [
  { id: 'same-day', slug: 'same-day-printing', label: 'Same Day Printing', path: '/same-day-printing', order: 1, parentId: '', parentSlug: '', description: 'Fast print options for urgent jobs.', enabled: true },
  { id: 'business-cards', slug: 'business-cards', label: 'Business Cards', path: '/business-cards', order: 2, parentId: '', parentSlug: '', description: 'Premium cards and finishes.', enabled: true },
  { id: 'flyers', slug: 'flyers', label: 'Flyers', path: '/flyers', order: 3, parentId: '', parentSlug: '', description: 'Leaflets and flyer printing.', enabled: true },
  { id: 'posters', slug: 'posters-large-format-prints', label: 'Posters', path: '/posters-large-format-prints', order: 4, parentId: '', parentSlug: '', description: 'Indoor and outdoor posters.', enabled: true },
  { id: 'booklets', slug: 'booklets', label: 'Booklets', path: '/booklets', order: 5, parentId: '', parentSlug: '', description: 'Stapled and bound booklets.', enabled: true },
  { id: 'stationery', slug: 'stationery', label: 'Stationery', path: '/stationery', order: 6, parentId: '', parentSlug: '', description: 'Letterheads and office print.', enabled: true },
  { id: 'signage', slug: 'signage', label: 'Signage', path: '/signage', order: 7, parentId: '', parentSlug: '', description: 'Boards, banners and signs.', enabled: true },
  { id: 'all-products', slug: 'all-products', label: 'All Products', path: '/all-products', order: 8, parentId: '', parentSlug: '', description: 'Browse every print product.', enabled: true },
  { id: 'bespoke', slug: 'bespoke-quote', label: 'Bespoke Quote', path: '/bespoke-quote', order: 9, parentId: '', parentSlug: '', description: 'Custom sizes and special jobs.', enabled: true },
];

function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }

async function tenantIds(tenantSlugInput: string) {
  const baseCandidates = tenantCandidates(tenantSlugInput);
  const tenantSlug = clean(tenantSlugInput);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug);
    const row = rows[0];
    return uniq([...baseCandidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch { return uniq(baseCandidates); }
}

async function storeExists(ids: string[], storeSlug: string) {
  for (const tenantId of ids) {
    for (const resource of STORE_RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string }>>('SELECT "tenantId" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource=$3 LIMIT 1', tenantId, storeSlug, resource);
        if (rows[0]?.tenantId) return true;
      } catch {}
    }
  }
  return storeSlug === 'default-store' && ids.length > 0;
}

function normaliseMenuItem(raw: any, index: number): MenuItem {
  const label = String(raw?.label || raw?.name || raw?.title || raw?.path || `Menu ${index + 1}`);
  const path = String(raw?.path || raw?.href || raw?.url || '/');
  return { id: String(raw?.id || raw?.slug || label), slug: clean(String(raw?.slug || label)), label, path: path.startsWith('/') ? path : `/${path}`, enabled: raw?.enabled !== false && raw?.status !== 'hidden' && raw?.status !== 'disabled', order: Number(raw?.order || raw?.sortOrder || index + 1), parentId: String(raw?.parentId || raw?.parent || raw?.parentKey || ''), parentSlug: clean(String(raw?.parentSlug || raw?.parentLabel || '')), description: String(raw?.description || raw?.featureBody || '') };
}

async function loadMenuItems(ids: string[]) {
  for (const tenantId of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, 'admin-config', 'storefront-menu-builder');
      const items = Array.isArray(rows[0]?.metadataJson?.items) ? rows[0].metadataJson.items.map(normaliseMenuItem).filter((item: MenuItem) => item.enabled && item.label && item.path).sort((a: MenuItem, b: MenuItem) => a.order - b.order) : [];
      if (items.length) return items;
    } catch {}
  }
  return DEFAULT_MENU;
}

function SimplePage({ title, storeBase, navItems, currentPath }: { title: string; storeBase: string; navItems: any[]; currentPath: string }) {
  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase}><section className="py-10"><div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8"><div className="rounded-[32px] border bg-white p-10 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Native preview</div><h1 className="mt-4 text-3xl font-black" style={{ color: BRAND.ink }}>{title}</h1><p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>This route is ready for the native category/product page port. The live customer route is unchanged.</p></div></div></section></StorefrontChrome>;
}

export default async function NativeStorePreview({ params }: PageProps) {
  const { tenantSlug, storeSlug, path = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const cleanStoreSlug = clean(storeSlug);
  const ids = await tenantIds(cleanTenantSlug);
  if (!cleanTenantSlug || !cleanStoreSlug || !(await storeExists(ids, cleanStoreSlug))) notFound();
  const storeBase = `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}`;
  const menuItems = await loadMenuItems(ids);
  const navItems = buildNavItems(menuItems);
  const routeSegments = path.map(clean).filter(Boolean);
  const currentPath = routeSegments.length ? `/${routeSegments.join('/')}` : '/';
  if (!routeSegments.length) return <EnhancedHomePage storeBase={storeBase} navItems={navItems} />;
  const title = cleanSlug(routeSegments[routeSegments.length - 1]).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <SimplePage title={title} storeBase={storeBase} navItems={navItems} currentPath={currentPath} />;
}
