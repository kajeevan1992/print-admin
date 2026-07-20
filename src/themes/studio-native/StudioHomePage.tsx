import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, Quote, Sparkles } from 'lucide-react';
import StorefrontChrome from '@/themes/atlantis-native/StorefrontChrome';
import { ProductCard, Shell } from '@/themes/atlantis-native/HomePrimitives';
import { BRAND, storeHref } from '@/themes/atlantis-native/theme-helpers';
import type { ThemeCategoryCard, ThemeProductCard } from '@/themes/atlantis-native/catalog-adapter';
import type { CollectionPoint } from '@/themes/atlantis-native/collection-points';
import type { NavItem } from '@/themes/atlantis-native/types';
import type { StorefrontHomepageSection, StorefrontRuntimeSettings } from '@/theme-runtime/types';

function text(value: unknown) {
  return String(value || '').trim();
}

function list(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function selectedProducts(section: StorefrontHomepageSection, products: ThemeProductCard[]) {
  const slugs = list(section.productSlugs).map(String);
  const rows = slugs.length
    ? slugs.map((slug) => products.find((product) => product.slug === slug)).filter(Boolean) as ThemeProductCard[]
    : products.slice(0, Number(section.limit || 6));
  return rows.map((product) => ({ ...product, path: `/${product.category}/${product.slug}` }));
}

function selectedCategories(section: StorefrontHomepageSection, categories: ThemeCategoryCard[]) {
  const slugs = list(section.categorySlugs).map(String);
  return slugs.length
    ? slugs.map((slug) => categories.find((category) => category.slug === slug)).filter(Boolean) as ThemeCategoryCard[]
    : categories.slice(0, Number(section.limit || 6));
}

function StudioHeading({ section, fallbackEyebrow, fallbackTitle }: { section: StorefrontHomepageSection; fallbackEyebrow?: string; fallbackTitle?: string }) {
  const eyebrow = text(section.eyebrow) || fallbackEyebrow || '';
  const title = text(section.title) || fallbackTitle || '';
  const body = text(section.subtitle || section.body);
  return <div>{eyebrow ? <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.primary }}>{eyebrow}</div> : null}{title ? <h2 className="mt-2 text-[38px] font-black tracking-[-0.06em]" style={{ color: BRAND.ink }}>{title}</h2> : null}{body ? <p className="mt-3 max-w-[680px] text-[13px] leading-7" style={{ color: BRAND.muted }}>{body}</p> : null}</div>;
}

