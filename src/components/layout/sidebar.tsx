'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Sparkles,
  Box,
  Tags,
  FolderTree,
  Tag,
  ClipboardList, ClipboardCheck,
  PenTool,
  FileText,
  DollarSign,
  BadgePoundSterling,
  BarChart3,
  Activity,
  Store,
  Users,
  UserCircle2,
  Users2,
  Shield,
  FolderKanban,
  ShoppingCart,
  Truck,
  Palette,
  SlidersHorizontal,
  Settings,
  ScrollText,
  KeyRound,
  BellRing,
  Flag,
  History,
  Webhook,
  ShieldEllipsis,
  Gauge,
  Building2,
  CreditCard,
  Package,
  Receipt,
  Mail,
  Bell,
  FormInput,
  LayoutPanelTop,
  PanelsTopLeft,
  TicketPercent,
  Globe,
  Globe2,
  DatabaseBackup,
  Languages,
  Wrench,
  Boxes,
  Archive,
  GitBranch,
  Bot,
  HardDrive,
  Trash2,
  AlertTriangle,
  Factory,
  Printer,
  LayoutGrid,
  Layers3,
  User,
  HeartPulse,
  LifeBuoy,
  BookOpen,
  UploadCloud,
  Rocket,
  LogOut,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: Array<{
    label: string;
    href: string;
  }>;
};

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Workspace', href: '/workspace', icon: Sparkles },
  { label: 'Products', href: '/products', icon: Box },
  { label: 'Product Builder', href: '/product-builder-studio', icon: Box },
  { label: 'Config Templates', href: '/config-templates', icon: SlidersHorizontal },
  { label: 'Option Sets', href: '/option-sets', icon: Layers3 },
  { label: 'Materials Library', href: '/materials-library', icon: Archive },
  { label: 'Finish Library', href: '/finish-library', icon: Palette },
  { label: 'Printer Profiles', href: '/printer-profiles', icon: Printer },
  { label: 'Product Rules Lab', href: '/product-rules-lab', icon: GitBranch },
  { label: 'Production Routing', href: '/production-routing-lab', icon: Printer },
  { label: 'Artwork Preflight', href: '/artwork-preflight-studio', icon: Shield },
  { label: 'Pricing Engine', href: '/pricing-engine-lab', icon: DollarSign },
  { label: 'Categories', href: '/categories', icon: Tags },
  { label: 'Collections', href: '/collections', icon: FolderTree },
  { label: 'Tags', href: '/tags', icon: Tag },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Artwork Proofing', href: '/artwork-proofing', icon: PenTool },
  { label: 'Artwork Intelligence', href: '/artwork-intelligence', icon: PenTool },
  { label: 'Quotations', href: '/quotes', icon: FileText },
  { label: 'Pricing', href: '/pricing', icon: DollarSign },
  { label: 'Pricing Rules', href: '/pricing-rules', icon: BadgePoundSterling },
  { label: 'Pricing Command', href: '/pricing-command', icon: BadgePoundSterling },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Activity Log', href: '/activity-log', icon: Activity },
  { label: 'Print Store', href: '/channels', icon: Store },
  {
    label: 'Users',
    icon: Users,
    children: [
      { label: 'Users', href: '/users' },
      { label: 'Site Users', href: '/site-users' },
      { label: 'User Groups', href: '/user-groups' },
      { label: 'User Roles', href: '/user-roles' },
      { label: 'User Projects', href: '/user-projects' },
      { label: 'User Carts', href: '/user-carts' }
    ]
  },
  { label: 'Trade Vendors', href: '/vendors', icon: Truck },
  { label: 'Site Theme', href: '/themes', icon: Palette },
  {
    label: 'Print Parametric',
    icon: SlidersHorizontal,
    children: [
      { label: 'Parametric Setup', href: '/parametric-setup' },
      { label: 'Parametric Products', href: '/parametric-products' },
      { label: 'Parametric Rules Engine', href: '/parametric-rules-engine' },
      { label: 'Parametric Libraries', href: '/parametric-libraries' }
    ]
  },
  {
    label: 'Content',
    icon: FileText,
    children: [
      { label: 'Content', href: '/content' },
      { label: 'Blog Content', href: '/blog-content' },
      { label: 'Page Content', href: '/page-content' },
      { label: 'Product Content', href: '/product-content' },
      { label: 'Tag Content', href: '/tag-content' },
      { label: 'Landing Pages', href: '/landing-pages' },
      { label: 'Category CMS', href: '/category-cms' },
      { label: 'Extended Content', href: '/extended-content' },
      { label: 'HTML Snippets', href: '/html-snippets' }
    ]
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'General Settings', href: '/settings' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'API Access', href: '/api-access' },
      { label: 'API Keys', href: '/api-keys' },
      { label: 'Admin Users', href: '/admin-users' },
      { label: 'Licensing Center', href: '/licensing-center' },
      { label: 'Tenant Control', href: '/tenant-control' },
      { label: 'Organizations', href: '/organizations' },
      { label: 'Merchant Accounts', href: '/merchant-accounts' },
      { label: 'Shipping Methods', href: '/shipping-methods' },
      { label: 'Tax / VAT Settings', href: '/tax-vat-settings' },
      { label: 'Email Account', href: '/email-account' },
      { label: 'Email Notifications', href: '/email-notifications' },
      { label: 'Checkout Fields', href: '/checkout-fields' },
      { label: 'Checkout Styles', href: '/checkout-styles' },
      { label: 'Promotion Codes', href: '/promotion-codes' },
      { label: 'Country List', href: '/country-list' },
      { label: 'Translations', href: '/translations' }
    ]
  },
  {
    label: 'Advanced',
    icon: Wrench,
    children: [
      { label: 'Attribute Sets', href: '/attribute-sets' },
      { label: 'Inventory', href: '/inventory' },
      { label: 'Order Status', href: '/order-status' },
      { label: 'Packaging Studio', href: '/packaging-studio' },
      { label: 'Redirects', href: '/redirects' },
      { label: 'Robots.txt', href: '/robots-txt' },
      { label: 'Site Bindings', href: '/site-bindings' },
      { label: 'Store Clone', href: '/store-clone' },
      { label: 'FTP Accounts', href: '/ftp-accounts' },
      { label: 'Clean Up Manager', href: '/clean-up-manager' },
      { label: 'Error Log', href: '/error-log' }
    ]
  },
  {
    label: 'Production',
    icon: Factory,
    children: [
      { label: 'Production', href: '/production' },
      { label: 'Production Planner', href: '/production-planner' },
      { label: 'Dispatch Center', href: '/dispatch-center' },
      { label: 'Printer Management', href: '/printer-management' },
      { label: 'Production Board', href: '/production-board' }
    ]
  },
  {
    label: 'Account',
    icon: User,
    children: [
      { label: 'Admin Theme', href: '/admin-theme' },
      { label: 'Uptime Report', href: '/uptime-report' },
      { label: 'Support Tickets', href: '/support-tickets' }
    ]
  },
  {
    label: 'Support',
    icon: LifeBuoy,
    children: [
      { label: 'Support', href: '/support' },
      { label: 'Knowledge Base', href: '/knowledge-base' }
    ]
  },
  { label: 'Logout', href: '/logout', icon: LogOut }
];

