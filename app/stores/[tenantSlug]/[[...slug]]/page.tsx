import Link from 'next/link';
import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import StorefrontChrome from '@/themes/atlantis-print/StorefrontChrome';
import { buildNavItems, BRAND, cleanSlug } from '@/themes/atlantis-print/theme-nav';
import type { MenuItem } from '@/themes/atlantis-print/types';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; slug?: string[] }> };
type StoreMatch = { tenantId: string; metadataJson: Record<string, any> };

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

const PRODUCTS = [
  { title: 'Business Cards', text: 'Premium cards for teams, networking and brand launches.', image: '/theme-assets/atlantis/business-card-front.svg', path: '/business-cards/standard-business-cards', price: 'From £21.99', category: 'business-cards' },
  { title: 'Flyers & Leaflets', text: 'Handouts, menus and local marketing print.', image: '/theme-assets/atlantis/flyer-front.svg', path: '/flyers', price: 'From £18.40', category: 'flyers' },
  { title: 'Booklet Printing', text: 'Brochures, programmes, manuals and stitched print.', image: '/theme-assets/atlantis/hero-slide-2.svg', path: '/booklets', price: 'Quote ready', category: 'booklets' },
  { title: 'Posters & Large Format', text: 'Window posters, events and display graphics.', image: '/theme-assets/atlantis/poster-main.svg', path: '/posters-large-format-prints', price: 'From £8.49', category: 'posters-large-format-prints' },
  { title: 'Stationery', text: 'Letterheads, slips, NCR pads and office essentials.', image: '/theme-assets/atlantis/hero-slide-1.svg', path: '/stationery', price: 'Quote ready', category: 'stationery' },
];

function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }
function href(storeBase: string, path: string) { const next = String(path || '/').startsWith('/') ? path : `/${path}`; return next === '/' ? storeBase : `${storeBase}${next}`; }

async function tenantIds(tenantSlugInput: string) {
  const baseCandidates = tenantCandidates(tenantSlugInput);
  const tenantSlug = clean(tenantSlugInput);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug);
    const row = rows[0];
    return uniq([...baseCandidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch {
    return uniq(baseCandidates);
  }
}

async function findStore(ids: string[], storeSlug: string): Promise<StoreMatch | null> {
  for (const tenantId of ids) {
    for (const resource of STORE_RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; metadataJson: any }>>('SELECT "tenantId","metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource=$3 LIMIT 1', tenantId, storeSlug, resource);
        if (rows[0]?.tenantId) return { tenantId: rows[0].tenantId || tenantId, metadataJson: rows[0].metadataJson || {} };
      } catch {}
    }
  }
  if (storeSlug === 'default-store' && ids[0]) return { tenantId: ids[0], metadataJson: { slug: 'default-store', themeKey: 'atlantis-print-hosted' } };
  return null;
}

function normaliseMenuItem(raw: any, index: number): MenuItem {
  const label = String(raw?.label || raw?.name || raw?.title || raw?.path || `Menu ${index + 1}`);
  const path = String(raw?.path || raw?.href || raw?.url || '/');
  return { id: String(raw?.id || raw?.slug || label), slug: clean(String(raw?.slug || label)), label, path: path.startsWith('/') ? path : `/${path}`, enabled: raw?.enabled !== false && raw?.status !== 'hidden' && raw?.status !== 'disabled', order: Number(raw?.order || raw?.sortOrder || index + 1), parentId: String(raw?.parentId || raw?.parent || raw?.parentKey || ''), parentSlug: clean(String(raw?.parentSlug || raw?.parentLabel || '')), description: String(raw?.description || raw?.featureBody || '') };
}

function normaliseMenuItems(rawItems: any[]) { return rawItems.map(normaliseMenuItem).filter((item) => item.enabled && item.label && item.path).sort((a, b) => a.order - b.order); }

async function loadMenuItems(ids: string[]) {
  for (const tenantId of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, 'admin-config', 'storefront-menu-builder');
      const items = Array.isArray(rows[0]?.metadataJson?.items) ? normaliseMenuItems(rows[0].metadataJson.items) : [];
      if (items.length) return items;
    } catch {}
  }
  return DEFAULT_MENU;
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{children}</div>; }
function ProductCard({ product, storeBase }: { product: any; storeBase: string }) { return <Link href={href(storeBase, product.path)} className="group rounded-[22px] border bg-white p-4 text-left no-underline shadow-[0_16px_36px_rgba(0,0,0,0.05)] transition hover:-translate-y-[2px]" style={{ borderColor: BRAND.line, color: BRAND.ink }}><img src={product.image} alt={product.title} className="h-44 w-full rounded-[16px] object-cover" /><div className="mt-4 text-[16px] font-black tracking-[-0.03em]">{product.title}</div><p className="mt-2 min-h-[42px] text-[12px] leading-6" style={{ color: BRAND.muted }}>{product.text}</p><div className="mt-3 text-[12px] font-bold" style={{ color: BRAND.primary }}>{product.price}</div></Link>; }

