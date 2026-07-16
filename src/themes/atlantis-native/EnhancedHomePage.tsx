import Link from 'next/link';
import { ArrowRight, MapPin, Package, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import StorefrontChrome from './StorefrontChrome';
import HomeHero from './HomeHero';
import HomeWhySection from './HomeWhySection';
import HomeTradeSection from './HomeTradeSection';
import HomeEventSection from './HomeEventSection';
import HomeBulkHelpSection from './HomeBulkHelpSection';
import HomeCommunityOrderSection from './HomeCommunityOrderSection';
import type { ThemeCategoryCard, ThemeProductCard } from './catalog-adapter';
import type { CollectionPoint } from './collection-points';
import { BRAND, storeHref } from './theme-helpers';
import { featureCards, popularProducts } from './home-data';
import { PrimaryButton, ProductCard, SecondaryButton, SectionHeading, Shell } from './HomePrimitives';
import type { NavItem } from './types';
import { loadStorefrontRuntimeSettings, type StorefrontHomepageSection, type StorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

const icons = [ShieldCheck, Truck, Package, Sparkles];

function storeParts(storeBase: string) {
  const parts = String(storeBase || '').split('/').filter(Boolean);
  const index = parts.indexOf('native-stores');
  return { tenantSlug: index >= 0 ? parts[index + 1] || '' : '', storeSlug: index >= 0 ? parts[index + 2] || '' : '' };
}

function text(value: unknown, fallback = '') {
  const next = String(value || '').trim();
  return next || fallback;
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

function HostedHero({ section, storeBase, settings }: { section: StorefrontHomepageSection; storeBase: string; settings: StorefrontRuntimeSettings }) {
  const title = text(section.title, `${settings.storeName} online printing`);
  const subtitle = text(section.subtitle || section.body, 'Order print products online with pricing and options controlled by the SaaS admin.');
  const buttonLabel = text(section.buttonLabel, 'Browse products');
  const buttonHref = storeHref(storeBase, text(section.buttonHref, '/all-products'));
  const secondLabel = text(section.secondaryButtonLabel);
  const secondHref = storeHref(storeBase, text(section.secondaryButtonHref, '/bespoke-quote'));
  const image = text(section.imageUrl || section.image, '/native-theme-assets/atlantis/hero-slide-1.svg');
  return <section className="relative overflow-hidden border-b" style={{ borderColor: BRAND.line, background: 'linear-gradient(135deg, color-mix(in srgb, var(--storefront-primary) 12%, white) 0%, color-mix(in srgb, var(--storefront-accent) 7%, white) 58%, white 100%)' }}><Shell className="py-10 lg:py-16"><div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"><div><div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{text(section.eyebrow, settings.storeName)}</div><h1 className="mt-5 max-w-[720px] text-[46px] font-black leading-[0.94] tracking-[-0.065em] sm:text-[66px]" style={{ color: BRAND.ink }}>{title}</h1><p className="mt-5 max-w-[620px] text-[14px] leading-7" style={{ color: BRAND.muted }}>{subtitle}</p><div className="mt-7 flex flex-wrap gap-3"><PrimaryButton href={buttonHref}>{buttonLabel} <ArrowRight className="h-4 w-4" /></PrimaryButton>{secondLabel ? <SecondaryButton href={secondHref}>{secondLabel}</SecondaryButton> : null}</div></div><div className="rounded-[32px] border bg-white/75 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.10)]" style={{ borderColor: BRAND.line }}><img src={image} alt={title} className="h-[360px] w-full rounded-[24px] object-cover" /></div></div></Shell></section>;
}

function HostedSection({ section, storeBase, products, categories, collectionPoints, settings }: { section: StorefrontHomepageSection; storeBase: string; products: ThemeProductCard[]; categories: ThemeCategoryCard[]; collectionPoints: CollectionPoint[]; settings: StorefrontRuntimeSettings }) {
  if (section.type === 'hero') return <HostedHero section={section} storeBase={storeBase} settings={settings} />;
  if (section.type === 'product-grid') {
    const shown = productsFor(section, products);
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow, 'Products')} title={text(section.title, 'Popular products')} body={text(section.subtitle || section.body)} action={<SecondaryButton href={storeHref(storeBase, '/all-products')}>View all products</SecondaryButton>} />{shown.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{shown.map((item) => <ProductCard key={item.slug} item={item} compact storeBase={storeBase} />)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published products match this block.</div>}</Shell></section>;
  }
  if (section.type === 'category-carousel') {
    const shown = categoriesFor(section, categories);
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow, 'Categories')} title={text(section.title, 'Shop by category')} body={text(section.subtitle || section.body)} />{shown.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((category) => <Link key={category.slug} href={storeHref(storeBase, `/${category.slug}`)} className="rounded-[22px] border bg-white p-5 no-underline shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[18px] font-black" style={{ color: BRAND.ink }}>{category.title}</div>{category.description ? <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{category.description}</p> : null}<div className="mt-3 text-[12px] font-black" style={{ color: BRAND.primary }}>{category.productCount} products</div></Link>)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published categories match this block.</div>}</Shell></section>;
  }
  if (section.type === 'collection-points') {
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow, 'Collection')} title={text(section.title, 'Choose a collection point')} body={text(section.subtitle || section.body)} />{collectionPoints.length ? <div className="grid gap-4 md:grid-cols-3">{collectionPoints.map((point) => <div key={point.slug} className="rounded-[22px] border bg-white p-5" style={{ borderColor: BRAND.line }}><MapPin className="h-5 w-5" style={{ color: BRAND.primary }} /><div className="mt-3 text-[16px] font-black" style={{ color: BRAND.ink }}>{point.name}</div>{point.address ? <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{point.address}</p> : null}{point.note ? <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{point.note}</p> : null}</div>)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No collection points are published for this store.</div>}</Shell></section>;
  }
  if (section.type === 'faq') {
    const items = list(section.items);
    return <section className="py-8"><Shell><SectionHeading eyebrow={text(section.eyebrow, 'Help')} title={text(section.title, 'Frequently asked questions')} body={text(section.subtitle || section.body)} /><div className="grid gap-3">{items.map((item: any, index) => <details key={`${item.question || 'question'}-${index}`} className="rounded-[18px] border bg-white p-5" style={{ borderColor: BRAND.line }}><summary className="cursor-pointer text-[14px] font-black" style={{ color: BRAND.ink }}>{text(item.question, `Question ${index + 1}`)}</summary><p className="mt-3 text-[13px] leading-7" style={{ color: BRAND.muted }}>{text(item.answer)}</p></details>)}</div></Shell></section>;
  }
  if (section.type === 'contact-cta') {
    return <section className="py-8"><Shell><div className="rounded-[30px] p-8 text-white md:p-10" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}><h2 className="text-[34px] font-black tracking-[-0.05em]">{text(section.title, 'Need a bespoke print quote?')}</h2><p className="mt-3 max-w-[720px] text-[13px] leading-7 text-white/85">{text(section.subtitle || section.body, 'Send your requirements and the store team will help with materials, sizes, finishing and delivery.')}</p><div className="mt-6"><Link href={storeHref(storeBase, text(section.buttonHref, '/bespoke-quote'))} className="inline-flex rounded-full bg-white px-5 py-3 text-[12px] font-black no-underline" style={{ color: BRAND.ink }}>{text(section.buttonLabel, 'Request quote')}</Link></div></div></Shell></section>;
  }
  const image = text(section.imageUrl || section.image);
  return <section className="py-8"><Shell><div className={`grid gap-6 rounded-[28px] border bg-white p-7 shadow-sm ${image ? 'lg:grid-cols-2 lg:items-center' : ''}`} style={{ borderColor: BRAND.line }}><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{text(section.eyebrow, settings.storeName)}</div><h2 className="mt-3 text-[32px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>{text(section.title, 'Storefront section')}</h2><p className="mt-4 text-[13px] leading-7" style={{ color: BRAND.muted }}>{text(section.subtitle || section.body)}</p></div>{image ? <img src={image} alt={text(section.title, 'Storefront section')} className="h-72 w-full rounded-[20px] object-cover" /> : null}</div></Shell></section>;
}

