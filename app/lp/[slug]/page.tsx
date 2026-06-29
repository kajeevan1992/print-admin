import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  resolveCustomerLandingPage,
  splitLandingPageLines,
  splitLandingPagePairs,
  type CustomerLandingPage,
} from '@/modules/landing-pages/customer-landing-page-store';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadPage(params: PageProps['params'], searchParams?: PageProps['searchParams']) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const tenantId = firstParam(query.tenantId) || firstParam(query.tenant) || process.env.DEFAULT_TENANT_ID || 'platform-demo';
  const includeDrafts = firstParam(query.preview) === '1' || firstParam(query.includeDrafts) === '1';
  return resolveCustomerLandingPage({ tenantId }, slug, { includeDrafts });
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const page = await loadPage(params, searchParams);
  if (!page) return { title: 'Landing page not found | Print Admin' };
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription,
  };
}

function ButtonLink({ href, children, primary, color }: { href: string; children: React.ReactNode; primary?: boolean; color: string }) {
  return (
    <a
      href={href || '#'}
      className={primary ? 'cta cta-primary' : 'cta cta-secondary'}
      style={primary ? { background: color, borderColor: color } : undefined}
    >
      {children}
    </a>
  );
}

function PageRenderer({ page }: { page: CustomerLandingPage }) {
  const categories = splitLandingPageLines(page.productCategoriesText);
  const features = splitLandingPagePairs(page.featureCardsText);
  const workflow = splitLandingPageLines(page.workflowStepsText);
  const badges = splitLandingPageLines(page.trustBadgesText);
  const industries = splitLandingPageLines(page.industriesText);
  const faqs = splitLandingPagePairs(page.faqText);
  const color = page.brandColor || '#18a7d0';

  return (
    <main className="landing-page-public" style={{ ['--accent' as string]: color }}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={page.tenantDisplayName}>
          <span className="brand-mark" style={{ background: color }}>{page.tenantDisplayName.slice(0, 1).toUpperCase()}</span>
          <span>{page.tenantDisplayName}</span>
        </a>
        <nav>
          <a href="#products">Products</a>
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="header-cta" href={page.primaryCtaUrl || '#'} style={{ color }}>Order now</a>
      </header>

      <section id="top" className="hero">
        <div>
          <p className="kicker" style={{ color }}>{page.heroKicker}</p>
          <h1>{page.heroHeadline}</h1>
          <p className="hero-copy">{page.heroSubheading}</p>
          <div className="hero-actions">
            <ButtonLink href={page.primaryCtaUrl} primary color={color}>{page.primaryCtaLabel}</ButtonLink>
            <ButtonLink href={page.secondaryCtaUrl} color={color}>{page.secondaryCtaLabel}</ButtonLink>
          </div>
          <div className="badges">
            {badges.map((badge) => <span key={badge}>{badge}</span>)}
          </div>
        </div>

        <aside className="hero-card">
          <div className="hero-card-top" style={{ background: `linear-gradient(135deg, ${color}, #0f172a)` }}>
            <p>Online storefront</p>
            <strong>Instant quote → artwork upload → checkout</strong>
          </div>
          <div className="quote-card">
            <div><span>Product</span><strong>Business Cards</strong></div>
            <div><span>Material</span><strong>350gsm Silk</strong></div>
            <div><span>Turnaround</span><strong>Same / Next Day</strong></div>
            <div><span>Status</span><strong>Ready to order</strong></div>
          </div>
        </aside>
      </section>

      <section id="products" className="section">
        <p className="section-kicker">Popular print products</p>
        <h2>Everything customers need to start an order quickly.</h2>
        <div className="product-grid">
          {categories.map((category) => <article key={category}><span style={{ background: color }} />{category}</article>)}
        </div>
      </section>

      <section id="platform" className="section panel-section">
        <div>
          <p className="section-kicker">Customer portal</p>
          <h2>A landing page that connects sales, artwork and production.</h2>
          <p className="muted">Use it as a customer homepage, campaign page, B2B partner portal intro, product collection page or local print service page.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article key={`${feature.title}-${feature.body}`}>
              <h3>{feature.title}</h3>
              <p>{feature.body || 'Configure this block from the landing-page builder.'}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="section">
        <p className="section-kicker">How customers order</p>
        <h2>Simple steps from enquiry to production.</h2>
        <div className="steps">
          {workflow.map((step, index) => (
            <article key={step}>
              <span style={{ borderColor: color, color }}>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section industries">
        <p className="section-kicker">Built for</p>
        <h2>Make the page speak to the customer segment you want.</h2>
        <div>
          {industries.map((industry) => <span key={industry}>{industry}</span>)}
        </div>
      </section>

      <section id="faq" className="section faq">
        <p className="section-kicker">Questions</p>
        <h2>Useful answers before they place an order.</h2>
        <div>
          {faqs.map((faq) => (
            <details key={`${faq.title}-${faq.body}`}>
              <summary>{faq.title}</summary>
              <p>{faq.body}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta" style={{ background: color }}>
        <p>{page.tenantDisplayName}</p>
        <h2>{page.primaryCtaLabel || 'Start your print order today'}</h2>
        <a href={page.primaryCtaUrl || '#'}>Continue</a>
      </section>

      <footer>
        <span>{page.tenantDisplayName}</span>
        <span>Powered by Print Admin</span>
      </footer>

      <style>{`
        html, body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        a { color: inherit; text-decoration: none; }
        .landing-page-public { min-height: 100vh; overflow-x: hidden; }
        .site-header { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 18px clamp(20px, 5vw, 72px); background: rgba(255,255,255,.88); border-bottom: 1px solid rgba(15,23,42,.08); backdrop-filter: blur(18px); }
        .brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 900; letter-spacing: -.03em; }
        .brand-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 15px; color: #fff; box-shadow: 0 14px 30px rgba(15,23,42,.12); }
        nav { display: flex; align-items: center; gap: 20px; font-size: 14px; color: #475569; }
        .header-cta { font-weight: 800; }
        .hero { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(320px, .88fr); gap: clamp(28px, 5vw, 70px); align-items: center; padding: clamp(54px, 8vw, 108px) clamp(20px, 5vw, 72px); background: radial-gradient(circle at top left, rgba(24,167,208,.16), transparent 32%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
        .kicker, .section-kicker { margin: 0 0 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .18em; }
        h1 { max-width: 900px; margin: 0; font-size: clamp(46px, 8vw, 92px); line-height: .92; letter-spacing: -.08em; }
        h2 { margin: 0; max-width: 780px; font-size: clamp(30px, 4.6vw, 58px); line-height: 1; letter-spacing: -.06em; }
        h3 { margin: 0; font-size: 19px; letter-spacing: -.03em; }
        .hero-copy, .muted { max-width: 720px; color: #64748b; font-size: 18px; line-height: 1.75; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .cta { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 999px; border: 1px solid rgba(15,23,42,.14); padding: 0 22px; font-weight: 900; }
        .cta-primary { color: #fff; box-shadow: 0 18px 40px rgba(15,23,42,.16); }
        .cta-secondary { background: #fff; color: #0f172a; }
        .badges { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
        .badges span, .industries span { display: inline-flex; border-radius: 999px; border: 1px solid rgba(15,23,42,.1); background: #fff; padding: 9px 13px; color: #475569; font-size: 13px; font-weight: 800; }
        .hero-card { overflow: hidden; border: 1px solid rgba(15,23,42,.08); border-radius: 34px; background: #fff; box-shadow: 0 28px 80px rgba(15,23,42,.14); }
        .hero-card-top { padding: 28px; color: #fff; }
        .hero-card-top p { margin: 0 0 12px; text-transform: uppercase; letter-spacing: .16em; font-size: 12px; opacity: .8; }
        .hero-card-top strong { display: block; max-width: 420px; font-size: 30px; line-height: 1.05; letter-spacing: -.05em; }
        .quote-card { display: grid; gap: 12px; padding: 22px; }
        .quote-card div { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-radius: 18px; background: #f8fafc; padding: 16px; }
        .quote-card span { color: #64748b; font-size: 13px; }
        .quote-card strong { font-size: 14px; }
        .section { padding: clamp(50px, 7vw, 86px) clamp(20px, 5vw, 72px); }
        .product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
        .product-grid article { display: flex; align-items: center; gap: 12px; min-height: 78px; border: 1px solid rgba(15,23,42,.08); border-radius: 22px; background: #fff; padding: 18px; font-weight: 900; box-shadow: 0 14px 30px rgba(15,23,42,.05); }
        .product-grid span { width: 10px; height: 10px; border-radius: 999px; }
        .panel-section { display: grid; grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr); gap: 28px; background: #0f172a; color: #fff; }
        .panel-section .muted { color: #cbd5e1; }
        .feature-grid { display: grid; gap: 14px; }
        .feature-grid article { border: 1px solid rgba(255,255,255,.1); border-radius: 24px; background: rgba(255,255,255,.06); padding: 22px; }
        .feature-grid p, .faq p { color: #64748b; line-height: 1.7; }
        .feature-grid p { color: #cbd5e1; }
        .steps { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
        .steps article { border: 1px solid rgba(15,23,42,.08); border-radius: 24px; background: #fff; padding: 18px; }
        .steps span { display: grid; place-items: center; width: 42px; height: 42px; margin-bottom: 22px; border: 1px solid; border-radius: 999px; font-size: 12px; font-weight: 900; }
        .steps strong { display: block; line-height: 1.35; }
        .industries div { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
        .faq > div { display: grid; gap: 12px; margin-top: 24px; }
        details { border: 1px solid rgba(15,23,42,.08); border-radius: 20px; background: #fff; padding: 18px 20px; }
        summary { cursor: pointer; font-weight: 900; }
        .final-cta { margin: clamp(20px, 5vw, 72px); border-radius: 34px; padding: clamp(36px, 6vw, 76px); color: #fff; text-align: center; }
        .final-cta p { margin: 0 0 10px; text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 900; opacity: .8; }
        .final-cta h2 { max-width: none; margin: 0 auto 24px; }
        .final-cta a { display: inline-flex; min-height: 48px; align-items: center; border-radius: 999px; background: #fff; padding: 0 22px; color: #0f172a; font-weight: 900; }
        footer { display: flex; justify-content: space-between; gap: 20px; padding: 30px clamp(20px, 5vw, 72px); color: #64748b; font-size: 14px; }
        @media (max-width: 920px) {
          .site-header nav { display: none; }
          .hero, .panel-section { grid-template-columns: 1fr; }
          .product-grid, .steps { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 620px) {
          .site-header { align-items: flex-start; }
          .header-cta { display: none; }
          .product-grid, .steps { grid-template-columns: 1fr; }
          footer { flex-direction: column; }
        }
      `}</style>
    </main>
  );
}

export default async function PublicCustomerLandingPage({ params, searchParams }: PageProps) {
  const page = await loadPage(params, searchParams);
  if (!page) notFound();
  return <PageRenderer page={page} />;
}
