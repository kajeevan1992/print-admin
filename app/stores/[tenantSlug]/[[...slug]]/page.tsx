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
  { id: 'posters', slug: 'posters', label: 'Posters', path: '/posters-large-format-prints', order: 4, parentId: '', parentSlug: '', description: 'Indoor and outdoor posters.', enabled: true },
  { id: 'booklets', slug: 'booklets', label: 'Booklets', path: '/booklets', order: 5, parentId: '', parentSlug: '', description: 'Stapled and bound booklets.', enabled: true },
  { id: 'stationery', slug: 'stationery', label: 'Stationery', path: '/stationery', order: 6, parentId: '', parentSlug: '', description: 'Letterheads and office print.', enabled: true },
  { id: 'signage', slug: 'signage', label: 'Signage', path: '/signage', order: 7, parentId: '', parentSlug: '', description: 'Boards, banners and signs.', enabled: true },
  { id: 'all-products', slug: 'all-products', label: 'All Products', path: '/all-products', order: 8, parentId: '', parentSlug: '', description: 'Browse every print product.', enabled: true },
  { id: 'bespoke', slug: 'bespoke-quote', label: 'Bespoke Quote', path: '/bespoke-quote', order: 9, parentId: '', parentSlug: '', description: 'Custom sizes and special jobs.', enabled: true },
];

