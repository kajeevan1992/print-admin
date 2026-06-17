'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { adminSidebarNavigation, type AdminSidebarNavigationItem } from '@/config/admin-navigation';

function itemIsActive(pathname: string, href?: string) {
  return Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
}

function groupIsActive(pathname: string, item: AdminSidebarNavigationItem) {
  return Boolean(item.children?.some((child) => itemIsActive(pathname, child.href)));
}

function visibleNavigation() {
  return adminSidebarNavigation
    .filter((item) => !item.hidden)
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => !child.hidden).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    }))
    .filter((item) => item.href || item.children?.length)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function NavItem({ item, pathname }: { item: AdminSidebarNavigationItem; pathname: string }) {
  const hasChildren = Boolean(item.children?.length);
  const active = itemIsActive(pathname, item.href) || groupIsActive(pathname, item);

  if (!item.href && hasChildren) {
    return (
      <div className="space-y-1">
        <div className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted', active && 'bg-white/[0.04] text-white')}>
          <FileText size={16} />
          <span>{item.label}</span>
        </div>
        <div className="ml-5 space-y-1 border-l border-white/8 pl-3">
          {item.children?.map((child) => (
            <Link key={`${item.label}-${child.label}`} href={child.href as any} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-textMuted transition hover:bg-white/[0.04] hover:text-white', itemIsActive(pathname, child.href) && 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]')}>
              <FileText size={14} />
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!item.href) return <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted"><FileText size={16} /><span>{item.label}</span></div>;
  return <Link href={item.href as any} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted transition hover:bg-white/[0.04] hover:text-white', active && 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]')}><FileText size={16} /><span>{item.label}</span></Link>;
}

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  const authContext = useAuth();
  const session = authContext?.session ?? authContext?.auth?.session ?? null;
  const navItems = useMemo(() => visibleNavigation(), []);

  return (
    <aside className="hidden h-screen w-[292px] shrink-0 border-r border-white/6 bg-[linear-gradient(180deg,rgba(11,18,32,0.96)_0%,rgba(7,11,22,0.98)_100%)] p-4 lg:block">
      <div className="mb-5 rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_45%),rgba(15,23,42,0.88)] p-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Print SaaS Admin</p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{session?.role === 'super_admin' ? 'SaaS Owner Console' : 'Unified Control Center'}</p>
        <p className="mt-1 text-[13px] text-textMuted">Precision controls for catalog, storefront, and operations.</p>
      </div>
      <nav className="space-y-1 overflow-y-auto pb-10">{navItems.map((item) => <NavItem key={item.label} item={item} pathname={pathname} />)}</nav>
      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">Workspace</p>
        <p className="mt-2 text-sm font-semibold text-white">{session?.name ?? 'Guest'}</p>
        <p className="mt-1 text-xs text-textMuted">{session?.company ?? 'Print Admin'}</p>
        <div className="mt-3 flex gap-2"><Link href="/logout" className="flex-1 rounded-xl border border-white/8 px-3 py-2 text-center text-xs text-text transition hover:bg-white/[0.05]"><LogOut className="mr-1 inline h-3 w-3" />Logout</Link></div>
      </div>
    </aside>
  );
}
