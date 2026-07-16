import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, PackageCheck, ShoppingBag, XCircle } from 'lucide-react';
import type {
  V0ThemeCartPageProps,
  V0ThemeCategoryPageProps,
  V0ThemeCheckoutStatusPageProps,
  V0ThemePageContext,
  V0ThemeProduct,
  V0ThemeProductPageProps,
  V0ThemeQuotePageProps,
  V0ThemeRouteViews,
} from '../contracts';

function Logo({ page }: { page: V0ThemePageContext }) {
  if (page.brand.logoUrl) return <img src={page.brand.logoUrl} alt={page.brand.name} className="max-h-10 max-w-[220px] object-contain" />;
  return <span className="text-[24px] font-black tracking-[-0.05em]" style={{ color: page.brand.text }}>{page.brand.name}</span>;
}

function PageShell({ page, children }: { page: V0ThemePageContext; children: ReactNode }) {
  return <div style={{ backgroundColor: page.brand.background, color: page.brand.text }} data-v0-route-theme="canvas">
    <header className="sticky top-0 z-30 border-b bg-white/92 backdrop-blur" style={{ borderColor: page.brand.border }}><div className="mx-auto grid h-[76px] w-full max-w-[1320px] grid-cols-[auto_1fr_auto] items-center gap-6 px-5 md:px-8"><Link href={page.basePath} className="no-underline"><Logo page={page} /></Link><nav className="hidden items-center justify-center gap-5 lg:flex">{page.navigation.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} className="text-[13px] font-semibold no-underline" style={{ color: item.active ? page.brand.primary : page.brand.text }}>{item.label}</Link>)}</nav>{page.chromeSlots?.basket || <Link href={`${page.basePath}/cart`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-black no-underline" style={{ borderColor: page.brand.border, color: page.brand.text }}><ShoppingBag className="h-4 w-4" />Basket</Link>}</div></header>
    <main>{children}</main>
    <footer className="mt-12 border-t bg-white" style={{ borderColor: page.brand.border }}><div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-5 py-8 text-[12px] md:flex-row md:items-center md:justify-between md:px-8"><Logo page={page} /><span style={{ color: page.brand.muted }}>Powered by the internal Print SaaS storefront runtime.</span></div></footer>
  </div>;
}

function ProductCard({ page, product }: { page: V0ThemePageContext; product: V0ThemeProduct }) {
  return <Link href={product.href} className="group overflow-hidden rounded-[24px] border bg-white no-underline transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.10)]" style={{ borderColor: page.brand.border }}><div className="aspect-[4/3] overflow-hidden bg-slate-100">{product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}</div><div className="p-5"><div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: page.brand.primary }}>{product.category.replace(/-/g, ' ')}</div><h2 className="mt-2 text-[20px] font-black tracking-[-0.04em]" style={{ color: page.brand.text }}>{product.title}</h2>{product.description ? <p className="mt-2 line-clamp-2 text-[12px] leading-6" style={{ color: page.brand.muted }}>{product.description}</p> : null}<div className="mt-4 flex items-center justify-between"><strong className="text-[13px]" style={{ color: page.brand.text }}>{product.price || 'View options'}</strong><ArrowRight className="h-4 w-4" style={{ color: page.brand.primary }} /></div></div></Link>;
}

