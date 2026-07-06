import StorefrontChrome from './StorefrontChrome';
import type { NavItem } from './types';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';

export default function CheckoutStatusPage({ storeBase, navItems, status, searchParams = {} }: { storeBase: string; navItems: NavItem[]; status: 'success' | 'cancel'; searchParams?: Record<string, string> }) {
  const isSuccess = status === 'success';
  const orderId = searchParams.orderId || '';
  return <StorefrontChrome currentPath={isSuccess ? '/checkout-success' : '/checkout-cancel'} navItems={navItems} storeBase={storeBase}><section className="py-10"><Shell><div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: BRAND.line }}><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{isSuccess ? 'Payment success' : 'Payment cancelled'}</div><h1 className="mt-4 text-[38px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>{isSuccess ? 'Thank you — your order has been created' : 'Payment was not completed'}</h1><p className="mt-3 max-w-[720px] text-sm leading-7" style={{ color: BRAND.muted }}>{isSuccess ? 'Your payment has been sent to Stripe and the order is now visible inside the admin order system.' : 'No problem. You can return to the cart and try payment again.'}</p>{orderId ? <div className="mt-5 rounded-[20px] border p-4 text-sm font-bold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Order reference: {orderId}</div> : null}<div className="mt-7 flex flex-wrap gap-3"><a href={storeBase} className="rounded-full px-5 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: BRAND.primary }}>Continue shopping</a><a href={`${storeBase}/cart`} className="rounded-full border px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>Back to cart</a></div></div></Shell></section></StorefrontChrome>;
}
