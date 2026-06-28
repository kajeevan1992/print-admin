import { notFound } from 'next/navigation';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getPublicHostedThemeSettings } from '@/core/themes/hosted-theme-editor.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageProps = {
  params: Promise<{ tenantSlug: string; slug?: string[] }>;
  searchParams?: Promise<{ channelSlug?: string }>;
};

type Brand = {
  logoUrl?: string;
  brandName?: string;
  primary?: string;
  accent?: string;
  background?: string;
  text?: string;
};

type Section = {
  id?: string;
  type?: string;
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  buttonLabel?: string;
  buttonHref?: string;
  productSlugs?: string[];
};

function cleanSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function titleCase(value: string) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function resolveTenantId(tenantSlug: string) {
  const slug = cleanSlug(tenantSlug);
  if (!slug) return null;

  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    slug,
  );

  return rows[0]?.id || slug;
}

function publicHref(basePath: string, href?: string) {
  const value = String(href || '').trim();
  if (!value) return `${basePath}/products`;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:') || value.startsWith('tel:')) return value;
  return `${basePath}${value.startsWith('/') ? value : `/${value}`}`;
}

function SectionBlock({ section, brand, basePath }: { section: Section; brand: Brand; basePath: string }) {
  const type = section.type || 'text-image';
  const title = section.title || (type === 'hero' ? brand.brandName || 'Print Store' : 'Section');
  const subtitle = section.subtitle || '';

  if (type === 'hero') {
    return (
      <section className="store-hero">
        <div className="store-wrap store-hero-panel">
          <p className="store-eyebrow">{section.eyebrow || brand.brandName || 'Store'}</p>
          <h1>{title}</h1>
          {subtitle ? <p className="store-lead">{subtitle}</p> : null}
          <div className="store-actions">
            <a className="store-btn" href={publicHref(basePath, section.buttonHref || '/products')}>
              {section.buttonLabel || 'Start an order'}
            </a>
            <a className="store-btn store-btn-secondary" href={`${basePath}/contact`}>
              Contact store
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (type === 'product-grid') {
    const slugs = Array.isArray(section.productSlugs) && section.productSlugs.length ? section.productSlugs : ['standard-business-cards', 'a5-leaflets'];
    return (
      <section className="store-section">
        <div className="store-wrap">
          <div className="store-section-head">
            <p className="store-eyebrow">Products</p>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="store-grid">
            {slugs.map((slug) => (
              <a className="store-card" href={`${basePath}/product/${slug}`} key={slug}>
                <span className="store-product-thumb">{titleCase(slug).slice(0, 1)}</span>
                <strong>{titleCase(slug)}</strong>
                <small>View product and start order</small>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === 'contact-cta') {
    return (
      <section className="store-section">
        <div className="store-wrap">
          <div className="store-cta">
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
            <a className="store-btn store-btn-light" href={`${basePath}/contact`}>Send enquiry</a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="store-section">
      <div className="store-wrap">
        <div className="store-panel">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
    </section>
  );
}

function ProductPage({ productSlug, basePath, brand }: { productSlug: string; basePath: string; brand: Brand }) {
  return (
    <main>
      <section className="store-section">
        <div className="store-wrap store-product-layout">
          <div className="store-product-art">{titleCase(productSlug).slice(0, 1)}</div>
          <div className="store-panel">
            <p className="store-eyebrow">Product</p>
            <h1>{titleCase(productSlug)}</h1>
            <p className="store-lead">This is the public tenant storefront product view for testing store creation, browsing and customer flow.</p>
            <div className="store-actions">
              <a className="store-btn" href={`${basePath}/checkout?product=${encodeURIComponent(productSlug)}`}>Start order</a>
              <a className="store-btn store-btn-secondary" href={`${basePath}/products`}>Back to products</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SimplePage({ title, subtitle, basePath }: { title: string; subtitle: string; basePath: string }) {
  return (
    <main>
      <section className="store-section">
        <div className="store-wrap">
          <div className="store-panel">
            <p className="store-eyebrow">Public Store</p>
            <h1>{title}</h1>
            <p className="store-lead">{subtitle}</p>
            <div className="store-actions">
              <a className="store-btn" href={`${basePath}/products`}>Browse products</a>
              <a className="store-btn store-btn-secondary" href={basePath}>Back home</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return {
    title: `${titleCase(tenantSlug)} Store`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicTenantStorePage({ params, searchParams }: PageProps) {
  const { tenantSlug, slug = [] } = await params;
  const query = searchParams ? await searchParams : {};
  const cleanTenantSlug = cleanSlug(tenantSlug);
  if (!cleanTenantSlug) notFound();

  const tenantId = await resolveTenantId(cleanTenantSlug);
  if (!tenantId) notFound();

  const channelSlug = cleanSlug(query.channelSlug || 'default-store') || 'default-store';
  const data = await getPublicHostedThemeSettings(tenantId, channelSlug);
  const brand: Brand = {
    brandName: titleCase(cleanTenantSlug),
    primary: '#18a7d0',
    accent: '#111827',
    background: '#ffffff',
    text: '#111827',
    ...(data.brand || {}),
  };
  const sections: Section[] = Array.isArray(data.sections) ? data.sections.filter((section: Section) => section.enabled !== false) : [];
  const basePath = `/stores/${cleanTenantSlug}`;
  const path = slug.join('/');

  const productGridSection = sections.find((section) => section.type === 'product-grid') || {
    type: 'product-grid',
    title: 'Popular print products',
    productSlugs: ['standard-business-cards', 'a5-leaflets'],
  };

  let content;
  if (path.startsWith('product/')) {
    content = <ProductPage productSlug={path.replace(/^product\//, '') || 'product'} basePath={basePath} brand={brand} />;
  } else if (path === 'products') {
    content = <main><SectionBlock section={productGridSection} brand={brand} basePath={basePath} /></main>;
  } else if (path === 'cart') {
    content = <SimplePage title="Cart" subtitle="Testing cart page for this tenant storefront." basePath={basePath} />;
  } else if (path === 'checkout') {
    content = <SimplePage title="Checkout" subtitle="Testing checkout entry point for this tenant storefront." basePath={basePath} />;
  } else if (path === 'contact') {
    content = <SimplePage title="Contact the store" subtitle="Testing enquiry flow for this tenant storefront." basePath={basePath} />;
  } else {
    content = <main>{sections.map((section, index) => <SectionBlock section={section} brand={brand} basePath={basePath} key={section.id || `${section.type}-${index}`} />)}</main>;
  }

  return (
    <div className="public-store" style={{ '--store-primary': brand.primary, '--store-accent': brand.accent, '--store-bg': brand.background, '--store-text': brand.text } as React.CSSProperties}>
      <header className="store-header">
        <a className="store-logo" href={basePath}>
          {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.brandName || 'Store'} /> : <span>{(brand.brandName || 'Store').slice(0, 1)}</span>}
          <strong>{brand.brandName || 'Print Store'}</strong>
        </a>
        <nav>
          <a href={basePath}>Home</a>
          <a href={`${basePath}/products`}>Products</a>
          <a href={`${basePath}/cart`}>Cart</a>
          <a href={`${basePath}/contact`}>Contact</a>
        </nav>
      </header>
      {content}
      <footer className="store-footer">
        <span>Testing public store: {cleanTenantSlug}</span>
        <span>Channel: {channelSlug}</span>
      </footer>
      <style>{`
        .public-store{min-height:100vh;background:var(--store-bg);color:var(--store-text);font-family:Inter,Arial,sans-serif}.store-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px clamp(18px,4vw,48px);background:rgba(255,255,255,.92);backdrop-filter:blur(18px);border-bottom:1px solid #e5e7eb}.store-logo{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit}.store-logo span,.store-product-thumb{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:var(--store-primary);color:#fff;font-weight:900}.store-logo img{width:46px;height:46px;object-fit:contain}.store-header nav{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.store-header nav a{color:inherit;text-decoration:none;font-weight:800;font-size:14px}.store-wrap{max-width:1180px;margin:0 auto;padding:34px 20px}.store-hero{padding:34px 0;background:linear-gradient(135deg,#f8fafc,#fff)}.store-hero-panel,.store-panel,.store-card,.store-cta{border:1px solid #e5e7eb;border-radius:30px;background:#fff;box-shadow:0 22px 55px rgba(15,23,42,.07)}.store-hero-panel,.store-panel{padding:clamp(28px,5vw,54px)}.store-eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:900;color:var(--store-primary);margin:0 0 12px}.store-hero h1,.store-panel h1{font-size:clamp(42px,7vw,78px);line-height:.95;margin:0 0 18px;letter-spacing:-.065em}.store-section h2,.store-cta h2{font-size:clamp(28px,4vw,44px);line-height:1;margin:0 0 14px;letter-spacing:-.045em}.store-lead,.store-panel p,.store-section-head p,.store-cta p{font-size:17px;line-height:1.75;opacity:.72;max-width:760px}.store-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.store-btn{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:var(--store-primary);color:#fff;text-decoration:none;font-weight:900;padding:14px 22px;border:1px solid transparent}.store-btn-secondary{background:#fff;color:var(--store-text);border-color:#d1d5db}.store-btn-light{background:#fff;color:var(--store-accent)}.store-section{padding:18px 0}.store-section-head{margin-bottom:18px}.store-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.store-card{padding:22px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:12px;transition:transform .18s ease,box-shadow .18s ease}.store-card:hover{transform:translateY(-3px);box-shadow:0 28px 64px rgba(15,23,42,.12)}.store-card strong{text-transform:capitalize;font-size:20px}.store-card small{opacity:.65;font-weight:700}.store-cta{padding:36px;background:linear-gradient(135deg,var(--store-primary),var(--store-accent));color:#fff}.store-product-layout{display:grid;grid-template-columns:minmax(240px,420px) 1fr;gap:20px;align-items:stretch}.store-product-art{min-height:360px;border-radius:30px;background:linear-gradient(135deg,var(--store-primary),var(--store-accent));display:grid;place-items:center;color:#fff;font-size:120px;font-weight:950}.store-footer{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:28px clamp(18px,4vw,48px);border-top:1px solid #e5e7eb;font-size:13px;opacity:.68}@media(max-width:760px){.store-header{align-items:flex-start;flex-direction:column}.store-product-layout{grid-template-columns:1fr}.store-product-art{min-height:220px}}
      `}</style>
    </div>
  );
}
