'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Box,
  Tags,
  FolderTree,
  Bookmark,
  ClipboardList,
  PenTool,
  Quote,
  DollarSign,
  BarChart3,
  Activity,
  Store,
  Users,
  UserCircle2,
  Shield,
  ShoppingCart,
  Truck,
  Palette,
  SlidersHorizontal,
  BookOpen,
  FileText,
  Settings,
  KeyRound,
  Building2,
  Mail,
  Globe2,
  Wrench,
  Package,
  ArrowRightLeft,
  Bug,
  Factory,
  Monitor,
  LifeBuoy,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { label: string; href: string; icon?: React.ComponentType<{ size?: number; className?: string }>; children?: NavItem[] };

const sections: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: Home },
  {
    label: 'Catalog',
    href: '/products',
    icon: Box,
    children: [
      { label: 'Products', href: '/products', icon: Box },
      { label: 'Categories', href: '/categories', icon: Tags },
      { label: 'Collections', href: '/collections', icon: FolderTree },
      { label: 'Tags', href: '/tags', icon: Bookmark }
    ]
  },
  {
    label: 'Commerce',
    href: '/orders',
    icon: ClipboardList,
    children: [
      { label: 'Orders', href: '/orders', icon: ClipboardList },
      { label: 'Artwork Proofing', href: '/artwork-proofing', icon: PenTool },
      { label: 'Quotations', href: '/quotes', icon: Quote },
      { label: 'Pricing', href: '/pricing', icon: DollarSign },
      { label: 'Pricing Rules', href: '/pricing-rules', icon: SlidersHorizontal },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Activity Log', href: '/activity-log', icon: Activity },
      { label: 'Print Store', href: '/print-store', icon: Store }
    ]
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    children: [
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Site Users', href: '/site-users', icon: UserCircle2 },
      { label: 'User Groups', href: '/user-groups', icon: Users },
      { label: 'User Roles', href: '/user-roles', icon: Shield },
      { label: 'User Projects', href: '/user-projects', icon: FolderTree },
      { label: 'User Carts', href: '/user-carts', icon: ShoppingCart }
    ]
  },
  {
    label: 'Vendors & Themes',
    href: '/channels',
    icon: Truck,
    children: [
      { label: 'Channels', href: '/channels', icon: Store },
      { label: 'Trade Vendors', href: '/trade-vendors', icon: Truck },
      { label: 'Themes', href: '/themes', icon: Palette },
      { label: 'Site Theme', href: '/site-theme', icon: Palette }
    ]
  },
  {
    label: 'Parametric',
    href: '/print-parametric',
    icon: SlidersHorizontal,
    children: [
      { label: 'Print Parametric', href: '/print-parametric', icon: SlidersHorizontal },
      { label: 'Parametric Setup', href: '/parametric-setup', icon: Settings },
      { label: 'Parametric Products', href: '/parametric-products', icon: Box },
      { label: 'Parametric Rules Engine', href: '/parametric-rules-engine', icon: Wrench },
      { label: 'Parametric Libraries', href: '/parametric-libraries', icon: BookOpen }
    ]
  },
  {
    label: 'Content',
    href: '/content',
    icon: FileText,
    children: [
      { label: 'Content', href: '/content', icon: FileText },
      { label: 'Blog Content', href: '/blog-content', icon: FileText },
      { label: 'Page Content', href: '/page-content', icon: FileText },
      { label: 'Category CMS', href: '/category-cms', icon: Tags },
      { label: 'Extended Content', href: '/extended-content', icon: FileText },
      { label: 'HTML Snippets', href: '/html-snippets', icon: FileText }
    ]
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'General Settings', href: '/settings', icon: Settings },
      { label: 'Changelog', href: '/changelog', icon: Activity },
      { label: 'API Access', href: '/api-access', icon: KeyRound },
      { label: 'API Keys', href: '/api-keys', icon: KeyRound },
      { label: 'Admin Users', href: '/admin-users', icon: Shield },
      { label: 'Organizations', href: '/organizations', icon: Building2 },
      { label: 'Merchant Accounts', href: '/merchant-accounts', icon: Building2 },
      { label: 'Shipping Methods', href: '/shipping-methods', icon: Truck },
      { label: 'Tax / VAT Settings', href: '/tax-vat-settings', icon: Globe2 },
      { label: 'Email Account', href: '/email-account', icon: Mail },
      { label: 'Email Notifications', href: '/email-notifications', icon: Mail },
      { label: 'Checkout Fields', href: '/checkout-fields', icon: ShoppingCart },
      { label: 'Checkout Styles', href: '/checkout-styles', icon: Palette },
      { label: 'Promotion Codes', href: '/promotion-codes', icon: Bookmark },
      { label: 'Country List', href: '/country-list', icon: Globe2 },
      { label: 'Translations', href: '/translations', icon: Globe2 }
    ]
  },
  {
    label: 'Advanced',
    href: '/advanced',
    icon: Wrench,
    children: [
      { label: 'Advanced', href: '/advanced', icon: Wrench },
      { label: 'Attribute Sets', href: '/attribute-sets', icon: Tags },
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Order Status', href: '/order-status', icon: ClipboardList },
      { label: 'Redirects', href: '/redirects', icon: ArrowRightLeft },
      { label: 'Robots.txt', href: '/robots-txt', icon: FileText },
      { label: 'Site Bindings', href: '/site-bindings', icon: Globe2 },
      { label: 'Store Clone', href: '/store-clone', icon: Store },
      { label: 'FTP Accounts', href: '/ftp-accounts', icon: FolderTree },
      { label: 'Clean Up Manager', href: '/clean-up-manager', icon: Wrench },
      { label: 'Error Log', href: '/error-log', icon: Bug }
    ]
  },
  {
    label: 'Production',
    href: '/production',
    icon: Factory,
    children: [
      { label: 'Production', href: '/production', icon: Factory },
      { label: 'Printer Management', href: '/printer-management', icon: Settings },
      { label: 'Production Board', href: '/production-board', icon: Monitor }
    ]
  },
  {
    label: 'Account',
    href: '/account',
    icon: UserCircle2,
    children: [
      { label: 'Account', href: '/account', icon: UserCircle2 },
      { label: 'Admin Theme', href: '/admin-theme', icon: Palette },
      { label: 'Uptime Report', href: '/uptime-report', icon: BarChart3 },
      { label: 'Support Tickets', href: '/support-tickets', icon: LifeBuoy },
      { label: 'Support', href: '/support', icon: LifeBuoy },
      { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
      { label: 'Logout', href: '/logout', icon: LogOut }
    ]
  }
];

