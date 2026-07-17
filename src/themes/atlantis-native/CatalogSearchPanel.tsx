'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Filter, Search, SlidersHorizontal } from 'lucide-react';
import type { StorefrontCatalogSearchResult } from '@/theme-runtime/catalog-search.service';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

type Props = {
  tenantSlug: string;
  storeSlug: string;
  storeBase: string;
  initialResult: StorefrontCatalogSearchResult;
  appearance?: unknown;
  brand?: Partial<StorefrontBrandSettings>;
};

function poundsToMinor(value: string) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next * 100) : null; }
function minorToPounds(value: number | null) { return value === null ? '' : (value / 100).toFixed(value % 100 ? 2 : 0); }
function buildParams(input: { query: string; category: string; buyingMode: string; sort: string; minPrice: string; maxPrice: string; page: number }) {
  const params = new URLSearchParams();
  if (input.query.trim()) params.set('q', input.query.trim());
  if (input.category) params.set('category', input.category);
  if (input.buyingMode && input.buyingMode !== 'all') params.set('buyingMode', input.buyingMode);
  if (input.sort && input.sort !== 'relevance') params.set('sort', input.sort);
  const min = poundsToMinor(input.minPrice); const max = poundsToMinor(input.maxPrice);
  if (min !== null) params.set('minPriceMinor', String(min));
  if (max !== null) params.set('maxPriceMinor', String(max));
  if (input.page > 1) params.set('page', String(input.page));
  return params;
}

