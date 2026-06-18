import type { AdminSidebarNavigationItem } from './admin-navigation';
import { launchQaLinks } from './launch-navigation';

export const superAdminSidebarNavigation: AdminSidebarNavigationItem[] = [
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
    ],
  },
  {
    label: 'Launch Control', iconKey: 'Rocket', order: 40, children: [
      { label: 'Launch Readiness', href: '/launch-readiness', iconKey: 'ShieldCheck', order: 10 },
      { label: 'Storefront Order Test', href: '/storefront-order-test', iconKey: 'ShoppingCart', order: 20 },
      { label: 'Payment Checkout QA', href: '/payment-checkout-qa', iconKey: 'CreditCard', order: 30 },
      ...launchQaLinks,
      { label: 'SEO Live Readiness', href: '/seo-live-readiness', iconKey: 'ShieldCheck', order: 40 },
    ],
  },
  {
    label: 'Support', iconKey: 'LifeBuoy', order: 50, children: [
      { label: 'Support', href: '/support', iconKey: 'LifeBuoy', order: 10 },
      { label: 'Knowledge Base', href: '/knowledge-base', iconKey: 'BookOpen', order: 20 },
      { label: 'Error Log', href: '/error-log', iconKey: 'AlertTriangle', order: 30 },
    ],
  },
];
