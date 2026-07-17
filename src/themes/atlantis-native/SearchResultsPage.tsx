import Link from 'next/link';
import StorefrontChrome from './StorefrontChrome';
import type { NavItem } from './types';
import type { ThemeCategoryCard, ThemeProductCard } from './catalog-adapter';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import { searchStorefrontCatalog } from '@/core/storefront/catalog-search.service';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';

export default function SearchResultsPage({ storeBase, navItems, products, categories, settings, searchParams = {} }: { storeBase: string; navItems: NavItem[]; products: ThemeProductCard[]; categories: ThemeCategoryCard[]; settings?: StorefrontRuntimeSettings; searchParams?: Record<string, string> }) {
  const data = searchStorefrontCatalog({ query: searchParams.q || '', category: searchParams.category || '', buyingMode: searchParams.buyingMode || '', sort: searchParams.sort || 'relevance', limit: 100, products, categories, storeBase });
  const query = data.query;
  return <StorefrontChrome currentPath="/search" navItems={navItems} storeBase={storeBase} settings={settings}>
    <section className="border-b bg-white" style={{ borderColor: BRAND.line }}><Shell className="py-10 lg:py-14"><div className="max-w-[820px]"><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Catalogue search</div><h1 className="mt-3 text-[40px] font-black tracking-[-0.055em] md:text-[58px]" style={{ color: BRAND.ink }}>{query ? `Results for “${query}”` : 'Search every print product'}</h1><p className="mt-4 text-[14px] leading-7" style={{ color: BRAND.muted }}>{data.total} matching product{data.total === 1 ? '' : 's'} and categor{data.total === 1 ? 'y' : 'ies'} from this store’s published catalogue.</p></div></Shell></section>
    <section className="py-8"><Shell>
      <form action={`${storeBase}/search`} method="get" className="grid gap-3 rounded-[22px] border bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr_auto]" style={{ borderColor: BRAND.line }}>
        <input name="q" defaultValue={query} placeholder="Search products, categories or SKU" className="h-12 rounded-xl border px-4 text-sm outline-none" style={{ borderColor: BRAND.line }} />
        <select name="category" defaultValue={data.category} className="h-12 rounded-xl border px-3 text-sm" style={{ borderColor: BRAND.line }}><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select>
        <select name="buyingMode" defaultValue={data.buyingMode} className="h-12 rounded-xl border px-3 text-sm" style={{ borderColor: BRAND.line }}><option value="">All buying modes</option><option value="cart">Buy online</option><option value="quote">Request quote</option></select>
        <select name="sort" defaultValue={data.sort} className="h-12 rounded-xl border px-3 text-sm" style={{ borderColor: BRAND.line }}><option value="relevance">Relevance</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="price-low">Price low–high</option><option value="price-high">Price high–low</option></select>
        <button className="h-12 rounded-xl px-5 text-sm font-black text-white" style={{ backgroundColor: BRAND.primary }}>Search</button>
      </form>
      {data.results.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.results.map((item) => <Link key={item.id} href={item.href as any} className="overflow-hidden rounded-[22px] border bg-white no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: BRAND.line }}><div className="aspect-[4/3] bg-slate-50">{item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs font-bold uppercase tracking-[0.15em]" style={{ color: BRAND.muted }}>{item.type}</div>}</div><div className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: BRAND.primary }}>{item.type === 'category' ? 'Category' : item.categoryTitle}</span>{item.sku ? <span className="text-[10px] font-bold" style={{ color: BRAND.muted }}>SKU {item.sku}</span> : null}</div><h2 className="mt-2 text-[19px] font-black tracking-[-0.035em]" style={{ color: BRAND.ink }}>{item.title}</h2><p className="mt-2 line-clamp-2 text-[12px] leading-5" style={{ color: BRAND.muted }}>{item.description || (item.type === 'category' ? 'Browse this product category.' : 'Configure this product online.')}</p>{item.price ? <div className="mt-4 text-sm font-black" style={{ color: BRAND.primary }}>{item.price}</div> : null}</div></Link>)}</div> : <div className="mt-7 rounded-[22px] border bg-white p-8 text-center" style={{ borderColor: BRAND.line, color: BRAND.muted }}>No published catalogue items matched your search.</div>}
    </Shell></section>
  </StorefrontChrome>;
}