export default function CatalogSearchPanel({ tenantSlug, storeSlug, storeBase, initialResult, appearance, brand }: Props) {
  const [query, setQuery] = useState(initialResult.query);
  const [submittedQuery, setSubmittedQuery] = useState(initialResult.query);
  const [category, setCategory] = useState(initialResult.filters.category);
  const [buyingMode, setBuyingMode] = useState(initialResult.filters.buyingMode);
  const [sort, setSort] = useState(initialResult.sort);
  const [minPrice, setMinPrice] = useState(minorToPounds(initialResult.filters.minPriceMinor));
  const [maxPrice, setMaxPrice] = useState(minorToPounds(initialResult.filters.maxPriceMinor));
  const [page, setPage] = useState(initialResult.pagination.page);
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const widget = protectedWidgetTheme(appearance, brand);
  const fieldClass = `w-full ${widget.classes.field}`;

  const requestParams = useMemo(() => buildParams({ query: submittedQuery, category, buyingMode, sort, minPrice, maxPrice, page }), [submittedQuery, category, buyingMode, sort, minPrice, maxPrice, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const api = new URLSearchParams(requestParams);
        api.set('tenantSlug', tenantSlug); api.set('storeSlug', storeSlug); api.set('limit', '24');
        const response = await fetch(`/api/native-storefront/catalog-search?${api.toString()}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Catalogue search failed.');
        setResult(payload.result as StorefrontCatalogSearchResult);
        const browserUrl = `${storeBase}/search${requestParams.toString() ? `?${requestParams.toString()}` : ''}`;
        window.history.replaceState({}, '', browserUrl);
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') setError(err instanceof Error ? err.message : 'Catalogue search failed.');
      } finally { setLoading(false); }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [tenantSlug, storeSlug, storeBase, requestParams]);

  function submit(event: FormEvent) { event.preventDefault(); setPage(1); setSubmittedQuery(query.trim()); }
  function clearFilters() { setCategory(''); setBuyingMode('all'); setSort('relevance'); setMinPrice(''); setMaxPrice(''); setPage(1); }

  const totalLabel = `${result.pagination.total} product${result.pagination.total === 1 ? '' : 's'}`;

  return <div data-protected-widget="catalog-search" className="space-y-6">
    <form onSubmit={submit} className={widget.classes.surface} style={{ ...widget.rootStyle, ...widget.styles.surface }}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]" style={widget.styles.muted}><Search className="h-4 w-4" />Search catalogue</div>
      <div className={`mt-4 grid gap-3 md:grid-cols-[1fr_auto] ${widget.classes.gap}`}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, categories or SKU…" className={fieldClass} style={widget.styles.field} /><button className={`${widget.classes.button} px-6 text-white`} style={widget.styles.primaryButton}>Search</button></div>
      <div className="mt-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]" style={widget.styles.muted}><SlidersHorizontal className="h-4 w-4" />Filters and sorting</div>
      <div className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 ${widget.classes.gap}`}>
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className={fieldClass} style={widget.styles.field}><option value="">All categories</option>{result.facets.categories.map((item) => <option key={item.slug} value={item.slug}>{item.title} ({item.count})</option>)}</select>
        <select value={buyingMode} onChange={(event) => { setBuyingMode(event.target.value as 'all' | 'cart' | 'quote'); setPage(1); }} className={fieldClass} style={widget.styles.field}><option value="all">All buying options</option>{result.facets.buyingModes.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.count})</option>)}</select>
        <input inputMode="decimal" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} placeholder="Min price £" className={fieldClass} style={widget.styles.field} />
        <input inputMode="decimal" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} placeholder="Max price £" className={fieldClass} style={widget.styles.field} />
        <select value={sort} onChange={(event) => { setSort(event.target.value as any); setPage(1); }} className={fieldClass} style={widget.styles.field}><option value="relevance">Best match</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="newest">Recently updated</option></select>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-[12px] font-bold" style={widget.styles.muted}>{loading ? 'Updating results…' : totalLabel}</span><button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 text-[12px] font-black" style={{ color: 'var(--storefront-primary, #18A7D0)' }}><Filter className="h-4 w-4" />Clear filters</button></div>
    </form>

    {error ? <div className="rounded-[18px] border border-amber-300 bg-amber-50 p-4 text-[12px] font-bold text-amber-900">{error}</div> : null}

    {result.categories.length ? <section><div className="mb-4 flex items-end justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Category matches</div><h2 className="mt-2 text-[28px] font-black tracking-[-0.05em]" style={widget.styles.text}>Browse a matching category</h2></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.categories.map((item) => <Link key={item.slug} href={item.href} className="rounded-[20px] border bg-white p-5 no-underline transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="text-[17px] font-black" style={widget.styles.text}>{item.title}</div><p className="mt-2 line-clamp-2 text-[12px] leading-6" style={widget.styles.muted}>{item.description || `${item.productCount} products`}</p><div className="mt-4 text-[11px] font-black" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{item.productCount} product{item.productCount === 1 ? '' : 's'} →</div></Link>)}</div></section> : null}

    <section><div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Products</div><h2 className="mt-2 text-[30px] font-black tracking-[-0.055em]" style={widget.styles.text}>{submittedQuery ? `Results for “${submittedQuery}”` : 'Browse the full catalogue'}</h2></div><span className="text-[12px] font-bold" style={widget.styles.muted}>{totalLabel}</span></div>
      {result.products.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.products.map((product) => <Link key={`${product.categorySlug}-${product.slug}`} href={product.href} className="group overflow-hidden rounded-[22px] border bg-white no-underline transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.10)]" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="aspect-[4/3] overflow-hidden bg-slate-100">{product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[12px] font-bold text-slate-400">No preview image</div>}</div><div className="p-5"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}><span>{product.categoryTitle}</span>{product.sku ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">SKU {product.sku}</span> : null}</div><h3 className="mt-3 text-[20px] font-black tracking-[-0.04em]" style={widget.styles.text}>{product.title}</h3>{product.description ? <p className="mt-2 line-clamp-2 text-[12px] leading-6" style={widget.styles.muted}>{product.description}</p> : null}<div className="mt-5 flex items-center justify-between gap-3"><div><div className="text-[13px] font-black" style={widget.styles.text}>{product.price || (product.buyingMode === 'quote' ? 'Request quote' : 'View options')}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={widget.styles.muted}>{product.buyingMode === 'quote' ? 'Quote-led' : 'Buy online'}</div></div><ArrowRight className="h-4 w-4" style={{ color: 'var(--storefront-primary, #18A7D0)' }} /></div></div></Link>)}</div> : <div className="rounded-[22px] border border-dashed bg-white p-8 text-center text-[13px]" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', ...widget.styles.muted }}>No products match these search filters.</div>}
    </section>

    {result.pagination.totalPages > 1 ? <div className="flex items-center justify-center gap-3"><button type="button" disabled={result.pagination.page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-[12px] font-black disabled:opacity-40" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', ...widget.styles.text }}><ArrowLeft className="h-4 w-4" />Previous</button><span className="text-[12px] font-bold" style={widget.styles.muted}>Page {result.pagination.page} of {result.pagination.totalPages}</span><button type="button" disabled={result.pagination.page >= result.pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-[12px] font-black disabled:opacity-40" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', ...widget.styles.text }}>Next<ArrowRight className="h-4 w-4" /></button></div> : null}
  </div>;
}