const iconMap: Record<string, LucideIcon> = {
  Categories: Tags,
  Collections: FolderTree,
  Tags: Tag,
  Orders: ClipboardList, ClipboardCheck,
  'Artwork Proofing': PenTool,
  'Artwork Intelligence': PenTool,
  Quotations: FileText,
  Pricing: DollarSign,
  'Pricing Rules': BadgePoundSterling,
  'Pricing Command': BadgePoundSterling,
  Reports: BarChart3,
  'Activity Log': Activity,
  Workspace: Sparkles,
  'Print Store': Store,
  Users,
  'Site Users': UserCircle2,
  'User Groups': Users2,
  'User Roles': Shield,
  'User Projects': FolderKanban,
  'User Carts': ShoppingCart,
  'Trade Vendors': Truck,
  'Site Theme': Palette,
  'Print Parametric': SlidersHorizontal,
  'Parametric Setup': SlidersHorizontal,
  'Parametric Products': Boxes,
  'Parametric Rules Engine': Bot,
  'Parametric Libraries': Archive,
  Content: FileText,
  'Blog Content': ScrollText,
  'Page Content': LayoutPanelTop,
  'Category CMS': Tags,
  'Extended Content': FileText,
  'HTML Snippets': FileText,
  Settings,
  'General Settings': Settings,
  Changelog: ScrollText,
  'API Access': KeyRound,
  'API Keys': KeyRound,
  'Admin Users': Shield,
  'Licensing Center': KeyRound,
  'Tenant Control': Building2,
  Organizations: Building2,
  'Merchant Accounts': CreditCard,
  'Shipping Methods': Package,
  'Tax / VAT Settings': Receipt,
  'Email Account': Mail,
  'Email Notifications': Bell,
  'Checkout Fields': FormInput,
  'Checkout Styles': LayoutPanelTop,
  'Promotion Codes': TicketPercent,
  'Country List': Globe2,
  Translations: Languages,
  Advanced: Wrench,
  'Attribute Sets': Tags,
  Inventory: Archive,
  'Order Status': ClipboardList, ClipboardCheck,
  Redirects: GitBranch,
  'Robots.txt': Bot,
  'Site Bindings': Globe2,
  'Store Clone': Store,
  'FTP Accounts': HardDrive,
  'Clean Up Manager': Trash2,
  'Error Log': AlertTriangle,
  Production: Factory,
  'Printer Management': Printer,
  'Production Board': LayoutGrid,
  'Production Planner': LayoutGrid,
  Account: User,
  'Admin Theme': Palette,
  'Uptime Report': HeartPulse,
  'Support Tickets': LifeBuoy,
  Support: LifeBuoy,
  'Knowledge Base': BookOpen,
  Logout: LogOut
};


