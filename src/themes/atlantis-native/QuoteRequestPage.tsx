import StorefrontChrome from './StorefrontChrome';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeRouteViews } from '@/v0-themes/contracts';
import { buildV0ThemePageContext, themeProductToV0 } from '@/theme-runtime/v0-view-props';
import { protectedWidgetTheme } from '@/theme-runtime/protected-widget-appearance';

function selectedOptionRows(product: ThemeProductCard | undefined, searchParams: Record<string, string>) {
  if (!product?.optionGroups?.length) return [];
  return product.optionGroups.map((group) => {
    const selectedSlug = searchParams[group.key] || group.values[0]?.slug || '';
    const selected = group.values.find((value) => value.slug === selectedSlug);
    return selected ? { key: group.key, label: group.label, value: selected.label, slug: selected.slug } : null;
  }).filter(Boolean) as { key: string; label: string; value: string; slug: string }[];
}

function optionQuery(rows: { key: string; slug: string }[]) {
  const params = new URLSearchParams();
  rows.forEach((row) => { if (row.key && row.slug) params.set(row.key, row.slug); });
  return params.toString();
}

export default function QuoteRequestPage({ storeBase, navItems, tenantSlug, storeSlug, category, slug, products = [], searchParams = {}, settings, routeViews }: { storeBase: string; navItems: NavItem[]; tenantSlug: string; storeSlug: string; category: string; slug: string; products?: ThemeProductCard[]; searchParams?: Record<string, string>; settings?: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews }) {
  const product = products.find((item) => item.slug === slug && item.category === category);
  const optionRows = selectedOptionRows(product, searchParams);
  const selectedOptionsJson = JSON.stringify(optionRows);
  const selectedOptionsQuery = optionQuery(optionRows);
  const editOptionsHref = `${storeBase}/${category}/${slug}${selectedOptionsQuery ? `?${selectedOptionsQuery}` : ''}`;
  const currentPath = `/quote/${category}/${slug}`;
  const widget = protectedWidgetTheme(settings?.layout?.widgetAppearance, settings?.brand);
  const fieldClass = `mt-2 w-full ${widget.classes.field}`;
  const labelClass = `text-[12px] font-bold`;
  const form = <form data-protected-widget="quote-form" action="/api/native-storefront/quote-requests" method="post" className={widget.classes.surface} style={{ ...widget.rootStyle, ...widget.styles.surface }}>
    <input type="hidden" name="tenantSlug" value={tenantSlug} />
    <input type="hidden" name="storeSlug" value={storeSlug} />
    <input type="hidden" name="categorySlug" value={category} />
    <input type="hidden" name="productSlug" value={slug} />
    <input type="hidden" name="selectedOptions" value={selectedOptionsJson} />
    <input type="hidden" name="selectedOptionsQuery" value={selectedOptionsQuery} />
    <div className="text-[22px] font-black tracking-[-0.04em]" style={widget.styles.text}>Send quote request</div>
    <div className={`mt-5 grid sm:grid-cols-2 ${widget.classes.gap}`}>
      <label className={labelClass} style={widget.styles.text}>Name<input required name="customerName" className={fieldClass} style={widget.styles.field} /></label>
      <label className={labelClass} style={widget.styles.text}>Email<input name="email" type="email" className={fieldClass} style={widget.styles.field} /></label>
      <label className={labelClass} style={widget.styles.text}>Phone<input name="phone" className={fieldClass} style={widget.styles.field} /></label>
      <label className={labelClass} style={widget.styles.text}>Quantity<input name="quantity" className={fieldClass} style={widget.styles.field} /></label>
      <label className={labelClass} style={widget.styles.text}>Needed by<input name="deadline" className={fieldClass} style={widget.styles.field} /></label>
      <label className={labelClass} style={widget.styles.text}>Artwork<select name="artworkStatus" className={fieldClass} style={widget.styles.field}><option value="ready">Artwork ready</option><option value="need-design">Need design help</option><option value="send-later">Will send later</option></select></label>
    </div>
    <label className="mt-4 block text-[12px] font-bold" style={widget.styles.text}>Job details<textarea name="notes" rows={5} className={fieldClass} style={widget.styles.field} placeholder="Size, paper/material, finishing, delivery/collection notes..." /></label>
    <p className="mt-4 text-[12px]" style={widget.styles.muted}>Please add either email or phone so the store can contact you. Selected product options are saved with this quote.</p>
    <button className={`${widget.classes.top} w-full text-white ${widget.classes.button}`} style={widget.styles.primaryButton}>Submit quote request</button>
  </form>;

  if (routeViews?.QuotePage && settings) {
    const View = routeViews.QuotePage;
    return <View {...buildV0ThemePageContext({ storeBase, currentPath, navItems, settings })} product={product ? themeProductToV0(product, storeBase) : undefined} selectedOptions={optionRows.map(({ key, label, value }) => ({ key, label, value }))} editOptionsHref={editOptionsHref} slots={{ form }} />;
  }

  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10"><Shell><div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Quote request</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{product?.title || 'Request a print quote'}</h1>{product?.text ? <p className="mt-3 text-sm leading-7" style={{ color: BRAND.muted }}>{product.text}</p> : null}<div className="mt-5 rounded-[20px] border p-4 text-[13px] font-bold" style={{ borderColor: BRAND.line, color: BRAND.primary }}>{product?.price || 'Quote ready'}</div>{optionRows.length ? <div className="mt-5 rounded-[20px] border p-4" style={{ borderColor: BRAND.line }}><div className="flex items-center justify-between gap-3"><div className="text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.ink }}>Selected options</div><a href={editOptionsHref} className="text-[12px] font-black no-underline" style={{ color: BRAND.primary }}>Edit options</a></div><div className="mt-3 grid gap-2">{optionRows.map((row) => <div key={row.key} className="flex items-center justify-between gap-3 text-sm"><span style={{ color: BRAND.muted }}>{row.label}</span><strong style={{ color: BRAND.ink }}>{row.value}</strong></div>)}</div></div> : null}</div>{form}</div></Shell></section></StorefrontChrome>;
}
