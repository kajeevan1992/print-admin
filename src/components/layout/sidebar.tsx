'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  FileText,
  Flag,
  Gauge,
  Globe2,
  History,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  Map as MapIcon,
  Presentation,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Store,
  Target,
  UploadCloud,
  Users,
  Users2,
  Webhook,
  Wrench,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getAdminSidebarNavigation, type AdminSidebarNavigationItem } from '@/config/admin-navigation';

const SUPER_ADMIN_APPROVED_LABELS = [
  'Super Admin',
  'Tenant Control',
  'Owner Onboarding',
  'Owner Invitations',
  'Launch Checklist',
  'Owner Escalations',
  'Owner Audit Log',
  'Admin Hardening',
  'Owner Notifications',
  'Navigation Registry',
  'Owner Feature Flags',
  'Owner API Keys',
  'System QA Audit',
  'Live Readiness',
  'Owner Webhooks',
  'Owner SSO Config',
  'Owner Usage Limits',
  'Owner Billing Plans',
  'Owner Environments',
  'Owner Domains',
  'Owner Backups',
  'Owner Maintenance Windows',
  'Owner Incidents',
  'Owner Runbooks',
  'Owner Compliance Center',
  'Owner Release Approvals',
  'Owner Data Retention',
  'Owner Customer Health',
  'Owner Renewals',
  'Owner QBRs',
  'Owner Onboarding Pipeline',
  'Owner Portfolio Risks',
  'Owner Success Plans',
  'Owner Customer Journeys',
  'Owner Account Plans',
  'Owner Stakeholder Map',
  'Licensing Center',
  'Admin Users',
  'Store Activations',
  'Billing Ops',
  'Owner Deployments',
  'Demo Library',
  'Reports',
  'Support Hub',
  'Knowledge Base',
  'Logout'
] as const;

const superAdminOrder = new Map<string, number>(SUPER_ADMIN_APPROVED_LABELS.map((label, index) => [label, index]));

const iconMap: Record<string, LucideIcon> = {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  FileText,
  Flag,
  Gauge,
  Globe2,
  History,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  Map: MapIcon,
  Presentation,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Store,
  Target,
  UploadCloud,
  Users,
  Users2,
  Webhook,
  Wrench
};

function getIcon(iconKey?: string): LucideIcon {
  return iconKey ? iconMap[iconKey] ?? FileText : FileText;
}

function itemIsActive(pathname: string, href?: string) {
  return Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
}

function filterSuperAdminNavigation(items: AdminSidebarNavigationItem[]) {
  return items
    .filter((item) => superAdminOrder.has(item.label))
    .sort((a, b) => (superAdminOrder.get(a.label) ?? 999) - (superAdminOrder.get(b.label) ?? 999));
}

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  const navItems = useMemo(() => {
    const items = getAdminSidebarNavigation(session?.role, [], 'sidebar');
    return session?.role === 'super_admin' ? filterSuperAdminNavigation(items) : items;
  }, [session?.role]);

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

          return (
            <Link
              key={item.label}
              href={item.href as any}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-textMuted transition hover:bg-white/[0.04] hover:text-white',
                active && 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
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
