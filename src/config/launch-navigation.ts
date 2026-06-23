import type { AdminSidebarNavigationItem } from './admin-navigation';

export const launchQaLinks: NonNullable<AdminSidebarNavigationItem['children']> = [
  { label: 'Fresh DB Setup', href: '/fresh-db-setup', iconKey: 'Database', order: 34 },
  { label: 'Platform Shop Setup', href: '/shop-login-setup', iconKey: 'Shield', order: 34.5 },
  { label: 'Memberships', href: '/memberships', iconKey: 'ShieldCheck', order: 34.7 },
  { label: 'DB Credentials', href: '/credentials', iconKey: 'KeyRound', order: 34.8 },
  { label: 'Mail QA', href: '/email-order-notification-qa', iconKey: 'Mail', order: 35 },
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
