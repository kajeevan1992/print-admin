import Link from 'next/link';
import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; slug?: string[] }> };
type StoreMatch = { tenantId: string; metadataJson: Record<string, any> };
type MenuItem = { id: string; slug: string; label: string; path: string; order: number; parentId: string; parentSlug: string; description: string; enabled: boolean };

const STORE_RESOURCES = ['store-channels', 'hosted-theme-settings', 'store-domain-bindings', 'storefront-stores', 'storefront-store', 'store-channel', 'tenant-stores'];

const DEFAULT_MENU: MenuItem[] = [
  { id: 'same-day', slug: 'same-day-printing', label: 'Same Day Printing', path: '/same-day-printing', order: 1, parentId: '', parentSlug: '', description: 'Fast print options for urgent jobs.', enabled: true },
  { id: 'business-cards', slug: 'business-cards', label: 'Business Cards', path: '/business-cards', order: 2, parentId: '', parentSlug: '', description: 'Premium cards and finishes.', enabled: true },
  { id: 'flyers', slug: 'flyers', label: 'Flyers', path: '/flyers', order: 3, parentId: '', parentSlug: '', description: 'Leaflets and flyer printing.', enabled: true },
  { id: 'posters', slug: 'posters', label: 'Posters', path: '/posters', order: 4, parentId: '', parentSlug: '', description: 'Indoor and outdoor posters.', enabled: true },
  { id: 'booklets', slug: 'booklets', label: 'Booklets', path: '/booklets', order: 5, parentId: '', parentSlug: '', description: 'Stapled and bound booklets.', enabled: true },
  { id: 'stationery', slug: 'stationery', label: 'Stationery', path: '/stationery', order: 6, parentId: '', parentSlug: '', description: 'Letterheads and office print.', enabled: true },
  { id: 'signage', slug: 'signage', label: 'Signage', path: '/signage', order: 7, parentId: '', parentSlug: '', description: 'Boards, banners and signs.', enabled: true },
  { id: 'all-products', slug: 'all-products', label: 'All Products', path: '/products', order: 8, parentId: '', parentSlug: '', description: 'Browse every print product.', enabled: true },
  { id: 'bespoke', slug: 'bespoke-quote', label: 'Bespoke Quote', path: '/bespoke-quote', order: 9, parentId: '', parentSlug: '', description: 'Custom sizes and special jobs.', enabled: true },
];

const PRODUCT_CATALOG = [
  { slug: 'standard-business-cards', categorySlug: 'business-cards', title: 'Standard Business Cards', intro: 'Premium business cards with simple online ordering and artwork upload.' },
  { slug: 'same-day-business-cards', categorySlug: 'same-day-printing', title: 'Same Day Business Cards', intro: 'Urgent business cards for collection when production capacity allows.' },
  { slug: 'a5-flyers', categorySlug: 'flyers', title: 'A5 Flyers', intro: 'Popular flyer size for promotions, menus and local marketing.' },
  { slug: 'a4-posters', categorySlug: 'posters', title: 'A4 Posters', intro: 'Sharp poster printing for counters, windows and events.' },
  { slug: 'booklets', categorySlug: 'booklets', title: 'Booklets', intro: 'Stapled booklets for events, schools, businesses and catalogues.' },
  { slug: 'roller-banners', categorySlug: 'signage', title: 'Roller Banners', intro: 'Portable exhibition and shop display banners.' },
];

function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }
function normalPath(value: string) { const text = String(value || '/').trim(); if (!text) return '/'; if (/^(https?:|mailto:|tel:)/i.test(text)) return text; return text.startsWith('/') ? text : `/${text}`; }
function storeHref(storeBase: string, value: string) { const path = normalPath(value); if (/^(https?:|mailto:|tel:)/i.test(path)) return path; return path === '/' ? storeBase : `${storeBase}${path}`; }

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
  return {
    id: String(raw?.id || raw?.slug || label),
    slug: clean(String(raw?.slug || label)),
    label,
    path: normalPath(String(raw?.path || raw?.href || raw?.url || '/')),
    enabled: raw?.enabled !== false && raw?.status !== 'hidden' && raw?.status !== 'disabled',
    order: Number(raw?.order || raw?.sortOrder || index + 1),
    parentId: String(raw?.parentId || raw?.parent || raw?.parentKey || ''),
    parentSlug: clean(String(raw?.parentSlug || raw?.parentLabel || '')),
    description: String(raw?.description || raw?.featureBody || ''),
  };
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
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE resource=$1 AND slug=$2 ORDER BY "updatedAt" DESC LIMIT 10', 'admin-config', 'storefront-menu-builder');
    for (const row of rows) {
      const items = Array.isArray(row?.metadataJson?.items) ? normaliseMenuItems(row.metadataJson.items) : [];
      if (items.length) return items;
    }
  } catch {}
  return DEFAULT_MENU;
}

