import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import StorefrontChrome from './StorefrontChrome';
import type { ThemeCategoryCard, ThemeProductCard } from './catalog-adapter';
import type { CollectionPoint } from './collection-points';
import { BRAND, storeHref } from './theme-helpers';
import { PrimaryButton, ProductCard, SecondaryButton, SectionHeading, Shell } from './HomePrimitives';
import type { NavItem } from './types';
import type { StorefrontHomepageSection, StorefrontRuntimeSettings } from '@/theme-runtime/types';

function text(value: unknown) {
  return String(value || '').trim();
}

function list(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function productsFor(section: StorefrontHomepageSection, products: ThemeProductCard[]) {
  const slugs = list(section.productSlugs).map(String);
  const selected = slugs.length ? slugs.map((slug) => products.find((product) => product.slug === slug)).filter(Boolean) as ThemeProductCard[] : products.slice(0, Number(section.limit || 5));
  return selected.map((item) => ({ ...item, path: `/${item.category}/${item.slug}` }));
}

function categoriesFor(section: StorefrontHomepageSection, categories: ThemeCategoryCard[]) {
  const slugs = list(section.categorySlugs).map(String);
  return slugs.length ? slugs.map((slug) => categories.find((category) => category.slug === slug)).filter(Boolean) as ThemeCategoryCard[] : categories.slice(0, Number(section.limit || 6));
}

function HostedHero({ section, storeBase }: { section: StorefrontHomepageSection; storeBase: string }) {
  const title = text(section.title);
  const subtitle = text(section.subtitle || section.body);
  const eyebrow = text(section.eyebrow);
  const buttonLabel = text(section.buttonLabel);
  const buttonPath = text(section.buttonHref);
  const secondLabel = text(section.secondaryButtonLabel);
  const secondPath = text(section.secondaryButtonHref);
  const image = text(section.imageUrl || section.image);
  if (!title && !subtitle && !image) return null;
  return <section className="relative overflow-hidden border-b" style={{ borderColor: BRAND.line, background: 'linear-gradient(135deg, color-mix(in srgb, var(--storefront-primary) 12%, white) 0%, color-mix(in srgb, var(--storefront-accent) 7%, white) 58%, white 100%)' }}><Shell className="py-10 lg:py-16"><div className={`grid gap-10 ${image ? 'lg:grid-cols-[0.95fr_1.05fr] lg:items-center' : ''}`}><div>{eyebrow ? <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{eyebrow}</div> : null}{title ? <h1 className="mt-5 max-w-[720px] text-[46px] font-black leading-[0.94] tracking-[-0.065em] sm:text-[66px]" style={{ color: BRAND.ink }}>{title}</h1> : null}{subtitle ? <p className="mt-5 max-w-[620px] text-[14px] leading-7" style={{ color: BRAND.muted }}>{subtitle}</p> : null}{buttonLabel && buttonPath ? <div className="mt-7 flex flex-wrap gap-3"><PrimaryButton href={storeHref(storeBase, buttonPath)}>{buttonLabel} <ArrowRight className="h-4 w-4" /></PrimaryButton>{secondLabel && secondPath ? <SecondaryButton href={storeHref(storeBase, secondPath)}>{secondLabel}</SecondaryButton> : null}</div> : null}</div>{image ? <div className="rounded-[32px] border bg-white/75 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.10)]" style={{ borderColor: BRAND.line }}><img src={image} alt={title} className="h-[360px] w-full rounded-[24px] object-cover" /></div> : null}</div></Shell></section>;
}

function HostedSection({ section, storeBase, products, categories, collectionPoints }: { section: StorefrontHomepageSection; storeBase: string; products: ThemeProductCard[]; categories: ThemeCategoryCard[]; collectionPoints: CollectionPoint[] }) {
  if (section.type === 'hero') return <HostedHero section={section} storeBase={storeBase} />;
  if (section.type === 'product-grid') {
    const shown = productsFor(section, products);
    const buttonLabel = text(section.buttonLabel);
    const buttonPath = text(section.buttonHref);
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow)} title={text(section.title)} body={text(section.subtitle || section.body)} action={buttonLabel && buttonPath ? <SecondaryButton href={storeHref(storeBase, buttonPath)}>{buttonLabel}</SecondaryButton> : undefined} />{shown.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{shown.map((item) => <ProductCard key={item.slug} item={item} compact storeBase={storeBase} />)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published products match this section.</div>}</Shell></section>;
  }
  if (section.type === 'category-carousel') {
    const shown = categoriesFor(section, categories);
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow)} title={text(section.title)} body={text(section.subtitle || section.body)} />{shown.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((category) => <Link key={category.slug} href={storeHref(storeBase, `/${category.slug}`)} className="rounded-[22px] border bg-white p-5 no-underline shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[18px] font-black" style={{ color: BRAND.ink }}>{category.title}</div>{category.description ? <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{category.description}</p> : null}<div className="mt-3 text-[12px] font-black" style={{ color: BRAND.primary }}>{category.productCount} products</div></Link>)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published categories match this section.</div>}</Shell></section>;
  }
  if (section.type === 'collection-points') {
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow)} title={text(section.title)} body={text(section.subtitle || section.body)} />{collectionPoints.length ? <div className="grid gap-4 md:grid-cols-3">{collectionPoints.map((point) => <div key={point.slug} className="rounded-[22px] border bg-white p-5" style={{ borderColor: BRAND.line }}><MapPin className="h-5 w-5" style={{ color: BRAND.primary }} /><div className="mt-3 text-[16px] font-black" style={{ color: BRAND.ink }}>{point.name}</div>{point.address ? <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{point.address}</p> : null}{point.note ? <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{point.note}</p> : null}</div>)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No collection points are published for this store.</div>}</Shell></section>;
  }
  if (section.type === 'faq') {
    const items = list(section.items).filter((item: any) => text(item?.question) && text(item?.answer));
    if (!items.length) return null;
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow)} title={text(section.title)} body={text(section.subtitle || section.body)} /><div className="grid gap-3">{items.map((item: any, index) => <details key={`${item.question}-${index}`} className="rounded-[18px] border bg-white p-5" style={{ borderColor: BRAND.line }}><summary className="cursor-pointer text-[14px] font-black" style={{ color: BRAND.ink }}>{text(item.question)}</summary><p className="mt-3 text-[13px] leading-7" style={{ color: BRAND.muted }}>{text(item.answer)}</p></details>)}</div></Shell></section>;
  }
  if (section.type === 'contact-cta') {
    const title = text(section.title);
    const body = text(section.subtitle || section.body);
    const buttonLabel = text(section.buttonLabel);
    const buttonPath = text(section.buttonHref);
    if (!title && !body) return null;
    return <section className="py-8"><Shell><div className="rounded-[30px] p-8 text-white md:p-10" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>{title ? <h2 className="text-[34px] font-black tracking-[-0.05em]">{title}</h2> : null}{body ? <p className="mt-3 max-w-[720px] text-[13px] leading-7 text-white/85">{body}</p> : null}{buttonLabel && buttonPath ? <div className="mt-6"><Link href={storeHref(storeBase, buttonPath)} className="inline-flex rounded-full bg-white px-5 py-3 text-[12px] font-black no-underline" style={{ color: BRAND.ink }}>{buttonLabel}</Link></div> : null}</div></Shell></section>;
  }
  const title = text(section.title);
  const body = text(section.subtitle || section.body);
  const eyebrow = text(section.eyebrow);
  const image = text(section.imageUrl || section.image);
  if (!title && !body && !image) return null;
  return <section className="py-8"><Shell><div className={`grid gap-6 rounded-[28px] border bg-white p-7 shadow-sm ${image ? 'lg:grid-cols-2 lg:items-center' : ''}`} style={{ borderColor: BRAND.line }}><div>{eyebrow ? <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{eyebrow}</div> : null}{title ? <h2 className="mt-3 text-[32px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>{title}</h2> : null}{body ? <p className="mt-4 text-[13px] leading-7" style={{ color: BRAND.muted }}>{body}</p> : null}</div>{image ? <img src={image} alt={title} className="h-72 w-full rounded-[20px] object-cover" /> : null}</div></Shell></section>;
}

export default function EnhancedHomePage({ storeBase, navItems, settings, products = [], categories = [], collectionPoints = [] }: { storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; products?: ThemeProductCard[]; categories?: ThemeCategoryCard[]; collectionPoints?: CollectionPoint[] }) {
  const sections = settings.sections;
  return <StorefrontChrome currentPath="/" navItems={navItems} storeBase={storeBase} settings={settings}>
    {sections.length ? sections.map((section) => <HostedSection key={section.id} section={section} storeBase={storeBase} products={products} categories={categories} collectionPoints={collectionPoints} />) : <section className="py-12"><Shell><div className="rounded-[28px] border bg-white p-8 text-sm leading-7 shadow-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Storefront homepage content has not been published for this store.</div></Shell></section>}
  </StorefrontChrome>;
}