function CategoryPageView(props: V0ThemeCategoryPageProps) {
  return <PageShell page={props}><section className="border-b bg-white" style={{ borderColor: props.brand.border }}><div className="mx-auto grid w-full max-w-[1320px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:py-16"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>{props.allProducts ? 'Full catalogue' : 'Category'}</div><h1 className="mt-3 text-[46px] font-black leading-[0.95] tracking-[-0.065em] sm:text-[60px]">{props.category.title}</h1><p className="mt-5 max-w-[680px] text-[14px] leading-8" style={{ color: props.brand.muted }}>{props.category.description}</p></div>{props.category.image ? <img src={props.category.image} alt={props.category.title} className="h-[300px] w-full rounded-[28px] object-cover" /> : null}</div></section><section className="py-12"><div className="mx-auto w-full max-w-[1320px] px-5 md:px-8"><div className="mb-7 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>Products</div><h2 className="mt-2 text-[34px] font-black tracking-[-0.055em]">Choose a product</h2></div><span className="text-[12px] font-semibold" style={{ color: props.brand.muted }}>{props.products.length} available</span></div>{props.products.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{props.products.map((product) => <ProductCard key={product.slug} page={props} product={product} />)}</div> : <div className="rounded-[24px] border bg-white p-8 text-sm" style={{ borderColor: props.brand.border, color: props.brand.muted }}>No products are published in this category.</div>}</div></section></PageShell>;
}

function ProductPageView(props: V0ThemeProductPageProps) {
  if (props.status === 'unavailable' || !props.product) return <PageShell page={props}><section className="py-16"><div className="mx-auto w-full max-w-[900px] px-5 md:px-8"><div className="rounded-[28px] border bg-white p-10 text-center" style={{ borderColor: props.brand.border }}><XCircle className="mx-auto h-10 w-10" style={{ color: props.brand.primary }} /><h1 className="mt-5 text-[40px] font-black tracking-[-0.06em]">Product not available</h1><p className="mt-3 text-sm" style={{ color: props.brand.muted }}>This product is not currently published for this store.</p><Link href={props.basePath} className="mt-7 inline-flex rounded-full px-6 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: props.brand.primary }}>Return to storefront</Link></div></div></section></PageShell>;
  const product = props.product;
  return <PageShell page={props}>{props.quoteReference ? <div className="border-b px-5 py-3 text-center text-[12px] font-bold text-white" style={{ borderColor: props.brand.border, backgroundColor: props.brand.primary }}>Quote request sent. Reference: {props.quoteReference}</div> : null}<section className="py-10"><div className="mx-auto w-full max-w-[1320px] px-5 md:px-8"><Link href={`${props.basePath}/${product.category}`} className="inline-flex items-center gap-2 text-[12px] font-bold no-underline" style={{ color: props.brand.muted }}><ArrowLeft className="h-4 w-4" />Back to category</Link><div className="mt-6 grid gap-7 lg:grid-cols-[1.05fr_0.95fr]"><div className="overflow-hidden rounded-[30px] border bg-white p-4" style={{ borderColor: props.brand.border }}>{product.image ? <img src={product.image} alt={product.title} className="h-[460px] w-full rounded-[22px] object-cover" /> : <div className="grid h-[460px] place-items-center rounded-[22px] bg-slate-100"><PackageCheck className="h-12 w-12" style={{ color: props.brand.primary }} /></div>}<div className="p-3 pt-6"><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>{product.buyingMode === 'quote' ? 'Quote-led product' : 'Configure and order'}</div><h1 className="mt-3 text-[44px] font-black leading-[0.96] tracking-[-0.065em]">{product.title}</h1>{product.description ? <p className="mt-4 text-[14px] leading-8" style={{ color: props.brand.muted }}>{product.description}</p> : null}{product.price ? <div className="mt-5 text-[18px] font-black" style={{ color: props.brand.primary }}>{product.price}</div> : null}<details className="mt-5 text-[11px]" style={{ color: props.brand.muted }}><summary className="cursor-pointer font-bold">Configured link</summary><div className="mt-2 break-all">{product.shareUrl}</div></details></div></div><div>{props.slots?.purchase}</div></div></div></section></PageShell>;
}

function OptionSummary({ props }: { props: V0ThemeQuotePageProps }) {
  if (!props.selectedOptions.length) return null;
  return <div className="mt-5 grid gap-3">{props.selectedOptions.map((option) => <div key={option.key} className="flex items-center justify-between gap-4 rounded-[16px] border bg-white px-4 py-3 text-[12px]" style={{ borderColor: props.brand.border }}><span style={{ color: props.brand.muted }}>{option.label}</span><strong style={{ color: props.brand.text }}>{option.value}</strong></div>)}</div>;
}

