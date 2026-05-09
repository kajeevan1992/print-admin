'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  BadgePoundSterling,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bot,
  Box,
  Boxes,
  Building2,
  Calculator,
  CalendarClock,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  DollarSign,
  Factory,
  FileText,
  Flag,
  FolderKanban,
  FolderTree,
  FormInput,
  GitBranch,
  Globe2,
  HardDrive,
  HeartPulse,
  Home,
  KeyRound,
  Languages,
  Layers3,
  LayoutGrid,
  LayoutPanelTop,
  LifeBuoy,
  LogOut,
  Mail,
  Map as MapIcon,
  Package,
  Palette,
  PenTool,
  Presentation,
  Printer,
  Receipt,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Tags,
  Target,
  TicketPercent,
  Trash2,
  Truck,
  User,
  UserCircle2,
  Users,
  Users2,
  Webhook,
  Wrench,
  Gauge,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getAdminSidebarNavigation, type AdminSidebarNavigationItem } from '@/config/admin-navigation';

const iconMap: Record<string, LucideIcon> = {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  BadgePoundSterling,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bot,
  Box,
  Boxes,
  Building2,
  Calculator,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  DollarSign,
  Factory,
  FileText,
  Flag,
  FolderKanban,
  FolderTree,
  FormInput,
  GitBranch,
  Globe2,
  HardDrive,
  HeartPulse,
  Home,
  KeyRound,
  Languages,
  Layers3,
  LayoutGrid,
  LayoutPanelTop,
  LifeBuoy,
  LogOut,
  Mail,
  Map: MapIcon,
  Package,
  Palette,
  PenTool,
  Presentation,
  Printer,
  Receipt,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Tags,
  Target,
  TicketPercent,
  Trash2,
  Truck,
  User,
  UserCircle2,
  Users,
  Users2,
  Webhook,
  Wrench,
  Gauge
};

function getIcon(iconKey?: string): LucideIcon {
  return iconKey ? iconMap[iconKey] ?? FileText : FileText;
}

function itemIsActive(pathname: string, href?: string) {
  return Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
}

function itemHasActiveChild(pathname: string, item: AdminSidebarNavigationItem) {
  return item.children?.some((child) => itemIsActive(pathname, child.href)) ?? false;
}

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  const navItems = useMemo(
    () => getAdminSidebarNavigation(session?.role, [], 'sidebar'),
    [session?.role]
  );

  const defaultOpen = useMemo(() => {
    const openMap: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (itemHasActiveChild(pathname, item)) openMap[item.label] = true;
    });
    return openMap;
  }, [navItems, pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpen);

  useEffect(() => {
    setOpenGroups((current) => ({ ...defaultOpen, ...current }));
  }, [defaultOpen]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="hidden h-screen w-[292px] shrink-0 border-r border-white/6 bg-[linear-gradient(180deg,rgba(11,18,32,0.96)_0%,rgba(7,11,22,0.98)_100%)] p-4 lg:block">
      <div className="mb-5 rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_45%),rgba(15,23,42,0.88)] p-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Print SaaS Admin</p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
          {session?.role === 'super_admin' ? 'SaaS Owner Console' : 'Unified Control Center'}
        </p>
        <p className="mt-1 text-[13px] text-textMuted">
          {session?.role === 'super_admin'
            ? 'Tenant, licensing, deployment, and commercial controls for your SaaS.'
            : 'Precision controls for catalog, storefront, and operations.'}
        </p>
      </div>

      <nav className="space-y-1 overflow-y-auto pb-10">
        {navItems.map((item) => {
          const Icon = getIcon(item.iconKey);
          const active = itemIsActive(pathname, item.href);
          const hasActiveChild = itemHasActiveChild(pathname, item);

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href as any}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted transition hover:bg-white/[0.04] hover:text-white',
                  (active || hasActiveChild) && 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-textMuted transition hover:bg-white/[0.04] hover:text-white',
                  hasActiveChild && 'bg-white/[0.05] text-white'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} />
                  {item.label}
                </span>
                {openGroups[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {openGroups[item.label] ? (
                <div className="ml-4 mt-1 space-y-1 border-l border-white/8 pl-4">
                  {item.children?.map((child) => {
                    const ChildIcon = getIcon(child.iconKey);
                    const childActive = itemIsActive(pathname, child.href);

                    return (
                      <Link
                        key={child.label}
                        href={child.href as any}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-textMuted transition hover:bg-white/[0.04] hover:text-white',
                          childActive && 'bg-white/[0.05] text-white'
                        )}
                      >
                        <ChildIcon size={14} />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">
          {session?.role === 'super_admin' ? 'SaaS owner access' : 'Tenant workspace'}
        </p>
        <p className="mt-2 text-sm font-semibold text-white">{session?.name ?? 'Guest'}</p>
        <p className="mt-1 text-xs text-textMuted">{session?.company ?? 'Print Admin'}</p>
        <div className="mt-3 flex gap-2">
          {session?.role === 'super_admin' ? (
            <Link href="/super-admin" className="flex-1 rounded-xl border border-white/8 px-3 py-2 text-center text-xs text-text transition hover:bg-white/[0.05]">
              Control
            </Link>
          ) : null}
          <Link href="/logout" className="flex-1 rounded-xl border border-white/8 px-3 py-2 text-center text-xs text-text transition hover:bg-white/[0.05]">
            Logout
          </Link>
        </div>
      </div>
    </aside>
  );
}
