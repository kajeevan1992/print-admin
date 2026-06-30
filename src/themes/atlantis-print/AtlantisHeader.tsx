import Link from 'next/link';
import { ChevronDown, MapPin, Search, ShoppingCart, User } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, normalPath } from './theme-nav';

function href(storeBase: string, path: string) {
  const next = normalPath(path);
  return next === '/' ? storeBase : `${storeBase}${next}`;
}

export default function AtlantisHeader({ storeBase, currentPath, navItems }: { storeBase: string; currentPath: string; navItems: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: BRAND.line }}>
      <div style={{ backgroundColor: BRAND.black, color: 'white' }}>
        <div className="mx-auto flex h-8 max-w-[1360px] items-center justify-between px-4 text-[11px] font-medium sm:px-6 lg:px-8">
          <span>Professional print, same day printing, signage and packaging solutions</span>
          <div className="hidden gap-5 sm:flex"><span>Business orders</span><span>Bulk pricing</span><span>Fast turnaround</span><span>Bespoke quote support</span></div>
        </div>
      </div>
      <div className="mx-auto grid h-[74px] max-w-[1360px] grid-cols-[auto_1fr_auto] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href={storeBase} className="flex items-center gap-0.5 no-underline">
          <span className="text-[42px] font-black tracking-[-0.055em]" style={{ color: BRAND.primary }}>HOLO</span>
          <span className="text-[42px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>PRINT</span>
        </Link>
        <nav className="hidden items-center justify-center gap-4 xl:flex">
          {navItems.map((item) => {
            const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            const hasDropdown = item.columns?.some((column) => column.links?.length);
            return (
              <div className="group flex h-[74px] items-center" key={item.label}>
                <Link href={href(storeBase, item.path)} className="inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: active ? BRAND.primary : BRAND.ink }}>
                  {item.label}{hasDropdown ? <ChevronDown className="h-4 w-4 transition group-hover:rotate-180" /> : null}
                </Link>
                {hasDropdown ? (
                  <div className="absolute left-[calc((100vw-1360px)/2+32px)] right-[calc((100vw-1360px)/2+32px)] top-[106px] hidden group-hover:block">
                    <div className="rounded-[22px] border bg-white p-5 shadow-[0_34px_100px_rgba(0,0,0,0.13)]" style={{ borderColor: BRAND.line }}>
                      <div className="grid grid-cols-[270px_1fr_1fr_1fr] gap-6">
                        <div className="rounded-[20px] border p-4" style={{ borderColor: BRAND.line, background: 'linear-gradient(180deg,#FBFDFE 0%,#F4F9FB 100%)' }}>
                          <img src={item.feature.image} alt={item.feature.title} className="h-36 w-full rounded-[12px] object-cover" />
                          <div className="mt-4 text-[18px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{item.feature.title}</div>
                          <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.feature.body}</p>
                        </div>
                        {item.columns.map((column) => <div key={column.title}><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{column.title}</div><div className="grid gap-1">{column.links.map(([label, path]) => <Link key={`${label}-${path}`} href={href(storeBase, path)} className="rounded-xl px-3 py-2 text-[12px] font-medium no-underline hover:bg-[#F6F7F8]" style={{ color: BRAND.ink }}>{label}</Link>)}</div></div>)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`${storeBase}/collection-points`} className="hidden h-9 items-center gap-2 rounded-xl border bg-white px-4 text-[12px] font-black no-underline lg:inline-flex" style={{ borderColor: BRAND.line, color: BRAND.ink }}><MapPin className="h-4 w-4" style={{ color: BRAND.primary }} />Select store</Link>
          <button className="grid h-9 w-9 place-items-center rounded-xl border bg-white" style={{ borderColor: BRAND.line }}><Search className="h-4 w-4" /></button>
          <Link href={`${storeBase}/login`} className="grid h-9 w-9 place-items-center rounded-xl border bg-white" style={{ borderColor: BRAND.line }}><User className="h-4 w-4" /></Link>
          <Link href={`${storeBase}/cart`} className="flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold no-underline" style={{ borderColor: BRAND.line, color: BRAND.muted }}><ShoppingCart className="h-4 w-4" />£0.00</Link>
        </div>
      </div>
    </header>
  );
}
