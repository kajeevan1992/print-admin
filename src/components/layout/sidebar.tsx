'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { adminSidebarNavigation, type AdminSidebarNavigationItem, type AdminRole } from '@/config/admin-navigation';

const BUILD55_LINK = { label: 'Mail QA', href: '/email-order-notification-qa', iconKey: 'Mail', order: 35 };
const BUILD56_LINK = { label: 'Launch Guard', href: '/admin-launch-security', iconKey: 'ShieldCheck', order: 36 };
const BUILD57_LINK = { label: 'Data Check', href: '/data-continuity', iconKey: 'ShieldCheck', order: 37 };
const BUILD58_LINK = { label: 'Final Check', href: '/final-check', iconKey: 'ShieldCheck', order: 38 };

const SUPER_ADMIN_NAVIGATION: AdminSidebarNavigationItem[] = [
  { label: 'Super Admin', href: '/super-admin', iconKey: 'ShieldCheck', order: 10 },
  { label: 'Reports', href: '/reports', iconKey: 'BarChart3', order: 20 },
  {
    label: 'Platform Settings', iconKey: 'Settings', order: 30, children: [
      { label: 'Tenant Control', href: '/tenant-control', iconKey: 'Building2', order: 10 },
      { label: 'Database Manager', href: '/database-manager', iconKey: 'DatabaseBackup', order: 20 },
      { label: 'Organizations', href: '/organizations', iconKey: 'Building2', order: 30 },
      { label: 'Merchant Accounts', href: '/merchant-accounts', iconKey: 'CreditCard', order: 40 },
      { label: 'Admin Users', href: '/admin-users', iconKey: 'Shield', order: 50 },
      { label: 'Licensing Center', href: '/licensing-center', iconKey: 'KeyRound', order: 60 },
      { label: 'API Access', href: '/api-access', iconKey: 'KeyRound', order: 70 },
      { label: 'API Keys', href: '/api-keys', iconKey: 'KeyRound', order: 80 },
    ]
  },
  {
    label: 'Launch Control', iconKey: 'Rocket', order: 40, children: [
      { label: 'Launch Readiness', href: '/launch-readiness', iconKey: 'ShieldCheck', order: 10 },
      { label: 'Storefront Order Test', href: '/storefront-order-test', iconKey: 'ShoppingCart', order: 20 },
      { label: 'Payment Checkout QA', href: '/payment-checkout-qa', iconKey: 'CreditCard', order: 30 },
      BUILD55_LINK,
      BUILD56_LINK,
      BUILD57_LINK,
      BUILD58_LINK,
      { label: 'SEO Live Readiness', href: '/seo-live-readiness', iconKey: 'ShieldCheck', order: 40 },
    ]
  },
  {
    label: 'Support', iconKey: 'LifeBuoy', order: 50, children: [
      { label: 'Support', href: '/support', iconKey: 'LifeBuoy', order: 10 },
      { label: 'Knowledge Base', href: '/knowledge-base', iconKey: 'BookOpen', order: 20 },
      { label: 'Error Log', href: '/error-log', iconKey: 'AlertTriangle', order: 30 },
    ]
  },
];

function itemIsActive(pathname: string, href?: string) {
  return Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
}

function groupIsActive(pathname: string, item: AdminSidebarNavigationItem) {
  return Boolean(item.children?.some((child) => itemIsActive(pathname, child.href)));
}

function roleAllowed(item: { roles?: AdminRole[] }, role?: string) {
  return !item.roles?.length || !role || item.roles.includes(role as AdminRole);
}

function addLaunchLinks(items: AdminSidebarNavigationItem[]) {
  return items.map((item) => {
    if (item.label !== 'Launch Operations' || !item.children?.length) return item;
    const next = [...item.children];
    for (const link of [BUILD55_LINK, { ...BUILD56_LINK, order: 19.5 }, { ...BUILD57_LINK, order: 19.75 }, { ...BUILD58_LINK, order: 19.9 }]) {
      if (!next.some((child) => child.href === link.href)) next.push(link);
    }
    return { ...item, children: next.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) };
  });
}

function tenantNavigation(role?: string) {
  const items = adminSidebarNavigation
    .filter((item) => !item.hidden && roleAllowed(item, role))
    .map((item) => ({ ...item, children: item.children?.filter((child) => !child.hidden && roleAllowed(child, role)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) }))
    .filter((item) => item.href || item.children?.length)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return addLaunchLinks(items);
}

function visibleNavigation(role?: string) {
  if (role === 'super_admin') return SUPER_ADMIN_NAVIGATION;
  return tenantNavigation(role);
}

function NavItem({ item, pathname }: { item: AdminSidebarNavigationItem; pathname: string }) {
  const hasChildren = Boolean(item.children?.length);
  const active = itemIsActive(pathname, item.href) || groupIsActive(pathname, item);

  if (!item.href && hasChildren) {
    return <div className="space-y-1"><div className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted', active && 'bg-white/[0.04] text-white')}><FileText size={16} /><span>{item.label}</span></div><div className="ml-5 space-y-1 border-l border-white/8 pl-3">{item.children?.map((child) => <Link key={`${item.label}-${child.label}`} href={child.href as any} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-textMuted transition hover:bg-white/[0.04] hover:text-white', itemIsActive(pathname, child.href) && 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]')}><FileText size={14} /><span>{child.label}</span></Link>)}</div></div>;
  }

  if (!item.href) return <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted"><FileText size={16} /><span>{item.label}</span></div>;
  return <Link href={item.href as any} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted transition hover:bg-white/[0.04] hover:text-white', active && 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]')}><FileText size={16} /><span>{item.label}</span></Link>;
}

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  const authContext = useAuth();
  const session = authContext?.session ?? authContext?.auth?.session ?? null;
  const navItems = useMemo(() => visibleNavigation(session?.role), [session?.role]);

  return (
    <aside className="hidden h-screen w-[292px] shrink-0 border-r border-white/6 bg-[linear-gradient(180deg,rgba(11,18,32,0.96)_0%,rgba(7,11,22,0.98)_100%)] p-4 lg:block">
      <div className="mb-5 rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_45%),rgba(15,23,42,0.88)] p-4"><p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Print SaaS Admin</p><p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{session?.role === 'super_admin' ? 'SaaS Owner Console' : 'Unified Control Center'}</p><p className="mt-1 text-[13px] text-textMuted">{session?.role === 'super_admin' ? 'Platform, tenant, rollout, and launch controls.' : 'Precision controls for catalog, storefront, and operations.'}</p></div>
      <nav className="space-y-1 overflow-y-auto pb-10">{navItems.map((item) => <NavItem key={item.label} item={item} pathname={pathname} />)}</nav>
      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">{session?.role === 'super_admin' ? 'SaaS owner access' : 'Tenant workspace'}</p><p className="mt-2 text-sm font-semibold text-white">{session?.name ?? 'Guest'}</p><p className="mt-1 text-xs text-textMuted">{session?.company ?? 'Print Admin'}</p><div className="mt-3 flex gap-2"><Link href="/logout" className="flex-1 rounded-xl border border-white/8 px-3 py-2 text-center text-xs text-text transition hover:bg-white/[0.05]"><LogOut className="mr-1 inline h-3 w-3" />Logout</Link></div></div>
    </aside>
  );
}