function Home({ storeBase }: { storeBase: string }) { return <><section className="border-b" style={{ borderColor: BRAND.line, background: 'linear-gradient(135deg, rgba(24,167,208,0.10) 0%, rgba(123,63,228,0.06) 58%, rgba(255,200,61,0.08) 100%)' }}><Shell><div className="grid gap-10 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"><div><div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Professional print solutions</div><h1 className="mt-5 max-w-[720px] text-[46px] font-black leading-[0.94] tracking-[-0.065em] sm:text-[66px]" style={{ color: BRAND.ink }}>Design, print, sign and web support for local businesses.</h1><p className="mt-5 max-w-[620px] text-[14px] leading-7" style={{ color: BRAND.muted }}>A polished Holo Print storefront for business cards, flyers, booklets, posters, signage, stationery, artwork help and collection support.</p><div className="mt-7 flex flex-wrap gap-3"><Link href={`${storeBase}/all-products`} className="rounded-full px-5 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Browse products →</Link><Link href={`${storeBase}/bespoke-quote`} className="rounded-full border bg-white px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Request bespoke quote</Link></div><div className="mt-6 flex gap-2"><b className="h-2 w-7 rounded-full" style={{ backgroundColor: BRAND.primary }} /><i className="h-2 w-2 rounded-full bg-[#D6DFE7]" /><i className="h-2 w-2 rounded-full bg-[#D6DFE7]" /></div></div><div className="rounded-[32px] border bg-white/74 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.10)]" style={{ borderColor: 'rgba(255,255,255,0.7)' }}><img src="/theme-assets/atlantis/hero-slide-1.svg" alt="Design, print, sign and web support for local businesses." className="h-[360px] w-full rounded-[24px] object-cover" /></div></div></Shell></section><section className="py-6"><Shell><div className="grid gap-4 md:grid-cols-4">{['Excellent print checks','Fast turnaround','Business ready','Bespoke quote support'].map((title) => <div key={title} className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.04)]" style={{ borderColor: BRAND.line }}><div className="text-[15px] font-black" style={{ color: BRAND.ink }}>{title}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>Artwork, production and support guidance before print.</p></div>)}</div></Shell></section><section className="py-8"><Shell><div className="mb-6 flex items-end justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Popular products</div><h2 className="mt-2 text-[30px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>Popular print products for business, trade and events</h2></div><Link href={`${storeBase}/all-products`} className="rounded-full border bg-white px-4 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>View all products</Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{PRODUCTS.map((product) => <ProductCard key={product.title} product={product} storeBase={storeBase} />)}</div></Shell></section></>; }

function CategoryPage({ storeBase, slug }: { storeBase: string; slug: string }) { const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); const products = PRODUCTS.filter((product) => cleanSlug(product.category) === slug); return <section className="py-10"><Shell><div className="rounded-[28px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Category</div><h1 className="mt-3 text-[44px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{title}</h1><p className="mt-3 text-[14px] leading-7" style={{ color: BRAND.muted }}>Browse print products, compare options, upload artwork later or request support for bespoke jobs.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{(products.length ? products : PRODUCTS).map((product) => <ProductCard key={product.title} product={product} storeBase={storeBase} />)}</div></Shell></section>; }
function ProductPage({ slug }: { slug: string }) { const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); return <section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-10 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Product</div><h1 className="mt-4 text-3xl font-black" style={{ color: BRAND.ink }}>{title}</h1><p className="mt-3 max-w-[680px] text-sm leading-7" style={{ color: BRAND.muted }}>Configure your print product, choose options and send artwork later.</p></div></Shell></section>; }

export default async function PublicStoreRuntime({ params }: PageProps) {
  const { tenantSlug, slug = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const storeSlug = clean(slug[0] || '');
  if (!cleanTenantSlug || !storeSlug) notFound();
  const ids = await tenantIds(cleanTenantSlug);
  const store = await findStore(ids, storeSlug);
  if (!store) notFound();
  const storeBase = `/stores/${cleanTenantSlug}/${storeSlug}`;
  const menuItems = await loadMenuItems(ids);
  const navItems = buildNavItems(menuItems);
  const routeSegments = slug.slice(1).map(clean).filter(Boolean);
  const currentPath = routeSegments.length ? `/${routeSegments.join('/')}` : '/';
  const content = routeSegments.length >= 2 ? <ProductPage slug={routeSegments[routeSegments.length - 1]} /> : routeSegments.length === 1 ? <CategoryPage slug={routeSegments[0]} storeBase={storeBase} /> : <Home storeBase={storeBase} />;
  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase}>{content}</StorefrontChrome>;
}
