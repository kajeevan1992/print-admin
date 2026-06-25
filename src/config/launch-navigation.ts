import type { AdminSidebarNavigationItem } from './admin-navigation';

export const launchQaLinks: NonNullable<AdminSidebarNavigationItem['children']> = [
  { label: 'Fresh DB Setup', href: '/fresh-db-setup', iconKey: 'Database', order: 34 },
  { label: 'Platform Shop Setup', href: '/shop-login-setup', iconKey: 'Shield', order: 34.5 },
  { label: 'Business Defaults', href: '/business-defaults', iconKey: 'Store', order: 34.6 },
  { label: 'Memberships', href: '/memberships', iconKey: 'ShieldCheck', order: 34.7 },
  { label: 'DB Credentials', href: '/credentials', iconKey: 'KeyRound', order: 34.8 },
  { label: 'OAuth Status', href: '/oauth', iconKey: 'ShieldCheck', order: 34.9 },
  { label: 'Mail QA', href: '/email-order-notification-qa', iconKey: 'Mail', order: 35 },
  { label: 'Live Flow Check', href: '/live-flow-check', iconKey: 'ShoppingCart', order: 35.5 },
  { label: 'Theme Library', href: '/theme-library', iconKey: 'Palette', order: 35.6 },
  { label: 'Design Bundles', href: '/design-bundles', iconKey: 'Archive', order: 35.61 },
  { label: 'Theme Versions', href: '/theme-versions', iconKey: 'History', order: 35.62 },
  { label: 'Theme Marketplace', href: '/theme-marketplace', iconKey: 'Store', order: 35.63 },
  { label: 'Store Domains', href: '/store-domains', iconKey: 'Globe2', order: 35.64 },
  { label: 'Store Allowances', href: '/store-allowances', iconKey: 'ShieldCheck', order: 35.65 },
  { label: 'Store Theme Selector', href: '/store-theme-selector', iconKey: 'Store', order: 35.7 },
  { label: 'Store Design Live', href: '/store-design-live', iconKey: 'Rocket', order: 35.75 },
  { label: 'Block Editor', href: '/site-block-editor', iconKey: 'LayoutPanelTop', order: 35.8 },
  { label: 'Launch Guard', href: '/admin-launch-security', iconKey: 'ShieldCheck', order: 36 },
  { label: 'Data Check', href: '/data-continuity', iconKey: 'ShieldCheck', order: 37 },
  { label: 'Final Check', href: '/final-check', iconKey: 'ShieldCheck', order: 38 },
  { label: 'Button Audit', href: '/button-audit', iconKey: 'MousePointerClick', order: 39 },
];

export function addLaunchQaLinks(items: AdminSidebarNavigationItem[]) {
  return items.map((item) => {
    if (item.label !== 'Launch Operations' || !item.children?.length) return item;
    const next = [...item.children];
    for (const link of launchQaLinks.map((entry, index) => ({ ...entry, order: 19 + index / 10 }))) {
      if (!next.some((child) => child.href === link.href)) next.push(link);
    }
    return { ...item, children: next.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) };
  });
}