function QuotePageView(props: V0ThemeQuotePageProps) {
  return <PageShell page={props}><section className="py-12"><div className="mx-auto grid w-full max-w-[1200px] gap-7 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>Quote request</div><h1 className="mt-3 text-[44px] font-black leading-[0.96] tracking-[-0.065em]">{props.product?.title || 'Request a print quote'}</h1>{props.product?.description ? <p className="mt-4 text-[14px] leading-8" style={{ color: props.brand.muted }}>{props.product.description}</p> : null}{props.product?.price ? <div className="mt-5 text-[16px] font-black" style={{ color: props.brand.primary }}>{props.product.price}</div> : null}<OptionSummary props={props} />{props.editOptionsHref ? <Link href={props.editOptionsHref} className="mt-5 inline-flex text-[12px] font-black no-underline" style={{ color: props.brand.primary }}>Edit selected options →</Link> : null}</div><div>{props.slots.form}</div></div></section></PageShell>;
}

function CartPageView(props: V0ThemeCartPageProps) {
  return <PageShell page={props}><section className="py-12"><div className="mx-auto w-full max-w-[1240px] px-5 md:px-8"><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>Saved basket</div><h1 className="mt-3 text-[46px] font-black tracking-[-0.065em]">Your print order</h1><p className="mt-4 max-w-[760px] text-[14px] leading-8" style={{ color: props.brand.muted }}>{props.basket.lineCount ? `${props.basket.lineCount} product line${props.basket.lineCount === 1 ? '' : 's'} · ${props.basket.formattedTotal}` : 'Your basket is currently empty.'}</p><div className="mt-8">{props.slots.basket}</div></div></section></PageShell>;
}

function CheckoutStatusPageView(props: V0ThemeCheckoutStatusPageProps) {
  const success = props.status === 'success';
  const Icon = success ? CheckCircle2 : XCircle;
  return <PageShell page={props}><section className="py-16"><div className="mx-auto w-full max-w-[900px] px-5 md:px-8"><div className="rounded-[30px] border bg-white p-10 text-center" style={{ borderColor: props.brand.border }}><Icon className="mx-auto h-12 w-12" style={{ color: success ? '#16a34a' : props.brand.primary }} /><div className="mt-5 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>{success ? 'Payment success' : 'Payment cancelled'}</div><h1 className="mt-3 text-[44px] font-black leading-[0.96] tracking-[-0.065em]">{success ? 'Thank you — your order has been created' : 'Payment was not completed'}</h1><p className="mx-auto mt-4 max-w-[660px] text-[14px] leading-8" style={{ color: props.brand.muted }}>{success ? 'The order is now available inside the print administration system.' : 'You can return to the basket and try payment again.'}</p>{props.orderId ? <div className="mx-auto mt-6 max-w-[520px] rounded-[18px] border p-4 text-sm font-bold" style={{ borderColor: props.brand.border }}>Order reference: {props.orderId}</div> : null}<div className="mt-8 flex flex-wrap justify-center gap-3"><Link href={props.basePath} className="rounded-full px-6 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: props.brand.primary }}>Continue shopping</Link><Link href={`${props.basePath}/cart`} className="rounded-full border px-6 py-3 text-[12px] font-black no-underline" style={{ borderColor: props.brand.border, color: props.brand.text }}>Back to basket</Link></div></div></div></section></PageShell>;
}

export const CANVAS_ROUTE_VIEWS: V0ThemeRouteViews = {
  CategoryPage: CategoryPageView,
  ProductPage: ProductPageView,
  QuotePage: QuotePageView,
  CartPage: CartPageView,
  CheckoutStatusPage: CheckoutStatusPageView,
};
