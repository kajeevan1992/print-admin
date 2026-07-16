import StorefrontChrome from './StorefrontChrome';
import type { NavItem } from './types';
import type { ThemeCategoryCard, ThemeProductCard } from './catalog-adapter';
import { BRAND, cleanSlug } from './theme-helpers';
import { ProductCard, SectionHeading, Shell } from './HomePrimitives';

function titleFromSlug(slug: string) {
  return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CategoryPage({ storeBase, navItems, slug, products = [], categories = [] }: { storeBase: string; navItems: NavItem[]; slug: string; products?: ThemeProductCard[]; categories?: ThemeCategoryCard[] }) {
  const allProducts = cleanSlug(slug) === 'all-products';
  const category = categories.find((item) => cleanSlug(item.slug) === cleanSlug(slug));
  const title = allProducts ? 'All Products' : category?.title || titleFromSlug(slug || 'products');
  const description = allProducts ? 'Browse every product currently published in the SaaS admin for this store.' : category?.description || 'Only products published in the SaaS admin for this category are shown here.';
  const shown = allProducts ? products : products.filter((product) => cleanSlug(product.category) === cleanSlug(slug));

  return <StorefrontChrome currentPath={`/${slug}`} navItems={navItems} storeBase={storeBase}>
    <section className="border-b bg-white" style={{ borderColor: BRAND.line }}><Shell className="py-10 lg:py-14"><div className="overflow-hidden rounded-[28px] border shadow-[0_22px_60px_rgba(0,0,0,0.06)]" style={{ borderColor: BRAND.line, background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 58%, color-mix(in srgb, var(--storefront-primary) 10%, white) 58%, white 100%)` }}><div className="grid gap-8 p-7 md:grid-cols-[0.95fr_1.05fr] md:p-10 lg:p-12"><div className="flex flex-col justify-center text-white"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">{title}</div><h1 className="mt-4 max-w-[620px] text-[38px] font-black leading-[0.98] tracking-[-0.055em] md:text-[54px]">{allProducts ? 'Browse all published print products.' : `${title} printing and product options.`}</h1><p className="mt-5 max-w-[560px] text-[14px] leading-7 text-white/88">{description}</p></div><div className="flex items-center justify-center"><div className="relative w-full max-w-[560px] rounded-[26px] border border-white/50 bg-white/70 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.16)] backdrop-blur"><img src={category?.image || '/native-theme-assets/atlantis/hero-slide-2.svg'} alt={title} className="h-[280px] w-full rounded-[18px] object-cover" /></div></div></div></div></Shell></section>
    <section className="py-8"><Shell><SectionHeading eyebrow={allProducts ? 'Catalog' : 'Products'} title={allProducts ? 'Choose a product' : `Choose your ${title.toLowerCase()} product`} body={description} />{shown.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{shown.map((item) => <ProductCard key={item.slug} item={{ ...item, path: `/${item.category}/${item.slug}` }} compact storeBase={storeBase} />)}</div> : <div className="rounded-[24px] border bg-white p-6 text-sm leading-7 shadow-sm" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No products are currently published in the SaaS admin for this view.</div>}</Shell></section>
  </StorefrontChrome>;
}