function NavLink({ item, nested = false }: { item: NavItem; nested?: boolean }) {
  const pathname = usePathname();
  const Icon = item.icon ?? FileText;
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-textMuted hover:bg-panelMuted hover:text-text',
        nested && 'ml-3 py-1.5 text-[13px]',
        active && 'bg-panelMuted text-text'
      )}
    >
      <Icon size={nested ? 14 : 16} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-80 shrink-0 border-r border-border bg-panel/70 p-4 lg:block">
      <div className="mb-5 rounded-lg bg-panelMuted p-3">
        <p className="text-xs text-textMuted">Print SaaS Admin</p>
        <p className="text-sm font-semibold">Unified Control Center</p>
      </div>
      <nav className="space-y-3 overflow-y-auto pb-8">
        {sections.map((section) => (
          <div key={section.label} className="rounded-xl border border-border/60 bg-panel/50 p-2">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2 text-sm font-medium text-text">
                {section.icon ? <section.icon size={16} /> : null}
                <span>{section.label}</span>
              </div>
              {section.children ? <ChevronDown size={14} className="text-textMuted" /> : null}
            </div>
            {section.children ? (
              <div className="space-y-0.5">
                {section.children.map((child) => (
                  <NavLink key={child.href} item={child} nested />
                ))}
              </div>
            ) : (
              <NavLink item={section} />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
