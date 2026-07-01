import type { ReactNode } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, User } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, storeHref } from './theme-helpers';
import FulfillmentSelector from './FulfillmentSelector';
import HeaderMobileButton from './HeaderMobileButton';
import ChromeFooter from './ChromeFooter';

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{children}</div>;
}
function IconButton({ icon }: { icon: ReactNode }) {
  return <div className="grid h-9 w-9 place-items-center rounded-xl border bg-white" style={{ borderColor: BRAND.line }}>{icon}</div>;
}
function UtilityBar() {
  return <div style={{ backgroundColor: BRAND.black, color: 'white' }}><Shell><div className="flex h-8 items-center justify-between text-[11px] font-medium"><span>Professional print, same day printing, signage and packaging solutions</span><div className="hidden gap-5 sm:flex"><span>Business orders</span><span>Bulk pricing</span><span>Fast turnaround</span><span>Bespoke quote support</span></div></div></Shell></div>;
}
function Header({ currentPath = '/', navItems, storeBase }: { currentPath?: string; navItems: NavItem[]; storeBase: string }) {
  return <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-all duration-300" style={{ borderColor: BRAND.line }}><Shell><div className="grid h-[74px] grid-cols-[auto_1fr_auto] items-center gap-6"><div className="flex items-center gap-3"><HeaderMobileButton navItems={navItems} storeBase={storeBase} /><Link href={storeBase} className="flex items-center gap-0.5 no-underline"><span className="text-[42px] font-black tracking-[-0.055em]" style={{ color: BRAND.primary }}>HOLO</span><span className="text-[42px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>PRINT</span></Link></div><nav className="hidden items-center justify-center gap-4 xl:flex">{navItems.map((item) => { const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`); return <Link key={item.label} href={storeHref(storeBase, item.path)} className="text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: active ? BRAND.primary : BRAND.ink }}>{item.label}</Link>; })}</nav><div className="ml-auto flex items-center gap-2"><FulfillmentSelector compact /><button type="button"><IconButton icon={<Search className="h-4 w-4" />} /></button><Link href={`${storeBase}/login`}><IconButton icon={<User className="h-4 w-4" />} /></Link><Link href={`${storeBase}/cart`} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold no-underline" style={{ borderColor: BRAND.line, color: BRAND.muted, backgroundColor: 'white' }}><ShoppingCart className="h-4 w-4" /><span>£0.00</span></Link></div></div></Shell></header>;
}
export default function StorefrontChrome({ currentPath = '/', children, navItems, storeBase }: { currentPath?: string; children: ReactNode; navItems: NavItem[]; storeBase: string }) {
  return <div style={{ backgroundColor: BRAND.bg, color: BRAND.ink }}><UtilityBar /><Header currentPath={currentPath} navItems={navItems} storeBase={storeBase} />{children}<ChromeFooter storeBase={storeBase} /></div>;
}
