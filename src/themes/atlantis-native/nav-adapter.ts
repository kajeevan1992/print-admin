import type { MenuItem, NavItem } from './types';
import { FALLBACK_NAV_ITEMS } from './nav-fallback';
import { cleanSlug } from './theme-helpers';

export function buildNavItems(menuItems: MenuItem[]): NavItem[] {
  if (!menuItems?.length) return FALLBACK_NAV_ITEMS;
  const byParent = new Map<string, MenuItem[]>();
  const top: MenuItem[] = [];

  menuItems.forEach((item) => {
    if (item.parentId || item.parentSlug) {
      [item.parentId, item.parentSlug].filter(Boolean).forEach((key) => byParent.set(String(key), [...(byParent.get(String(key)) || []), item]));
    } else {
      top.push(item);
    }
  });

  const fallbackByLabel = new Map(FALLBACK_NAV_ITEMS.map((item) => [cleanSlug(item.label), item]));
  const fallbackTail = FALLBACK_NAV_ITEMS[0].columns.slice(1);

  return top.sort((a, b) => a.order - b.order).slice(0, 10).map((item) => {
    const fallback = fallbackByLabel.get(cleanSlug(item.label));
    const children = [...(byParent.get(item.id) || []), ...(byParent.get(item.slug) || []), ...(byParent.get(cleanSlug(item.label)) || [])];
    const childLinks = children.sort((a, b) => a.order - b.order).map((child) => [child.label, child.path] as [string, string]);
    return {
      label: item.label,
      path: item.path,
      feature: fallback?.feature || { title: item.label, body: item.description || 'Browse menu links.', image: '/native-theme-assets/atlantis/hero-slide-1.svg', cta: `View ${item.label}` },
      columns: childLinks.length ? [{ title: 'Menu', links: childLinks }, ...(fallback?.columns?.slice(1) || fallbackTail)] : fallback?.columns || [{ title: 'Browse', links: [[item.label, item.path]] }],
    };
  });
}