function StudioHero({ section, storeBase }: { section: StorefrontHomepageSection; storeBase: string }) {
  const title = text(section.title);
  const body = text(section.subtitle || section.body);
  const eyebrow = text(section.eyebrow || 'Independent print, made simple');
  const image = text(section.imageUrl || section.image);
  const buttonLabel = text(section.buttonLabel || 'Browse products');
  const buttonHref = text(section.buttonHref || '/all-products');
  return <section className="relative overflow-hidden border-b" style={{ borderColor: BRAND.line, background: '#111315' }}>
    <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 75% 25%, color-mix(in srgb, ${BRAND.primary} 55%, transparent), transparent 36%), radial-gradient(circle at 15% 85%, color-mix(in srgb, ${BRAND.accent} 40%, transparent), transparent 32%)` }} />
    <Shell className="relative py-12 lg:py-20">
      <div className={`grid gap-10 ${image ? 'lg:grid-cols-[1.05fr_0.95fr] lg:items-center' : ''}`}>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/75"><Sparkles className="h-3.5 w-3.5" />{eyebrow}</div>
          <h1 className="mt-6 max-w-[760px] text-[50px] font-black leading-[0.88] tracking-[-0.075em] text-white sm:text-[72px]">{title || 'Print that feels considered.'}</h1>
          {body ? <p className="mt-6 max-w-[620px] text-[15px] leading-8 text-white/68">{body}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={storeHref(storeBase, buttonHref)} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[12px] font-black text-black no-underline">{buttonLabel}<ArrowRight className="h-4 w-4" /></Link>
            {text(section.secondaryButtonLabel) && text(section.secondaryButtonHref) ? <Link href={storeHref(storeBase, text(section.secondaryButtonHref))} className="inline-flex items-center rounded-full border border-white/25 px-6 py-3 text-[12px] font-black text-white no-underline">{text(section.secondaryButtonLabel)}</Link> : null}
          </div>
        </div>
        {image ? <div className="relative"><div className="absolute -inset-3 rotate-2 rounded-[34px] border border-white/10 bg-white/5" /><img src={image} alt={title || 'Storefront hero'} className="relative h-[420px] w-full -rotate-1 rounded-[28px] object-cover shadow-[0_40px_100px_rgba(0,0,0,0.45)]" /></div> : null}
      </div>
    </Shell>
  </section>;
}

function StudioPromoBanner({ section, storeBase }: { section: StorefrontHomepageSection; storeBase: string }) {
  const image = text(section.imageUrl || section.image);
  const title = text(section.title);
  const body = text(section.subtitle || section.body);
  const label = text(section.buttonLabel);
  const href = text(section.buttonHref);
  if (!title && !body && !image) return null;
  return <section className="py-12"><Shell><div className="relative min-h-[360px] overflow-hidden rounded-[30px] bg-black p-8 text-white md:p-12">{image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 grayscale-[20%]" /> : null}<div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" /><div className="relative flex min-h-[264px] max-w-[720px] flex-col justify-end">{text(section.eyebrow) ? <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">{text(section.eyebrow)}</div> : null}{title ? <h2 className="mt-3 text-[46px] font-black leading-[0.92] tracking-[-0.065em]">{title}</h2> : null}{body ? <p className="mt-4 max-w-[620px] text-[13px] leading-7 text-white/68">{body}</p> : null}{label && href ? <div className="mt-6"><Link href={storeHref(storeBase, href)} className="inline-flex rounded-full bg-white px-6 py-3 text-[12px] font-black text-black no-underline">{label}</Link></div> : null}</div></div></Shell></section>;
}

function StudioSection({ section, storeBase, products, categories, collectionPoints }: { section: StorefrontHomepageSection; storeBase: string; products: ThemeProductCard[]; categories: ThemeCategoryCard[]; collectionPoints: CollectionPoint[] }) {
  if (section.enabled === false) return null;
  if (section.type === 'hero') return <StudioHero section={section} storeBase={storeBase} />;
  if (section.type === 'promo-banner') return <StudioPromoBanner section={section} storeBase={storeBase} />;

  if (section.type === 'product-grid') {
    const shown = selectedProducts(section, products);
    return <section className="py-12"><Shell><div className="mb-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><StudioHeading section={section} fallbackTitle="Featured products" />{text(section.buttonLabel) && text(section.buttonHref) ? <Link href={storeHref(storeBase, text(section.buttonHref))} className="text-[12px] font-black no-underline" style={{ color: BRAND.primary }}>{text(section.buttonLabel)} →</Link> : null}</div>{shown.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map((product) => <ProductCard key={product.slug} item={product} storeBase={storeBase} />)}</div> : <div className="rounded-[22px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published products match this section.</div>}</Shell></section>;
  }

  if (section.type === 'category-carousel') {
    const shown = selectedCategories(section, categories);
    return <section className="border-y py-12" style={{ borderColor: BRAND.line, background: 'color-mix(in srgb, var(--storefront-primary) 5%, white)' }}><Shell><div className="mb-7"><StudioHeading section={section} fallbackEyebrow="Explore" fallbackTitle="Shop by category" /></div>{shown.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{shown.map((category, index) => <Link key={category.slug} href={storeHref(storeBase, `/${category.slug}`)} className="group relative min-h-[220px] overflow-hidden rounded-[24px] border bg-black p-6 no-underline" style={{ borderColor: BRAND.line }}><img src={category.image || '/native-theme-assets/atlantis/hero-slide-2.svg'} alt={category.title} className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" /><div className="relative flex h-full flex-col justify-end"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">0{index + 1}</div><div className="mt-2 text-[26px] font-black tracking-[-0.04em] text-white">{category.title}</div><div className="mt-2 text-[12px] text-white/70">{category.productCount} products</div></div></Link>)}</div> : <div className="rounded-[22px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published categories match this section.</div>}</Shell></section>;
  }

  if (section.type === 'card-grid') {
    const cards = list(section.items).filter((item: any) => text(item?.title) || text(item?.body) || text(item?.imageUrl));
    if (!cards.length) return null;
    const columns = text(section.columns);
    const grid = columns === '2' ? 'lg:grid-cols-2' : columns === '4' ? 'lg:grid-cols-4' : 'lg:grid-cols-3';
    return <section className="py-12"><Shell><div className="mb-7"><StudioHeading section={section} fallbackTitle="Popular services" /></div><div className={`grid gap-4 sm:grid-cols-2 ${grid}`}>{cards.map((item: any, index) => { const image = text(item.imageUrl || item.image); const title = text(item.title); const body = text(item.body); const label = text(item.buttonLabel); const href = text(item.buttonHref); return <article key={`${title}-${index}`} className="group overflow-hidden rounded-[24px] border bg-white" style={{ borderColor: BRAND.line }}>{image ? <div className="overflow-hidden"><img src={image} alt={title} className="h-48 w-full object-cover grayscale-[18%] transition duration-500 group-hover:scale-105 group-hover:grayscale-0" /></div> : null}<div className="p-6">{title ? <h3 className="text-[21px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>{title}</h3> : null}{body ? <p className="mt-3 text-[12px] leading-6" style={{ color: BRAND.muted }}>{body}</p> : null}{label && href ? <Link href={storeHref(storeBase, href)} className="mt-5 inline-flex text-[12px] font-black no-underline" style={{ color: BRAND.primary }}>{label} →</Link> : null}</div></article>; })}</div></Shell></section>;
  }

  if (section.type === 'testimonials') {
    const items = list(section.items).filter((item: any) => text(item?.quote));
    if (!items.length) return null;
    return <section className="border-y bg-black py-12 text-white" style={{ borderColor: BRAND.line }}><Shell><div className="mb-8">{text(section.eyebrow) ? <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{text(section.eyebrow)}</div> : null}<h2 className="mt-2 text-[42px] font-black tracking-[-0.065em]">{text(section.title) || 'What customers say'}</h2>{text(section.body) ? <p className="mt-3 max-w-[680px] text-[13px] leading-7 text-white/55">{text(section.body)}</p> : null}</div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((item: any, index) => <figure key={`${text(item.name)}-${index}`} className="rounded-[22px] border border-white/12 bg-white/[0.04] p-6"><Quote className="h-6 w-6 text-white/40" /><blockquote className="mt-5 text-[15px] leading-8 text-white/85">“{text(item.quote)}”</blockquote><figcaption className="mt-6 flex items-center gap-3">{text(item.imageUrl) ? <img src={text(item.imageUrl)} alt="" className="h-11 w-11 rounded-full object-cover" /> : null}<div><div className="text-[12px] font-black">{text(item.name) || 'Customer'}</div>{text(item.role) ? <div className="mt-1 text-[11px] text-white/45">{text(item.role)}</div> : null}</div></figcaption></figure>)}</div></Shell></section>;
  }

  if (section.type === 'trust-badges') {
    const items = list(section.items).filter((item: any) => text(item?.title) || text(item?.body));
    if (!items.length) return null;
    return <section className="py-10"><Shell>{text(section.title) || text(section.body) ? <div className="mb-7"><StudioHeading section={section} /></div> : null}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map((item: any, index) => <div key={`${text(item.title)}-${index}`} className="rounded-[20px] border bg-white p-5" style={{ borderColor: BRAND.line }}>{text(item.imageUrl) ? <img src={text(item.imageUrl)} alt="" className="h-9 w-9 object-contain" /> : <CheckCircle2 className="h-6 w-6" style={{ color: BRAND.primary }} />}<div className="mt-4 text-[15px] font-black" style={{ color: BRAND.ink }}>{text(item.title)}</div>{text(item.body) ? <p className="mt-2 text-[11px] leading-5" style={{ color: BRAND.muted }}>{text(item.body)}</p> : null}</div>)}</div></Shell></section>;
  }

  if (section.type === 'faq') {
    const items = list(section.items).filter((item: any) => text(item?.question) && text(item?.answer));
    if (!items.length) return null;
    return <section className="py-12"><Shell><div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]"><StudioHeading section={section} fallbackEyebrow="Questions" fallbackTitle="Useful answers" /><div className="grid gap-3">{items.map((item: any, index) => <details key={`${item.question}-${index}`} className="rounded-[18px] border bg-white p-5" style={{ borderColor: BRAND.line }}><summary className="cursor-pointer text-[14px] font-black" style={{ color: BRAND.ink }}>{text(item.question)}</summary><p className="mt-3 text-[13px] leading-7" style={{ color: BRAND.muted }}>{text(item.answer)}</p></details>)}</div></div></Shell></section>;
  }

  if (section.type === 'collection-points') {
    return <section className="py-12"><Shell><div className="mb-7"><StudioHeading section={section} fallbackEyebrow="Collect locally" fallbackTitle="Collection points" /></div>{collectionPoints.length ? <div className="grid gap-4 md:grid-cols-3">{collectionPoints.map((point) => <div key={point.slug} className="rounded-[20px] border bg-white p-5" style={{ borderColor: BRAND.line }}><MapPin className="h-5 w-5" style={{ color: BRAND.primary }} /><div className="mt-4 text-[17px] font-black" style={{ color: BRAND.ink }}>{point.name}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{point.address || point.note}</p></div>)}</div> : <div className="rounded-[22px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No collection points are published for this store.</div>}</Shell></section>;
  }

  if (section.type === 'contact-cta') {
    return <section className="py-12"><Shell><div className="overflow-hidden rounded-[30px] bg-black p-8 text-white md:p-12"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">{text(section.eyebrow) || 'Custom work'}</div><div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><h2 className="text-[42px] font-black leading-[0.95] tracking-[-0.065em]">{text(section.title) || 'Need something less ordinary?'}</h2>{text(section.body) ? <p className="mt-4 max-w-[720px] text-[13px] leading-7 text-white/65">{text(section.body)}</p> : null}</div>{text(section.buttonLabel) && text(section.buttonHref) ? <Link href={storeHref(storeBase, text(section.buttonHref))} className="inline-flex rounded-full bg-white px-6 py-3 text-[12px] font-black text-black no-underline">{text(section.buttonLabel)}</Link> : null}</div></div></Shell></section>;
  }

  const image = text(section.imageUrl || section.image);
  const title = text(section.title);
  const body = text(section.subtitle || section.body);
  if (!title && !body && !image) return null;
  return <section className="py-12"><Shell><div className={`grid gap-8 ${image ? 'lg:grid-cols-2 lg:items-center' : ''}`}><div><StudioHeading section={section} />{text(section.buttonLabel) && text(section.buttonHref) ? <Link href={storeHref(storeBase, text(section.buttonHref))} className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-[12px] font-black text-white no-underline">{text(section.buttonLabel)}</Link> : null}</div>{image ? <img src={image} alt={title} className="h-[360px] w-full rounded-[24px] object-cover grayscale-[20%]" /> : null}</div></Shell></section>;
}

export default function StudioHomePage({ storeBase, navItems, settings, products = [], categories = [], collectionPoints = [] }: { storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; products?: ThemeProductCard[]; categories?: ThemeCategoryCard[]; collectionPoints?: CollectionPoint[] }) {
  const sections = settings.sections.filter((section) => section.enabled !== false);
  return <StorefrontChrome currentPath="/" navItems={navItems} storeBase={storeBase} settings={settings}>
    {sections.length ? sections.map((section) => <StudioSection key={section.id} section={section} storeBase={storeBase} products={products} categories={categories} collectionPoints={collectionPoints} />) : <section className="py-16"><Shell><div className="rounded-[24px] border bg-white p-8 text-sm leading-7" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Storefront homepage content has not been published for this store.</div></Shell></section>}
  </StorefrontChrome>;
}