function splitMenu(menuItems: MenuItem[]) {
  const byParent = new Map<string, MenuItem[]>();
  const top: MenuItem[] = [];
  menuItems.forEach((item) => {
    if (item.parentId || item.parentSlug) {
      [item.parentId, item.parentSlug].filter(Boolean).forEach((key) => byParent.set(String(key), [...(byParent.get(String(key)) || []), item]));
    } else {
      top.push(item);
    }
  });
  return { top: top.sort((a, b) => a.order - b.order).slice(0, 10), byParent };
}

function childrenFor(item: MenuItem, byParent: Map<string, MenuItem[]>) {
  const children = [...(byParent.get(item.id) || []), ...(byParent.get(item.slug) || []), ...(byParent.get(clean(item.label)) || [])];
  const seen = new Set<string>();
  return children.filter((child) => { const key = `${child.id}|${child.slug}|${child.label}|${child.path}`; if (seen.has(key)) return false; seen.add(key); return child.id !== item.id && clean(child.label) !== clean(item.label); });
}

function productLinksFor(item: MenuItem) {
  const categorySlug = clean(item.slug || item.path);
  return PRODUCT_CATALOG.filter((product) => product.categorySlug === categorySlug).slice(0, 6);
}

function Header({ menuItems, storeBase }: { menuItems: MenuItem[]; storeBase: string }) {
  const { top, byParent } = splitMenu(menuItems);
  return (
    <header className="holoHeader">
      <div className="topBar"><span>Professional print, same day printing, signage and packaging solutions</span><span>Business orders&nbsp;&nbsp;&nbsp; Bulk pricing&nbsp;&nbsp;&nbsp; Fast turnaround&nbsp;&nbsp;&nbsp; Bespoke quote support</span></div>
      <div className="navShell">
        <Link href={storeBase} className="logo"><span>HOLO</span>PRINT</Link>
        <nav className="mainNav" aria-label="Main navigation">
          {top.map((item) => {
            const children = childrenFor(item, byParent);
            const productLinks = children.length ? [] : productLinksFor(item);
            const hasDropdown = children.length || productLinks.length;
            return (
              <div className="navItem" key={item.id}>
                <Link href={storeHref(storeBase, item.path)}>{item.label}{hasDropdown ? <span className="chev">⌄</span> : null}</Link>
                {hasDropdown ? (
                  <div className="mega">
                    <div className="megaCard">
                      <div className="megaImage" />
                      <strong>{item.label}</strong>
                      <p>{item.description || 'Browse print products, options and support links.'}</p>
                      <Link href={storeHref(storeBase, item.path)}>View {item.label}</Link>
                    </div>
                    <div className="megaCol"><h4>{children.length ? 'Menu' : 'Products'}</h4>{children.map((child) => <Link key={child.id} href={storeHref(storeBase, child.path)}>{child.label}</Link>)}{productLinks.map((product) => <Link key={product.slug} href={`${storeBase}/${product.categorySlug}/${product.slug}`}>{product.title}</Link>)}</div>
                    <div className="megaCol"><h4>Helpful services</h4><Link href={`${storeBase}/artwork-upload`}>Artwork check</Link><Link href={`${storeBase}/bespoke-quote`}>Custom quote</Link><Link href={`${storeBase}/delivery-support`}>Delivery support</Link><Link href={`${storeBase}/contact`}>Call support</Link></div>
                    <div className="megaCol"><h4>Popular categories</h4><Link href={`${storeBase}/business-cards`}>Business Cards</Link><Link href={`${storeBase}/flyers`}>Flyers</Link><Link href={`${storeBase}/labels`}>Labels</Link><Link href={`${storeBase}/signage`}>Signage</Link></div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="actions"><button>⌖ Select store</button><button>⌕</button><button>♡</button><button>🛒 £0.00</button></div>
      </div>
    </header>
  );
}

function Home({ storeBase }: { storeBase: string }) {
  return (
    <>
      <section className="hero"><div><span className="eyebrow">Professional print solutions</span><h1>Design, print, sign and web support for local businesses.</h1><p>A polished Holo Print storefront for business cards, flyers, booklets, posters, signage, stationery, artwork help and collection support.</p><div className="cta"><Link href={`${storeBase}/products`}>Browse products →</Link><Link href={`${storeBase}/bespoke-quote`}>Request bespoke quote</Link></div><div className="dots"><b /><i /><i /></div></div><div className="heroVisual"><p>Design, print, sign and web support for local businesses.</p></div></section>
      <section className="features"><article>♢<strong>Excellent print checks</strong><p>Artwork, file and finish guidance before production.</p></article><article>▣<strong>Fast turnaround</strong><p>Express options for urgent jobs and local collections.</p></article><article>⬡<strong>Business ready</strong><p>Useful for repeat orders, bulk jobs and trade support.</p></article><article>✧<strong>Bespoke quote support</strong><p>Custom sizes, special finishes and production advice.</p></article></section>
      <section className="productGrid"><h2>Popular print products</h2><div>{PRODUCT_CATALOG.slice(0, 6).map((product) => <Link key={product.slug} href={`${storeBase}/${product.categorySlug}/${product.slug}`}><span>{product.categorySlug.replace(/-/g, ' ')}</span><strong>{product.title}</strong><p>{product.intro}</p></Link>)}</div></section>
    </>
  );
}

function CategoryPage({ slug, storeBase }: { slug: string; storeBase: string }) {
  const products = PRODUCT_CATALOG.filter((product) => product.categorySlug === slug);
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <section className="pageBlock"><span className="eyebrow">Category</span><h1>{title}</h1><p>Choose a product, upload artwork later, or ask for a bespoke quote before production.</p><div className="productCards">{(products.length ? products : PRODUCT_CATALOG.slice(0, 4)).map((product) => <Link href={`${storeBase}/${product.categorySlug}/${product.slug}`} key={product.slug}><strong>{product.title}</strong><p>{product.intro}</p><span>Order / configure →</span></Link>)}</div></section>;
}

function ProductPage({ slug }: { slug: string }) {
  const product = PRODUCT_CATALOG.find((entry) => entry.slug === slug) || { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), intro: 'Configure your print product, choose options and send artwork later.' };
  return <section className="productPage"><div><span className="eyebrow">Product</span><h1>{product.title}</h1><p>{product.intro}</p><div className="tabs"><span>Product info</span><span>Specifications</span><span>Design guidelines</span><span>FAQ&apos;s</span></div><div className="mockup"><b>{product.title}</b><p>Artwork preview area</p></div></div><aside><h3>Choose options</h3>{['Paper size', 'Finished size', 'Paper type', 'Quantity'].map((label) => <div className="option" key={label}><span>{label}</span><button>Select</button></div>)}</aside></section>;
}

function Footer({ storeBase }: { storeBase: string }) { return <footer><div><Link href={storeBase} className="logo"><span>HOLO</span>PRINT</Link><p>A full ecommerce print storefront direction with broader navigation, clean sections and a professional visual tone.</p></div><div><h4>Products</h4><Link href={`${storeBase}/business-cards`}>Business Cards</Link><Link href={`${storeBase}/flyers`}>Flyers</Link><Link href={`${storeBase}/posters`}>Posters</Link><Link href={`${storeBase}/booklets`}>Booklets</Link></div><div><h4>Business</h4><Link href={`${storeBase}/bulk-pricing`}>Bulk pricing</Link><Link href={`${storeBase}/bespoke-quote`}>Custom quotes</Link><Link href={`${storeBase}/artwork-upload`}>Artwork advice</Link></div><div><h4>Support</h4><Link href={`${storeBase}/products`}>All products</Link><Link href={`${storeBase}/cart`}>Cart</Link><Link href={`${storeBase}/contact`}>Contact</Link></div></footer>; }

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
  const pathParts = slug.slice(1).map(clean).filter(Boolean);
  const content = pathParts.length >= 2 ? <ProductPage slug={pathParts[pathParts.length - 1]} /> : pathParts.length === 1 ? <CategoryPage slug={pathParts[0]} storeBase={storeBase} /> : <Home storeBase={storeBase} />;
  return <main className="storeRuntime"><Header menuItems={menuItems} storeBase={storeBase} />{content}<Footer storeBase={storeBase} /><style>{css}</style></main>;
}

const css = `
:global(html),:global(body){margin:0;background:#f7f9fc;color:#151922;font-family:Inter,Arial,sans-serif}.storeRuntime{min-height:100vh;background:linear-gradient(120deg,#f4fbff 0%,#f9f7ff 52%,#fffdf7 100%)}.topBar{height:34px;background:#242424;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 12%;font-size:12px;font-weight:800}.navShell{height:78px;background:white;display:flex;align-items:center;gap:28px;padding:0 12%;box-shadow:0 1px 0 #e9eef5;position:sticky;top:0;z-index:40}.logo{text-decoration:none;color:#151922;font-size:32px;font-weight:1000;letter-spacing:-1px}.logo span{color:#18a7d0}.mainNav{display:flex;align-items:center;gap:6px;flex:1}.navItem>a{display:inline-flex;align-items:center;gap:5px;text-decoration:none;color:#111827;font-size:14px;font-weight:800;padding:28px 8px}.chev{font-size:12px}.actions{display:flex;gap:8px}.actions button{border:1px solid #dce5ef;background:#fff;border-radius:12px;padding:10px 14px;font-weight:900}.mega{display:none;position:absolute;left:12%;right:12%;top:102px;background:#fff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 35px 90px rgba(15,23,42,.13);padding:24px;grid-template-columns:280px repeat(3,1fr);gap:30px}.navItem:hover .mega{display:grid}.megaCard{background:#f8fbfd;border:1px solid #e2e8f0;border-radius:18px;padding:18px}.megaImage{height:110px;border-radius:14px;background:linear-gradient(135deg,#dff7fb,#fff);margin-bottom:14px}.megaCard strong{display:block;font-size:19px;margin-bottom:8px}.megaCard p{color:#64748b;line-height:1.6}.megaCard a,.megaCol a{display:block;text-decoration:none;color:#111827;font-weight:800;padding:8px 0}.megaCol h4{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#18a7d0}.hero{padding:74px 12% 82px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}.eyebrow{display:inline-flex;background:#fff;color:#18a7d0;border-radius:999px;padding:9px 15px;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:1000}.hero h1,.pageBlock h1,.productPage h1{font-size:58px;line-height:.96;letter-spacing:-3px;margin:24px 0 22px}.hero p,.pageBlock p,.productPage p{color:#64748b;line-height:1.8;font-size:16px}.cta{display:flex;gap:14px;margin:28px 0}.cta a{border-radius:999px;padding:14px 24px;text-decoration:none;font-weight:1000}.cta a:first-child{background:#18a7d0;color:white}.cta a:last-child{background:white;color:#111827}.dots b,.dots i{display:inline-block;width:11px;height:7px;background:#d9e2ed;border-radius:20px;margin-right:8px}.dots b{width:34px;background:#18a7d0}.heroVisual{min-height:350px;border:1px solid white;background:rgba(255,255,255,.45);border-radius:28px;box-shadow:0 30px 90px rgba(15,23,42,.08);padding:32px}.features{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:28px 12%;background:#f7f9fc}.features article,.productGrid a,.productCards a,.option,.mockup{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:22px;text-decoration:none;color:#111827}.features strong{display:block;margin:14px 0 8px}.features p,.productGrid p,.productCards p{color:#64748b;line-height:1.7}.productGrid,.pageBlock,.productPage{padding:64px 12%}.productGrid h2{font-size:36px}.productGrid>div,.productCards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.productGrid span{text-transform:uppercase;color:#18a7d0;letter-spacing:.12em;font-size:11px;font-weight:900}.productGrid strong,.productCards strong{display:block;font-size:20px;margin:10px 0}.productPage{display:grid;grid-template-columns:1.2fr .8fr;gap:36px}.tabs{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}.tabs span{background:white;border:1px solid #dbe5ef;border-radius:999px;padding:10px 18px;font-weight:800}.mockup{height:300px;background:linear-gradient(135deg,#e4f8fb,#fff)}aside{background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:24px;height:max-content}.option{display:flex;justify-content:space-between;align-items:center;margin:12px 0}.option button{border:1px solid #18a7d0;background:white;border-radius:12px;padding:10px 16px;color:#18a7d0;font-weight:900}footer{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:40px;padding:56px 12%;background:#f8fafc;border-top:1px solid #e2e8f0}footer a{display:block;text-decoration:none;color:#64748b;margin:10px 0}footer p{color:#64748b;line-height:1.8}@media(max-width:980px){.topBar{padding:0 20px}.navShell{padding:0 20px;overflow:auto}.hero,.productPage{grid-template-columns:1fr}.features,.productGrid>div,.productCards,footer{grid-template-columns:1fr}.mega{left:20px;right:20px;grid-template-columns:1fr}.actions{display:none}}
`;
