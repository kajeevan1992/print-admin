'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Clock3, Command, Search, Shield, Sparkles, Store, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';

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
  '/product-launch-wizard': 'Product Wizard',
  '/store-launch-wizard': 'Store Wizard',
  '/pricing-command': 'Pricing Command',
  '/artwork-intelligence': 'Artwork Intelligence',
  '/dispatch-center': 'Dispatch Center',
  '/product-builder-studio': 'Product Builder',
  '/config-templates': 'Config Templates',
  '/materials-library': 'Materials Library',
  '/finish-library': 'Finish Library',
  '/printer-profiles': 'Printer Profiles',
  '/pricing-engine-lab': 'Pricing Engine',
  '/product-system-console': 'Product System Console',
  '/product-rules-lab': 'Product Rules Lab',
  '/production-routing-lab': 'Production Routing',
  '/option-sets': 'Option Sets',
  '/artwork-preflight-studio': 'Artwork Preflight',
  '/super-admin': 'Super Admin',
  '/tenant-control': 'Tenant Control',
  '/licensing-center': 'Licensing Center',
  '/admin-users': 'Admin Users'
};

const tenantQuickLinks = [
  { href: '/workspace', label: 'Workspace', icon: Sparkles },
  { href: '/product-launch-wizard', label: 'Product Wizard', icon: Command },
  { href: '/products', label: 'Products', icon: Zap },
  { href: '/orders', label: 'Orders', icon: Zap },
  { href: '/content', label: 'Content', icon: Zap },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/command-center', label: 'Command Center', icon: Command },
  { href: '/store-launch-wizard', label: 'Store Wizard', icon: Sparkles },
  { href: '/pricing-command', label: 'Pricing Command', icon: Zap },
  { href: '/artwork-intelligence', label: 'Artwork Intelligence', icon: Bell },
  { href: '/dispatch-center', label: 'Dispatch Center', icon: Store },
  { href: '/product-builder-studio', label: 'Product Builder', icon: Command },
  { href: '/config-templates', label: 'Config Templates', icon: Sparkles },
  { href: '/option-sets', label: 'Option Sets', icon: Sparkles },
  { href: '/product-rules-lab', label: 'Product Rules Lab', icon: Sparkles },
  { href: '/production-routing-lab', label: 'Production Routing', icon: Store },
  { href: '/artwork-preflight-studio', label: 'Artwork Preflight', icon: Bell },
  { href: '/pricing-engine-lab', label: 'Pricing Engine', icon: Zap }
];

const ownerQuickLinks = [
  { href: '/super-admin', label: 'Overview', icon: Shield },
  { href: '/tenant-control', label: 'Tenant Control', icon: Store },
  { href: '/licensing-center', label: 'Licensing Center', icon: Shield },
  { href: '/admin-users', label: 'Admin Users', icon: Bell },
  { href: '/reports', label: 'Reports', icon: Zap },
  { href: '/support-tickets', label: 'Support Hub', icon: Bell }
];

type RecentRoute = {
  href: string;
  label: string;
};

export function Topbar() {
  const pathname = usePathname();
  const { session } = useAuth();
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
  const quickLinks = session?.role === 'super_admin' ? ownerQuickLinks : tenantQuickLinks;
  const searchPlaceholder = session?.role === 'super_admin' ? 'Search tenants, licences, deployments...' : 'Search products, orders, users...';

  return (
    <header className="mb-6 rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(11,18,32,0.82)_0%,rgba(8,13,24,0.78)_100%)] p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex min-h-[48px] flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-panelMuted/80 px-4">
          <Search size={16} className="text-textMuted" />
          <input
            id="global-search"
            name="globalSearch"
            autoComplete="off"
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-[13px] text-text outline-none placeholder:text-textMuted/70"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {session?.role === 'super_admin' ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-white">
              <Shield size={15} className="text-accentAlt" />
              Owner Console
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-white">
              <Store size={15} className="text-accentAlt" />
              {activeStore.name}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setLinksOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-white/[0.05]"
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
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-white/[0.05]"
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

          <Link href="/notifications" className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 text-text transition hover:bg-white/[0.05]">
            <Bell size={15} />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-white">
            {session?.role === 'super_admin' ? <Shield size={14} className="text-cyan-200" /> : null}
            <span>{session?.name ?? 'Guest'} · {(session?.role ?? 'viewer').replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
