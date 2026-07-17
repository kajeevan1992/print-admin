import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import type { V0ThemeHomeProps } from '../contracts';

export default function __THEME_NAME_UPPER__HomePage(props: V0ThemeHomeProps) {
  const hero = props.sections.find((section) => section.type === 'hero');
  const products = props.products.slice(0, 6);
  const title = String(hero?.title || `${props.brand.name} online printing`).trim();
  const body = String(hero?.subtitle || hero?.body || '').trim();

  return <div style={{ backgroundColor: props.brand.background, color: props.brand.text }} data-v0-theme-package="__THEME_SLUG__">
    <header className="border-b bg-white" style={{ borderColor: props.brand.border }}>
      <div className="mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between gap-6 px-5 md:px-8">
        <Link href={props.basePath} className="text-[24px] font-black no-underline" style={{ color: props.brand.text }}>{props.brand.name}</Link>
        <nav className="hidden gap-5 lg:flex">{props.navigation.map((item) => <Link key={item.href} href={item.href} className="text-[13px] font-semibold no-underline" style={{ color: item.active ? props.brand.primary : props.brand.text }}>{item.label}</Link>)}</nav>
        <div className="flex items-center gap-2">{props.chromeSlots?.search}{props.chromeSlots?.account}{props.chromeSlots?.basket || <Link href={`${props.basePath}/cart`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-black no-underline" style={{ borderColor: props.brand.border, color: props.brand.text }}><ShoppingBag className="h-4 w-4" />Basket</Link>}</div>
      </div>
    </header>

    <main>
      <section className="border-b" style={{ borderColor: props.brand.border }}><div className="mx-auto w-full max-w-[1320px] px-5 py-16 md:px-8 lg:py-24"><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: props.brand.primary }}>__THEME_NAME__</div><h1 className="mt-4 max-w-[820px] text-[52px] font-black leading-[0.92] tracking-[-0.07em] sm:text-[72px]">{title}</h1>{body ? <p className="mt-6 max-w-[660px] text-[15px] leading-8" style={{ color: props.brand.muted }}>{body}</p> : null}<Link href={`${props.basePath}/all-products`} className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[12px] font-black text-white no-underline" style={{ backgroundColor: props.brand.primary }}>Browse products<ArrowRight className="h-4 w-4" /></Link></div></section>
      <section className="py-12"><div className="mx-auto w-full max-w-[1320px] px-5 md:px-8"><h2 className="text-[36px] font-black tracking-[-0.055em]">Popular products</h2><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <Link key={product.slug} href={product.href} className="overflow-hidden rounded-[22px] border bg-white no-underline" style={{ borderColor: props.brand.border }}><div className="aspect-[4/3] bg-slate-100">{product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover" /> : null}</div><div className="p-5"><h3 className="text-[18px] font-black" style={{ color: props.brand.text }}>{product.title}</h3><div className="mt-3 text-[13px] font-black" style={{ color: props.brand.primary }}>{product.price || 'View options'}</div></div></Link>)}</div></div></section>
    </main>
  </div>;
}
