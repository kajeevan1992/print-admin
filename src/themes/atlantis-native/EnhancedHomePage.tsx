import { Package, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import StorefrontChrome from './StorefrontChrome';
import HomeHero from './HomeHero';
import HomeWhySection from './HomeWhySection';
import HomeTradeSection from './HomeTradeSection';
import HomeEventSection from './HomeEventSection';
import HomeBulkHelpSection from './HomeBulkHelpSection';
import HomeCommunityOrderSection from './HomeCommunityOrderSection';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND, storeHref } from './theme-helpers';
import { featureCards, popularProducts } from './home-data';
import { ProductCard, SecondaryButton, SectionHeading, Shell } from './HomePrimitives';
import type { NavItem } from './types';

const icons = [ShieldCheck, Truck, Package, Sparkles];

export default function EnhancedHomePage({ storeBase, navItems, products = [] }: { storeBase: string; navItems: NavItem[]; products?: ThemeProductCard[] }) {
  const shownProducts = products.length ? products.slice(0, 5).map((item) => ({ ...item, path: `/${item.category}/${item.slug}` })) : popularProducts;
  return <StorefrontChrome currentPath="/" navItems={navItems} storeBase={storeBase}><HomeHero storeBase={storeBase} /><section className="py-6"><Shell><div className="grid gap-4 md:grid-cols-4">{featureCards.map(([title, text], index) => { const Icon = icons[index]; return <div key={title} className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.04)]" style={{ borderColor: BRAND.line }}><Icon className="h-5 w-5" style={{ color: BRAND.primary }} /><div className="mt-4 text-[15px] font-black" style={{ color: BRAND.ink }}>{title}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{text}</p></div>; })}</div></Shell></section><HomeWhySection /><section className="py-8"><Shell><SectionHeading eyebrow="Popular products" title="Popular print products for business, trade and events" action={<SecondaryButton href={storeHref(storeBase, '/all-products')}>View all products</SecondaryButton>} /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{shownProducts.map((item: any) => <ProductCard key={item.slug || item.title} item={item} compact storeBase={storeBase} />)}</div></Shell></section><HomeTradeSection storeBase={storeBase} /><HomeEventSection storeBase={storeBase} /><HomeBulkHelpSection storeBase={storeBase} /><HomeCommunityOrderSection storeBase={storeBase} /></StorefrontChrome>;
}
