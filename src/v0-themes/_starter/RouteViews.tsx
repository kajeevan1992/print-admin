import type { ReactNode } from 'react';
import Link from 'next/link';
import type {
  V0ThemeCartPageProps,
  V0ThemeCategoryPageProps,
  V0ThemeCheckoutStatusPageProps,
  V0ThemeProductPageProps,
  V0ThemeQuotePageProps,
  V0ThemeRouteViews,
} from '../contracts';

function shell(page: V0ThemeCategoryPageProps | V0ThemeProductPageProps | V0ThemeQuotePageProps | V0ThemeCartPageProps | V0ThemeCheckoutStatusPageProps, body: ReactNode) {
  return <div style={{ backgroundColor: page.brand.background, color: page.brand.text }}><header className="border-b bg-white" style={{ borderColor: page.brand.border }}><div className="mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between px-5 md:px-8"><Link href={page.basePath} className="text-[24px] font-black no-underline" style={{ color: page.brand.text }}>{page.brand.name}</Link><Link href={`${page.basePath}/cart`} className="text-[12px] font-black no-underline" style={{ color: page.brand.primary }}>Basket</Link></div></header>{body}</div>;
}

function CategoryPage(props: V0ThemeCategoryPageProps) {
  return shell(props, <main className="mx-auto w-full max-w-[1320px] px-5 py-12 md:px-8"><h1 className="text-[48px] font-black tracking-[-0.06em]">{props.category.title}</h1><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{props.products.map((product) => <Link key={product.slug} href={product.href} className="rounded-[22px] border bg-white p-5 no-underline" style={{ borderColor: props.brand.border, color: props.brand.text }}><strong>{product.title}</strong><div className="mt-3 text-[12px]" style={{ color: props.brand.primary }}>{product.price || 'View options'}</div></Link>)}</div></main>);
}

function ProductPage(props: V0ThemeProductPageProps) {
  return shell(props, <main className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 py-12 md:px-8 lg:grid-cols-2"><div><h1 className="text-[48px] font-black tracking-[-0.06em]">{props.product?.title || 'Product unavailable'}</h1>{props.product?.description ? <p className="mt-4" style={{ color: props.brand.muted }}>{props.product.description}</p> : null}</div><div>{props.slots?.purchase}</div></main>);
}

function QuotePage(props: V0ThemeQuotePageProps) {
  return shell(props, <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-12 md:px-8 lg:grid-cols-2"><div><h1 className="text-[44px] font-black tracking-[-0.06em]">{props.product?.title || 'Request quote'}</h1></div><div>{props.slots.form}</div></main>);
}

function CartPage(props: V0ThemeCartPageProps) {
  return shell(props, <main className="mx-auto w-full max-w-[1100px] px-5 py-12 md:px-8"><h1 className="text-[44px] font-black tracking-[-0.06em]">{props.product ? `${props.product.title} added to basket` : 'Your basket'}</h1><div className="mt-8">{props.slots?.checkout}</div></main>);
}

function CheckoutStatusPage(props: V0ThemeCheckoutStatusPageProps) {
  return shell(props, <main className="mx-auto w-full max-w-[900px] px-5 py-16 text-center md:px-8"><h1 className="text-[44px] font-black tracking-[-0.06em]">{props.status === 'success' ? 'Order created' : 'Payment cancelled'}</h1>{props.orderId ? <p className="mt-4">Order reference: {props.orderId}</p> : null}</main>);
}

export const __THEME_NAME_UPPER___ROUTE_VIEWS: V0ThemeRouteViews = {
  CategoryPage,
  ProductPage,
  QuotePage,
  CartPage,
  CheckoutStatusPage,
};