const superAdminNavItems: NavItem[] = [
  { label: 'Super Admin', href: '/super-admin', icon: Shield },
  { label: 'Tenant Control', href: '/tenant-control', icon: Building2 },
  { label: 'Owner Onboarding', href: '/owner-onboarding', icon: Sparkles },
  { label: 'Owner Invitations', href: '/owner-invitations', icon: Mail },
  { label: 'Launch Checklist', href: '/owner-launch-checklist', icon: ClipboardCheck },
  { label: 'Owner Escalations', href: '/owner-escalations', icon: AlertTriangle },
  { label: 'Owner Audit Log', href: '/owner-audit-log', icon: History },
  { label: 'Owner Notifications', href: '/owner-notifications', icon: BellRing },
  { label: 'Owner Feature Flags', href: '/owner-feature-flags', icon: Flag },
  { label: 'Owner API Keys', href: '/owner-api-keys', icon: KeyRound },
  { label: 'Owner Webhooks', href: '/owner-webhooks', icon: Webhook },
  { label: 'Owner SSO Config', href: '/owner-sso-config', icon: ShieldEllipsis },
  { label: 'Owner Usage Limits', href: '/owner-usage-limits', icon: Gauge },
  { label: 'Owner Billing Plans', href: '/owner-billing-plans', icon: CreditCard },
  { label: 'Owner Environments', href: '/owner-environments', icon: Globe2 },
  { label: 'Owner Domains', href: '/owner-domains', icon: Globe2 },
  { label: 'Owner Backups', href: '/owner-backups', icon: DatabaseBackup },
  { label: 'Licensing Center', href: '/licensing-center', icon: KeyRound },
  { label: 'Admin Users', href: '/admin-users', icon: Users2 },
  { label: 'Store Activations', href: '/organizations', icon: Store },
  { label: 'Billing Ops', href: '/merchant-accounts', icon: CreditCard },
  { label: 'Owner Deployments', href: '/owner-deployments', icon: Rocket },
  { label: 'Demo Library', href: '/demo-library', icon: UploadCloud },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Support Hub', href: '/support-tickets', icon: LifeBuoy },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { label: 'Logout', href: '/logout', icon: LogOut }
];

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  const navItems = useMemo(() => {
    if (session?.role === 'super_admin') {
      return superAdminNavItems;
    }

    return baseNavItems.filter((item) => item.href !== '/super-admin');
  }, [session?.role]);


  const defaultOpen = useMemo(() => {
    const openMap: Record<string, boolean> = {};

    navItems.forEach((item) => {
      if (item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))) {
        openMap[item.label] = true;
      }
    });

    return openMap;
  }, [pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpen);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="hidden h-screen w-[292px] shrink-0 border-r border-white/6 bg-[linear-gradient(180deg,rgba(11,18,32,0.96)_0%,rgba(7,11,22,0.98)_100%)] p-4 lg:block">
      <div className="mb-5 rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_45%),rgba(15,23,42,0.88)] p-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Print SaaS Admin</p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{session?.role === 'super_admin' ? 'SaaS Owner Console' : 'Unified Control Center'}</p>
        <p className="mt-1 text-[13px] text-textMuted">{session?.role === 'super_admin' ? 'Tenant, licensing, deployment, and commercial controls for your SaaS.' : 'Precision controls for catalog, storefront, and operations.'}</p>
      </div>

      <nav className="space-y-1 overflow-y-auto pb-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false;
          const hasActiveChild =
            item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)) ?? false;

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
                    const ChildIcon = iconMap[child.label] ?? FileText;
                    const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);

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
        <p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">{session?.role === 'super_admin' ? 'SaaS owner access' : 'Tenant workspace'}</p>
        <p className="mt-2 text-sm font-semibold text-white">{session?.name ?? 'Guest'}</p>
        <p className="mt-1 text-xs text-textMuted">{session?.company ?? 'Print Admin'}</p>
        <div className="mt-3 flex gap-2">
          {session?.role === 'super_admin' ? <Link href="/super-admin" className="flex-1 rounded-xl border border-white/8 px-3 py-2 text-center text-xs text-text transition hover:bg-white/[0.05]">Control</Link> : null}
          <Link href="/logout" className="flex-1 rounded-xl border border-white/8 px-3 py-2 text-center text-xs text-text transition hover:bg-white/[0.05]">Logout</Link>
        </div>
      </div>
    </aside>
  );
}