export default async function EnhancedHomePage({ storeBase, navItems, products = [], categories = [], collectionPoints = [] }: { storeBase: string; navItems: NavItem[]; products?: ThemeProductCard[]; categories?: ThemeCategoryCard[]; collectionPoints?: CollectionPoint[] }) {
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug);
  const sections = settings.sections;
  const shownProducts = products.length ? products.slice(0, 5).map((item) => ({ ...item, path: `/${item.category}/${item.slug}` })) : popularProducts;

  return <StorefrontChrome currentPath="/" navItems={navItems} storeBase={storeBase} settings={settings}>
    {sections.length ? sections.map((section) => <HostedSection key={section.id} section={section} storeBase={storeBase} products={products} categories={categories} collectionPoints={collectionPoints} settings={settings} />) : <>
      <HomeHero storeBase={storeBase} />
      <section className="py-6"><Shell><div className="grid gap-4 md:grid-cols-4">{featureCards.map(([title, body], index) => { const Icon = icons[index]; return <div key={title} className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.04)]" style={{ borderColor: BRAND.line }}><Icon className="h-5 w-5" style={{ color: BRAND.primary }} /><div className="mt-4 text-[15px] font-black" style={{ color: BRAND.ink }}>{title}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{body}</p></div>; })}</div></Shell></section>
      <HomeWhySection />
      <section className="py-8"><Shell><SectionHeading eyebrow="Popular products" title="Popular print products for business, trade and events" action={<SecondaryButton href={storeHref(storeBase, '/all-products')}>View all products</SecondaryButton>} /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{shownProducts.map((item: any) => <ProductCard key={item.slug || item.title} item={item} compact storeBase={storeBase} />)}</div></Shell></section>
      <HomeTradeSection storeBase={storeBase} /><HomeEventSection storeBase={storeBase} /><HomeBulkHelpSection storeBase={storeBase} /><HomeCommunityOrderSection storeBase={storeBase} />
    </>}
  </StorefrontChrome>;
}
