import type { ReactNode } from 'react';
import Link from 'next/link';
import { BRAND, storeHref } from './theme-helpers';
import type { NavItem } from './types';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{children}</div>;
}

function FooterCol({ title, items, storeBase, studio }: { title: string; items: [string, string][]; storeBase: string; studio: boolean }) {
  return <div><div className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: studio ? 'white' : BRAND.ink }}>{title}</div><div className="grid gap-2">{items.map(([label, path]) => <Link key={`${label}-${path}`} href={storeHref(storeBase, path)} className="text-left text-[12px] no-underline" style={{ color: studio ? 'rgba(255,255,255,0.58)' : BRAND.muted }}>{label}</Link>)}</div></div>;
}

function fallbackColumns(): { title: string; items: [string, string][] }[] {
  return [
    { title: 'Products', items: [['All products', '/all-products'], ['Business cards', '/business-cards'], ['Flyers', '/flyers'], ['Posters', '/posters-large-format-prints']] },
    { title: 'Business', items: [['Bulk pricing', '/bespoke-quote'], ['Custom quotes', '/bespoke-quote'], ['Artwork advice', '/bespoke-quote'], ['Delivery support', '/all-products']] },
    { title: 'Support', items: [['Collection points', '/collection-points'], ['Cart', '/cart'], ['Contact', '/bespoke-quote'], ['Quote request', '/bespoke-quote']] },
  ];
}

function columnsFromNavigation(navItems: NavItem[]) {
  const columns = navItems.slice(0, 4).map((item) => {
    const childLinks = item.columns.flatMap((column) => column.links).slice(0, 6);
    return { title: item.label, items: childLinks.length ? childLinks : [[item.label, item.path] as [string, string]] };
  });
  return columns.length ? columns : fallbackColumns();
}

export default function ChromeFooter({ storeBase, settings, navItems, logo, studio = false }: { storeBase: string; settings: StorefrontRuntimeSettings; navItems: NavItem[]; logo: ReactNode; studio?: boolean }) {
  const content = settings.content || {};
  const text = content.text || {};
  const stats = Array.isArray(content.footerStats) && content.footerStats.length
    ? content.footerStats.slice(0, 4).map((item: any) => [String(item.label || item.title || ''), String(item.value || item.count || '')])
    : [['Business printing', '20+'], ['Event signage', '12+'], ['Labels & packaging', '18+'], ['Custom quote support', '1:1']];
  const columns = columnsFromNavigation(navItems);
  const newsletterAction = String(content.newsletterAction || '').trim();
  const newsletterText = String(text.newsletterText || content.newsletterText || 'Get print updates, offers and useful ideas.');
  const description = String(text.footerDescription || content.footerDescription || `${settings.storeName} online print storefront.`);
  const copyright = String(text.copyright || content.copyright || `© ${new Date().getFullYear()} ${settings.storeName}. All rights reserved.`);
  const muted = studio ? 'rgba(255,255,255,0.58)' : BRAND.muted;
  const ink = studio ? 'white' : BRAND.ink;
  const line = studio ? 'rgba(255,255,255,0.12)' : BRAND.line;

  return <footer className="mt-8 border-t" style={{ borderColor: line, backgroundColor: studio ? '#111315' : 'white' }}>
    <div className="border-b py-3" style={{ borderColor: line, backgroundColor: studio ? '#1b1e21' : BRAND.primary }}><Shell><div className="flex flex-col items-center justify-between gap-3 text-[12px] font-semibold text-white md:flex-row"><span>{newsletterText}</span>{newsletterAction ? <form action={newsletterAction} method="post" className="flex gap-2"><input name="email" type="email" required className="h-9 w-[250px] rounded-full border-0 bg-white px-4 text-[12px] text-black outline-none" placeholder="Email address" /><button className="rounded-full px-4 text-[12px] font-bold text-white" style={{ backgroundColor: BRAND.primary }}>Subscribe</button></form> : null}</div></Shell></div>
    <Shell>
      <div className="grid gap-3 py-5 md:grid-cols-4">{stats.map(([item, count]) => <div key={`${item}-${count}`} className="rounded-[18px] border px-4 py-3" style={{ borderColor: line, color: muted }}><div className="text-[10px] font-bold uppercase tracking-[0.14em]">{item}</div><div className="mt-1 text-[16px] font-black" style={{ color: ink }}>{count}</div></div>)}</div>
      <div className="grid gap-8 py-10 md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr]"><div><Link href={storeBase} className="flex items-center gap-0.5 no-underline">{logo}</Link><p className="mt-4 max-w-[360px] text-[12px] leading-7" style={{ color: muted }}>{description}</p></div>{columns.map((column) => <FooterCol key={column.title} storeBase={storeBase} title={column.title} items={column.items} studio={studio} />)}</div>
      <div className="flex flex-col gap-2 border-t py-4 text-[11px] md:flex-row md:items-center md:justify-between" style={{ borderColor: line, color: muted }}><span>{copyright}</span><div className="flex gap-4"><Link href={storeHref(storeBase, '/all-products')}>All products</Link><Link href={storeHref(storeBase, '/bespoke-quote')}>Custom quote</Link><Link href={storeHref(storeBase, '/cart')}>Cart</Link></div></div>
    </Shell>
  </footer>;
}
