'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Clock3, Search, Store, Zap } from 'lucide-react';

const RECENT_ROUTES_KEY = 'print-admin.recent-routes';
const DASHBOARD_STORE_KEY = 'print-admin.dashboard.store';

const routeLabelMap: Record<string, string> = {
  '/': 'Dashboard',
  '/workspace': 'Workspace',
  '/products': 'Products',
  '/categories': 'Categories',
  '/collections': 'Collections',
  '/tags': 'Tags',
  '/orders': 'Orders',
  '/quotes': 'Quotations',
  '/customers': 'Customers',
  '/channels': 'Print Store',
  '/themes': 'Site Theme',
  '/content': 'Content',
  '/reports': 'Reports',
  '/settings': 'General Settings',
  '/support': 'Support',
  '/notifications': 'Notifications',
  '/saved-views': 'Saved Views',
  '/command-center': 'Command Center'
};

const quickLinks = [
  { href: '/workspace', label: 'Workspace' },
  { href: '/products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
  { href: '/customers', label: 'Customers' },
  { href: '/content', label: 'Content' },
  { href: '/reports', label: 'Reports' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/command-center', label: 'Command Center' }
];

type RecentRoute = {
  href: string;
  label: string;
};

export function Topbar() {
  const pathname = usePathname();
  const [storeId, setStoreId] = useState('store-1');
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([]);
  const [linksOpen, setLinksOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  useEffect(() => {
    const savedStore = window.localStorage.getItem(DASHBOARD_STORE_KEY);
    if (savedStore) setStoreId(savedStore);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const label = routeLabelMap[pathname] ?? (pathname.replace(/\//g, ' ').trim() || 'Dashboard');
    const next = [{ href: pathname, label }, ...recentRoutes.filter((item) => item.href !== pathname)].slice(0, 6);
    setRecentRoutes(next);
    window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
    setLinksOpen(false);
    setRecentOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const raw = window.localStorage.getItem(RECENT_ROUTES_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RecentRoute[];
      if (Array.isArray(parsed)) setRecentRoutes(parsed);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const storeLabel = useMemo(() => {
    if (storeId === 'store-2') return 'Lakeside Apparel';
    if (storeId === 'store-3') return 'Northwind Print Hub';
    return 'Harbor Print Co.';
  }, [storeId]);

  return (
    <header className="sticky top-0 z-40 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel p-3">
      <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-lg border border-border bg-panelMuted px-3 py-2">
        <Search size={14} className="text-textMuted" />
        <input placeholder="Search products, orders, users..." className="w-full bg-transparent text-sm outline-none" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-textMuted lg:flex">
          <Store size={15} />
          <span className="font-medium text-text">{storeLabel}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setLinksOpen((value) => !value);
              setRecentOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-panelMuted"
          >
            <Zap size={15} />
            Quick links
            <ChevronDown size={14} />
          </button>
          {linksOpen ? (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-panel p-2 shadow-card">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-panelMuted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setRecentOpen((value) => !value);
              setLinksOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-panelMuted"
          >
            <Clock3 size={15} />
            Recent
            <ChevronDown size={14} />
          </button>
          {recentOpen ? (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-panel p-2 shadow-card">
              {recentRoutes.length > 0 ? (
                recentRoutes.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-panelMuted"
                  >
                    {item.label}
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-textMuted">No recent pages yet.</p>
              )}
            </div>
          ) : null}
        </div>

        <Link href="/notifications" className="rounded-lg border border-border p-2 hover:bg-panelMuted">
          <Bell size={16} />
        </Link>
        <div className="rounded-lg border border-border px-3 py-2 text-sm">Alex Rivera · Admin</div>
      </div>
    </header>
  );
}
