import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { V0ThemeBrand, V0ThemeNavigationItem } from '../contracts';

type DropdownNavigationItem = V0ThemeNavigationItem & {
  description?: string;
  image?: string;
  groups?: Array<{ title: string; links: V0ThemeNavigationItem[] }>;
};

export function HOLOV2Navigation({ navigation, brand }: { navigation: V0ThemeNavigationItem[]; brand: V0ThemeBrand }) {
  const items = navigation as DropdownNavigationItem[];
  return <nav className="hidden items-center gap-1 lg:flex" aria-label="Storefront navigation">
    {items.map((item) => {
      const groups = item.groups || [];
      if (!groups.length) {
        return <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-[13px] font-semibold no-underline transition hover:bg-slate-100" style={{ color: item.active ? brand.primary : brand.text }}>{item.label}</Link>;
      }
      return <div key={item.href} className="group relative">
        <Link href={item.href} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-semibold no-underline transition hover:bg-slate-100" style={{ color: item.active ? brand.primary : brand.text }} aria-haspopup="true">
          {item.label}<ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" />
        </Link>
        <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-2 w-[min(760px,calc(100vw-3rem))] -translate-x-1/2 translate-y-2 rounded-[22px] border bg-white p-5 opacity-0 shadow-2xl transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100" style={{ borderColor: brand.border }}>
          <div className={`grid gap-5 ${groups.length > 2 ? 'grid-cols-3' : groups.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {groups.map((group) => <section key={group.title}>
              <h3 className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: brand.primary }}>{group.title}</h3>
              <div className="mt-3 grid gap-1">
                {group.links.map((link) => <Link key={`${group.title}-${link.href}`} href={link.href} className="rounded-xl px-3 py-2 text-[13px] font-semibold no-underline transition hover:bg-slate-50" style={{ color: link.active ? brand.primary : brand.text }}>{link.label}</Link>)}
              </div>
            </section>)}
          </div>
          {item.description ? <p className="mt-4 border-t pt-4 text-[12px] leading-5" style={{ borderColor: brand.border, color: brand.muted }}>{item.description}</p> : null}
        </div>
      </div>;
    })}
  </nav>;
}