const PRODUCT_CATALOG = [
  { slug: 'standard-business-cards', categorySlug: 'business-cards', title: 'Standard Business Cards', intro: 'Premium business cards with simple online ordering and artwork upload.', price: 'From £21.99' },
  { slug: 'same-day-business-cards', categorySlug: 'same-day-printing', title: 'Same Day Business Cards', intro: 'Urgent business cards for collection when production capacity allows.', price: 'Same day' },
  { slug: 'a5-flyers', categorySlug: 'flyers', title: 'A5 Flyers', intro: 'Popular flyer size for promotions, menus and local marketing.', price: 'From £18.40' },
  { slug: 'a4-posters', categorySlug: 'posters-large-format-prints', title: 'A4 Posters', intro: 'Sharp poster printing for counters, windows and events.', price: 'From £8.49' },
  { slug: 'booklets', categorySlug: 'booklets', title: 'Booklets', intro: 'Stapled booklets for events, schools, businesses and catalogues.', price: 'Quote ready' },
  { slug: 'roller-banners', categorySlug: 'signage', title: 'Roller Banners', intro: 'Portable exhibition and shop display banners.', price: 'Quote ready' },
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
    <header className="chromeHeader">
      <div className="utilityBar"><div className="shell utilityInner"><span>Professional print, same day printing, signage and packaging solutions</span><span>Business orders&nbsp;&nbsp;&nbsp; Bulk pricing&nbsp;&nbsp;&nbsp; Fast turnaround&nbsp;&nbsp;&nbsp; Bespoke quote support</span></div></div>
      <div className="mainHeader"><div className="shell navShell">
        <Link href={storeBase} className="brand"><span>HOLO</span>PRINT</Link>
        <nav className="mainNav" aria-label="Main navigation">
          {top.map((item) => {
            const children = childrenFor(item, byParent);
            const productLinks = children.length ? [] : productLinksFor(item);
            const hasDropdown = children.length || productLinks.length;
            return (
              <div className="navItem" key={item.id}>
                <Link href={storeHref(storeBase, item.path)}>{item.label}{hasDropdown ? <span className="chev">⌄</span> : null}</Link>
                {hasDropdown ? (
                  <div className="megaPanel">
                    <div className="megaInner">
                      <div className="megaFeature"><div className="fakeImage"><span>{item.label}</span></div><h3>{item.label}</h3><p>{item.description || 'Browse print products, options and support links.'}</p><Link href={storeHref(storeBase, item.path)}>View {item.label}</Link></div>
                      <div className="megaCol"><h4>{children.length ? 'Menu' : 'Products'}</h4>{children.map((child) => <Link key={child.id} href={storeHref(storeBase, child.path)}>{child.label}</Link>)}{productLinks.map((product) => <Link key={product.slug} href={`${storeBase}/${product.categorySlug}/${product.slug}`}>{product.title}</Link>)}</div>
                      <div className="megaCol"><h4>Helpful services</h4><Link href={`${storeBase}/artwork-upload`}>Artwork Check</Link><Link href={`${storeBase}/bespoke-quote`}>Priority Quote</Link><Link href={`${storeBase}/checkout`}>Express Delivery</Link><Link href={`${storeBase}/bespoke-quote`}>Call Support</Link></div>
                      <div className="megaCol"><h4>Popular categories</h4><Link href={`${storeBase}/business-cards`}>Business Cards</Link><Link href={`${storeBase}/flyers`}>Flyers</Link><Link href={`${storeBase}/all-products`}>Labels</Link><Link href={`${storeBase}/signage`}>Signage</Link></div>
                    </div>
                    <div className="megaChips"><span>Fast turnaround</span><span>Premium stock</span><span>Bulk pricing</span><span>Artwork support</span></div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="headerActions"><button>⌖ <span>Select store</span></button><button>⌕</button><button>♡</button><button>🛒 £0.00</button></div>
      </div></div>
    </header>
  );
}

function Home({ storeBase }: { storeBase: string }) {
  return (
    <>
      <section className="hero"><div className="shell heroGrid"><div><span className="pill">Professional print solutions</span><h1>Design, print, sign and web support for local businesses.</h1><p>A polished Holo Print storefront for business cards, flyers, booklets, posters, signage, stationery, artwork help and collection support.</p><div className="cta"><Link href={`${storeBase}/all-products`}>Browse products →</Link><Link href={`${storeBase}/bespoke-quote`}>Request bespoke quote</Link></div><div className="dots"><b /><i /><i /></div></div><div className="heroCard"><div className="heroArt"><span>Design, print, sign and web support for local businesses.</span></div></div></div></section>
      <section className="features"><div className="shell featureGrid"><article>♢<strong>Excellent print checks</strong><p>Artwork, file and finish guidance before production.</p></article><article>▣<strong>Fast turnaround</strong><p>Express options for urgent jobs and local collections.</p></article><article>⬡<strong>Business ready</strong><p>Useful for repeat orders, bulk jobs and trade support.</p></article><article>✧<strong>Bespoke quote support</strong><p>Custom sizes, special finishes and production advice.</p></article></div></section>
      <section className="productGrid shell"><div className="sectionHead"><span>Popular products</span><h2>Popular print products for business, trade and events</h2><Link href={`${storeBase}/all-products`}>View all products</Link></div><div className="productCardsGrid">{PRODUCT_CATALOG.slice(0, 6).map((product) => <Link className="productCard" key={product.slug} href={`${storeBase}/${product.categorySlug}/${product.slug}`}><div className="productImage"><span>{product.title}</span></div><strong>{product.title}</strong><p>{product.intro}</p><em>{product.price}</em></Link>)}</div></section>
    </>
  );
}

function CategoryPage({ slug, storeBase }: { slug: string; storeBase: string }) {
  const products = PRODUCT_CATALOG.filter((product) => product.categorySlug === slug);
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <section className="pageBlock shell"><span className="pill">Category</span><h1>{title}</h1><p>Choose a product, upload artwork later, or ask for a bespoke quote before production.</p><div className="productCardsGrid">{(products.length ? products : PRODUCT_CATALOG.slice(0, 4)).map((product) => <Link className="productCard" href={`${storeBase}/${product.categorySlug}/${product.slug}`} key={product.slug}><div className="productImage"><span>{product.title}</span></div><strong>{product.title}</strong><p>{product.intro}</p><em>Order / configure →</em></Link>)}</div></section>;
}

function ProductPage({ slug }: { slug: string }) {
  const product = PRODUCT_CATALOG.find((entry) => entry.slug === slug) || { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), intro: 'Configure your print product, choose options and send artwork later.', price: 'Quote ready' };
  return <section className="productPage shell"><div><span className="pill">Product</span><h1>{product.title}</h1><p>{product.intro}</p><div className="tabs"><span>Product info</span><span>Specifications</span><span>Design guidelines</span><span>FAQ&apos;s</span></div><div className="mockup"><b>{product.title}</b><p>Artwork preview area</p></div></div><aside><h3>Choose options</h3>{['Paper size', 'Finished size', 'Paper type', 'Quantity'].map((label) => <div className="option" key={label}><span>{label}</span><button>Select</button></div>)}</aside></section>;
}

function Footer({ storeBase }: { storeBase: string }) { return <footer className="footer"><div className="subscribe"><div className="shell subscribeInner"><span>Get the very best print solutions for your business, events and brand campaigns — with room to grow into a full admin-connected storefront.</span><div><input placeholder="Email address" /><button>Subscribe</button></div></div></div><div className="shell footerStats"><span><b>20+</b>Business printing</span><span><b>12+</b>Event signage</span><span><b>18+</b>Labels & packaging</span><span><b>1:1</b>Custom quote support</span></div><div className="shell footerMain"><div><Link href={storeBase} className="brand footerBrand"><span>HOLO</span>PRINT</Link><p>A fuller ecommerce print storefront direction with broader navigation, denser sections and a cleaner visual tone.</p></div><div><h4>Products</h4><Link href={`${storeBase}/business-cards`}>Business Cards</Link><Link href={`${storeBase}/flyers`}>Flyers</Link><Link href={`${storeBase}/posters-large-format-prints`}>Posters</Link><Link href={`${storeBase}/booklets`}>Booklets</Link></div><div><h4>Business</h4><Link href={`${storeBase}/bespoke-quote`}>Bulk pricing</Link><Link href={`${storeBase}/bespoke-quote`}>Custom quotes</Link><Link href={`${storeBase}/artwork-upload`}>Artwork advice</Link></div><div><h4>Support</h4><Link href={`${storeBase}/all-products`}>All products</Link><Link href={`${storeBase}/cart`}>Cart</Link><Link href={`${storeBase}/contact`}>Contact</Link></div></div></footer>; }

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
html,body{margin:0;background:#f7f8fc;color:#161a22;font-family:Inter,Arial,sans-serif}.storeRuntime{min-height:100vh;background:#f7f8fc;color:#161a22}.shell{max-width:1360px;margin:0 auto;padding-left:24px;padding-right:24px}.utilityBar{background:#0f1012;color:white}.utilityInner{height:32px;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700}.mainHeader{background:rgba(255,255,255,.96);border-bottom:1px solid #e3e8f0;position:sticky;top:0;z-index:50;backdrop-filter:blur(10px)}.navShell{height:74px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:26px;position:relative}.brand{text-decoration:none;display:inline-flex;align-items:center;font-size:42px;font-weight:1000;letter-spacing:-.055em;color:#161a22;white-space:nowrap}.brand span{color:#18a7d0}.mainNav{display:flex;align-items:center;justify-content:center;gap:16px;min-width:0}.navItem{height:74px;display:flex;align-items:center}.navItem>a{display:inline-flex;align-items:center;gap:5px;text-decoration:none;color:#161a22;font-size:13px;font-weight:800;letter-spacing:-.01em;white-space:nowrap}.navItem:hover>a{color:#18a7d0}.chev{font-size:12px}.headerActions{display:flex;align-items:center;gap:8px}.headerActions button{height:38px;border:1px solid #e3e8f0;background:#fff;border-radius:13px;padding:0 13px;font-size:12px;font-weight:800;color:#667487}.megaPanel{display:none;position:absolute;left:24px;right:24px;top:78px;background:#fff;border:1px solid #e3e8f0;border-radius:22px;box-shadow:0 34px 100px rgba(0,0,0,.13);padding:20px;z-index:70}.navItem:hover .megaPanel{display:block}.megaInner{display:grid;grid-template-columns:270px 1fr 1fr 1fr;gap:24px}.megaFeature{border:1px solid #e3e8f0;border-radius:20px;padding:16px;background:linear-gradient(180deg,#fbfdfe 0%,#f4f9fb 100%)}.fakeImage{height:144px;border-radius:13px;background:linear-gradient(135deg,#e1f6fb,#fff);display:flex;align-items:flex-end;padding:14px;color:#667487;font-size:12px}.megaFeature h3{margin:16px 0 8px;font-size:18px;letter-spacing:-.03em}.megaFeature p{margin:0;color:#667487;font-size:12px;line-height:1.8}.megaFeature a{display:inline-block;margin-top:14px;color:#18a7d0;text-decoration:none;font-size:12px;font-weight:900}.megaCol h4{margin:0 0 10px;color:#18a7d0;font-size:10px;text-transform:uppercase;letter-spacing:.18em}.megaCol a{display:block;text-decoration:none;color:#161a22;font-size:12px;font-weight:650;border-radius:12px;padding:8px 10px}.megaCol a:hover{background:#f6f7f8}.megaChips{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-top:1px solid #e3e8f0;margin-top:18px;padding-top:16px}.megaChips span{border:1px solid #e3e8f0;border-radius:16px;background:linear-gradient(180deg,#fff 0%,#f8fbfc 100%);padding:12px 16px;color:#667487;font-size:11px;font-weight:800}.hero{border-bottom:1px solid #e3e8f0;background:linear-gradient(135deg,rgba(24,167,208,.10) 0%,rgba(123,63,228,.06) 58%,rgba(255,200,61,.08) 100%)}.heroGrid{display:grid;grid-template-columns:.95fr 1.05fr;align-items:center;gap:72px;padding-top:56px;padding-bottom:64px}.pill{display:inline-flex;border-radius:999px;background:rgba(255,255,255,.82);padding:10px 16px;color:#18a7d0;text-transform:uppercase;letter-spacing:.18em;font-size:10px;font-weight:1000}.hero h1,.pageBlock h1,.productPage h1{max-width:720px;margin:22px 0 20px;color:#161a22;font-size:64px;line-height:.94;letter-spacing:-.065em;font-weight:1000}.hero p,.pageBlock p,.productPage p{max-width:620px;color:#667487;font-size:14px;line-height:1.9}.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.cta a{display:inline-flex;align-items:center;border-radius:999px;padding:13px 21px;text-decoration:none;font-size:12px;font-weight:1000}.cta a:first-child{background:#18a7d0;color:#fff;box-shadow:0 12px 28px rgba(24,167,208,.24)}.cta a:last-child{background:#fff;color:#161a22;border:1px solid #e3e8f0}.dots{display:flex;gap:8px;margin-top:24px}.dots b,.dots i{height:8px;border-radius:99px;background:#d6dfe7}.dots b{width:28px;background:#18a7d0}.dots i{width:8px}.heroCard{border:1px solid rgba(255,255,255,.7);border-radius:32px;background:rgba(255,255,255,.74);padding:16px;box-shadow:0 30px 90px rgba(0,0,0,.10);backdrop-filter:blur(8px)}.heroArt{height:360px;border-radius:24px;background:linear-gradient(135deg,#effbfe 0%,#fff 44%,#eef5ff 100%);border:1px solid #e3e8f0;padding:28px;color:#667487}.features{padding:24px 0}.featureGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.featureGrid article{border:1px solid #e3e8f0;background:#fff;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgba(0,0,0,.04);color:#18a7d0}.featureGrid strong{display:block;margin:14px 0 8px;color:#161a22;font-size:15px}.featureGrid p{margin:0;color:#667487;font-size:12px;line-height:1.8}.productGrid,.pageBlock,.productPage{padding-top:48px;padding-bottom:58px}.sectionHead{display:flex;align-items:end;justify-content:space-between;gap:22px;margin-bottom:24px}.sectionHead span{display:block;color:#18a7d0;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.18em}.sectionHead h2{max-width:760px;margin:8px 0 0;font-size:30px;line-height:1.02;letter-spacing:-.045em}.sectionHead a{border:1px solid #e3e8f0;background:#fff;border-radius:999px;padding:12px 18px;text-decoration:none;color:#161a22;font-size:12px;font-weight:900}.productCardsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.productCard{display:block;border:1px solid #e3e8f0;border-radius:22px;background:#fff;padding:16px;text-decoration:none;color:#161a22;box-shadow:0 16px 36px rgba(0,0,0,.05);transition:.2s}.productCard:hover{transform:translateY(-2px);box-shadow:0 22px 50px rgba(0,0,0,.08)}.productImage{height:170px;border-radius:16px;background:linear-gradient(135deg,#f4f7fa 0%,#e6f8fc 100%);display:flex;align-items:end;padding:14px;color:#667487;font-size:12px}.productCard strong{display:block;margin-top:16px;font-size:17px;letter-spacing:-.03em}.productCard p{min-height:48px;color:#667487;font-size:12px;line-height:1.8}.productCard em{font-style:normal;color:#18a7d0;font-size:12px;font-weight:1000}.productPage{display:grid;grid-template-columns:1.15fr .85fr;gap:36px}.tabs{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}.tabs span{border:1px solid #e3e8f0;background:#fff;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:900}.mockup{height:330px;border:1px solid #e3e8f0;border-radius:24px;background:linear-gradient(135deg,#eefbfe,#fff);padding:28px}.mockup b{font-size:28px}.productPage aside{border:1px solid #e3e8f0;border-radius:24px;background:#fff;padding:24px;box-shadow:0 16px 36px rgba(0,0,0,.05);height:max-content}.option{display:flex;align-items:center;justify-content:space-between;border:1px solid #e3e8f0;border-radius:18px;padding:14px;margin-top:12px}.option button{border:1px solid #18a7d0;background:#fff;color:#18a7d0;border-radius:12px;padding:8px 12px;font-weight:900}.footer{border-top:1px solid #e3e8f0;background:#fff}.subscribe{background:#18a7d0;color:#fff}.subscribeInner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:14px;padding-bottom:14px;font-size:12px;font-weight:800}.subscribe input{height:38px;border:0;border-radius:999px;padding:0 16px}.subscribe button{height:38px;border:0;border-radius:999px;background:#0f1012;color:#fff;padding:0 18px;font-weight:900}.footerStats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding-top:20px;padding-bottom:20px}.footerStats span{border:1px solid #e3e8f0;border-radius:18px;background:linear-gradient(180deg,#fff,#f8fbfc);padding:14px;color:#667487;font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:900}.footerStats b{display:block;color:#161a22;font-size:16px;letter-spacing:0;margin-top:4px}.footerMain{display:grid;grid-template-columns:1.25fr .8fr .8fr .8fr;gap:42px;padding-top:40px;padding-bottom:46px}.footerBrand{font-size:48px}.footer p{max-width:360px;color:#667487;font-size:12px;line-height:2}.footer h4{font-size:12px;text-transform:uppercase;letter-spacing:.16em}.footer a{display:block;text-decoration:none;color:#667487;font-size:12px;margin:10px 0}@media(max-width:1120px){.mainNav{justify-content:flex-start;overflow:auto}.headerActions span{display:none}.megaPanel{left:0;right:0}.heroGrid,.productPage{grid-template-columns:1fr}.featureGrid,.productCardsGrid,.footerStats,.footerMain{grid-template-columns:1fr 1fr}.hero h1,.pageBlock h1,.productPage h1{font-size:48px}}@media(max-width:760px){.utilityInner span:last-child,.headerActions{display:none}.shell{padding-left:16px;padding-right:16px}.navShell{grid-template-columns:auto 1fr}.brand{font-size:34px}.mainNav{gap:14px}.featureGrid,.productCardsGrid,.footerStats,.footerMain{grid-template-columns:1fr}.megaPanel{display:none!important}.heroGrid{padding-top:38px;padding-bottom:48px}.hero h1,.pageBlock h1,.productPage h1{font-size:42px}.heroArt{height:240px}.subscribeInner{flex-direction:column;align-items:flex-start}}
`;
