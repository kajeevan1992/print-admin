import type { ReactNode } from 'react';
import Link from 'next/link';
import type {
  V0ThemeCartPageProps,
  V0ThemeCatalogSearchPageProps,
  V0ThemeCategoryPageProps,
  V0ThemeCheckoutStatusPageProps,
  V0ThemeCustomerAccountPageProps,
  V0ThemeProductPageProps,
  V0ThemeQuotePageProps,
  V0ThemeRouteViews,
} from '../contracts';

type Page = V0ThemeCategoryPageProps | V0ThemeProductPageProps | V0ThemeQuotePageProps | V0ThemeCartPageProps | V0ThemeCheckoutStatusPageProps | V0ThemeCustomerAccountPageProps | V0ThemeCatalogSearchPageProps;
function shell(page: Page, body: ReactNode) {
  return <div style={{ backgroundColor: page.brand.background, color: page.brand.text }}><header className="border-b bg-white" style={{ borderColor: page.brand.border }}><div className="mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between px-5 md:px-8"><Link href={page.basePath} className="text-[24px] font-black no-underline" style={{ color: page.brand.text }}>{page.brand.name}</Link><div className="flex items-center gap-2">{page.chromeSlots?.search}{page.chromeSlots?.account}{page.chromeSlots?.basket || <Link href={`${page.basePath}/cart`} className="text-[12px] font-black no-underline" style={{ color: page.brand.primary }}>Basket</Link>}</div></div></header>{body}</div>;
}

function CategoryPage(props: V0ThemeCategoryPageProps) { return shell(props, <main className="mx-auto w-full max-w-[1320px] px-5 py-12 md:px-8"><h1 className="text-[48px] font-black tracking-[-0.06em]">{props.category.title}</h1><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{props.products.map((product) => <Link key={product.slug} href={product.href} className="rounded-[22px] border bg-white p-5 no-underline" style={{ borderColor: props.brand.border, color: props.brand.text }}><strong>{product.title}</strong><div className="mt-3 text-[12px]" style={{ color: props.brand.primary }}>{product.price || 'View options'}</div></Link>)}</div></main>); }
function ProductPage(props: V0ThemeProductPageProps) { return shell(props, <main className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 py-12 md:px-8 lg:grid-cols-2"><div><h1 className="text-[48px] font-black tracking-[-0.06em]">{props.product?.title || 'Product unavailable'}</h1>{props.product?.description ? <p className="mt-4" style={{ color: props.brand.muted }}>{props.product.description}</p> : null}</div><div>{props.slots?.purchase}</div></main>); }
function QuotePage(props: V0ThemeQuotePageProps) { return shell(props, <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-12 md:px-8 lg:grid-cols-2"><div><h1 className="text-[44px] font-black tracking-[-0.06em]">{props.product?.title || 'Request quote'}</h1></div><div>{props.slots.form}</div></main>); }
function CartPage(props: V0ThemeCartPageProps) { return shell(props, <main className="mx-auto w-full max-w-[1240px] px-5 py-12 md:px-8"><h1 className="text-[44px] font-black tracking-[-0.06em]">Your saved basket</h1><p className="mt-3 text-sm" style={{ color: props.brand.muted }}>{props.basket.lineCount ? `${props.basket.lineCount} product line${props.basket.lineCount === 1 ? '' : 's'} · ${props.basket.formattedTotal}` : 'Your basket is empty.'}</p><div className="mt-8">{props.slots.basket}</div></main>); }
function CheckoutStatusPage(props: V0ThemeCheckoutStatusPageProps) { return shell(props, <main className="mx-auto w-full max-w-[960px] px-5 py-12 md:px-8"><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: props.brand.primary }}>{props.payment.verified ? 'Verified payment status' : 'Secure payment status'}</div><h1 className="mt-3 text-[44px] font-black tracking-[-0.06em]">Payment confirmation</h1><p className="mt-4 text-sm" style={{ color: props.brand.muted }}>{props.payment.message}</p><div className="mt-8">{props.slots.status}</div></main>); }
function CustomerAccountPage(props: V0ThemeCustomerAccountPageProps) { return shell(props, <main className="mx-auto w-full max-w-[1240px] px-5 py-12 md:px-8"><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: props.brand.primary }}>{props.authenticated ? 'Customer workspace' : 'Customer access'}</div><h1 className="mt-3 text-[44px] font-black tracking-[-0.06em]">{props.mode === 'login' ? 'Customer sign in' : props.mode === 'register' ? 'Create customer account' : 'Your account'}</h1><div className="mt-8">{props.slots.account}</div></main>); }
function SearchPage(props: V0ThemeCatalogSearchPageProps) { return shell(props, <main className="mx-auto w-full max-w-[1320px] px-5 py-12 md:px-8"><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: props.brand.primary }}>Catalogue search</div><h1 className="mt-3 text-[44px] font-black tracking-[-0.06em]">{props.query ? `Results for “${props.query}”` : 'Find a print product'}</h1><p className="mt-3 text-sm" style={{ color: props.brand.muted }}>{props.productCount} matching product{props.productCount === 1 ? '' : 's'}</p><div className="mt-8">{props.slots.search}</div></main>); }

export const __THEME_NAME_UPPER___ROUTE_VIEWS: V0ThemeRouteViews = {
  CategoryPage,
  ProductPage,
  QuotePage,
  CartPage,
  CheckoutStatusPage,
  CustomerAccountPage,
  SearchPage,
};
