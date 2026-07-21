import type { MenuItem, NavItem } from './types';
import { FALLBACK_NAV_ITEMS } from './nav-fallback';
import { cleanSlug } from './theme-helpers';

export function buildNavItems(menuItems: MenuItem[]): NavItem[] {
  const enabledItems = (menuItems || []).filter((item) => item.enabled !== false && item.label && item.path);
  if (!enabledItems.length) return FALLBACK_NAV_ITEMS;
  const byParent = new Map<string, MenuItem[]>();
  const top: MenuItem[] = [];

  enabledItems.forEach((item) => {
    if (item.parentId || item.parentSlug) {
      [item.parentId, item.parentSlug].filter(Boolean).forEach((key) => byParent.set(String(key), [...(byParent.get(String(key)) || []), item]));
    } else {
      top.push(item);
    }
  });

  const fallbackByLabel = new Map(FALLBACK_NAV_ITEMS.map((item) => [cleanSlug(item.label), item]));

  return top.sort((a, b) => a.order - b.order).slice(0, 10).map((item) => {
    const fallback = fallbackByLabel.get(cleanSlug(item.label));
    const childMap = new Map<string, MenuItem>();
    for (const child of [...(byParent.get(item.id) || []), ...(byParent.get(item.slug) || []), ...(byParent.get(cleanSlug(item.label)) || [])]) childMap.set(child.id, child);
    const groups = new Map<string, MenuItem[]>();
    [...childMap.values()].sort((a, b) => a.order - b.order).forEach((child) => {
      const group = String(child.group || 'Menu').trim() || 'Menu';
      groups.set(group, [...(groups.get(group) || []), child]);
    });
    const columns = [...groups.entries()].slice(0, 4).map(([title, children]) => ({
      title,
      links: children.slice(0, 8).map((child) => [child.label, child.path] as [string, string]),
    }));
    return {
      label: item.label,
      path: item.path,
      feature: {
        title: item.label,
        body: item.description || fallback?.feature.body || 'Browse menu links.',
        image: item.imageUrl || fallback?.feature.image || '/native-theme-assets/atlantis/hero-slide-1.svg',
        cta: fallback?.feature.cta || `View ${item.label}`,
      },
      columns: columns.length ? columns : fallback?.columns || [{ title: 'Browse', links: [[item.label, item.path]] }],
    };
  });
}
