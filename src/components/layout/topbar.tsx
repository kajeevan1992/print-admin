'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Clock3, Command, Search, Sparkles, Store, Zap } from 'lucide-react';

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
  '/command-center': 'Command Center',
  '/product-launch-wizard': 'Product Wizard'
};

const quickLinks = [
  { href: '/workspace', label: 'Workspace', icon: Sparkles },
  { href: '/product-launch-wizard', label: 'Product Wizard', icon: Command },
  { href: '/products', label: 'Products', icon: Zap },
  { href: '/orders', label: 'Orders', icon: Zap },
  { href: '/content', label: 'Content', icon: Zap },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/command-center', label: 'Command Center', icon: Command }
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
    const savedRecent = window.localStorage.getItem(RECENT_ROUTES_KEY);
    if (!savedRecent) return;
    try {
      const parsed = JSON.parse(savedRecent) as RecentRoute[];
      if (Array.isArray(parsed)) setRecentRoutes(parsed);
    } catch {
      // ignore malformed cache
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const label = routeLabelMap[pathname] ?? (pathname.replace(/\//g, ' ').trim() || 'Dashboard');
    setRecentRoutes((prev) => {
      const next = [{ href: pathname, label }, ...prev.filter((item) => item.href !== pathname)].slice(0, 6);
      window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
      return next;
    });
    setLinksOpen(false);
    setRecentOpen(false);
  }, [pathname]);

  const stores = useMemo(
    () => [
      { id: 'store-1', name: 'Harbor Print Co.' },
      { id: 'store-2', name: 'Trade Portal' },
      { id: 'store-3', name: 'Northwind B2B' }
    ],
    []
  );

  const activeStore = stores.find((store) => store.id === storeId) ?? stores[0];

  return (
    <header className="mb-7 rounded-[26px] border border-white/6 bg-[linear-gradient(180deg,rgba(11,18,32,0.88)_0%,rgba(9,14,28,0.82)_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-panelMuted/80 px-4">
          <Search size={16} className="text-textMuted" />
          <input
            placeholder="Search products, orders, users..."
            className="w-full bg-transparent text-[14px] text-text outline-none placeholder:text-textMuted/70"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white">
            <Store size={15} className="text-accentAlt" />
            {activeStore.name}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLinksOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white transition hover:bg-white/[0.05]"
            >
              <Zap size={15} className="text-accentAlt" />
              Quick links
              <ChevronDown size={14} className="text-textMuted" />
            </button>
            {linksOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/8 bg-panel/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text transition hover:bg-white/[0.05]"
                    >
                      <Icon size={14} className="text-accentAlt" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setRecentOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white transition hover:bg-white/[0.05]"
            >
              <Clock3 size={15} className="text-textMuted" />
              Recent
              <ChevronDown size={14} className="text-textMuted" />
            </button>
            {recentOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/8 bg-panel/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                {recentRoutes.length > 0 ? (
                  recentRoutes.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-xl px-3 py-2.5 text-[13px] text-text transition hover:bg-white/[0.05]"
                    >
                      {item.label}
                    </Link>
                  ))
                ) : (
                  <p className="px-3 py-2 text-[13px] text-textMuted">No recent pages yet.</p>
                )}
              </div>
            ) : null}
          </div>

          <Link href="/notifications" className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-text transition hover:bg-white/[0.05]">
            <Bell size={15} />
          </Link>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white">Alex Rivera · Admin</div>
        </div>
      </div>
    </header>
  );
}
