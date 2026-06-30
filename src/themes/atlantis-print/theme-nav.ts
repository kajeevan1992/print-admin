import type { MenuItem, NavItem } from './types';

export const BRAND = {
  bg: '#F7F8FC',
  line: '#E3E8F0',
  ink: '#161A22',
  muted: '#667487',
  primary: '#18A7D0',
  accent: '#7B3FE4',
  black: '#0F1012',
};

export function cleanSlug(value = '') {
  return String(value || '').toLowerCase().trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function normalPath(value = '/') {
  const text = String(value || '/').trim();
  if (!text) return '/';
  if (/^(https?:|mailto:|tel:)/i.test(text)) return text;
  return text.startsWith('/') ? text : `/${text}`;
}

const PRODUCT_IMAGES = ['/theme-assets/atlantis/business-card-front.svg', '/theme-assets/atlantis/flyer-front.svg', '/theme-assets/atlantis/hero-slide-2.svg', '/theme-assets/atlantis/poster-main.svg'];

export function buildNavItems(menuItems: MenuItem[]): NavItem[] {
  const byParent = new Map<string, MenuItem[]>();
  const top: MenuItem[] = [];
  menuItems.forEach((item) => {
    if (item.parentId || item.parentSlug) {
      [item.parentId, item.parentSlug].filter(Boolean).forEach((key) => byParent.set(String(key), [...(byParent.get(String(key)) || []), item]));
    } else top.push(item);
  });

  return top.sort((a, b) => a.order - b.order).slice(0, 10).map((item, index) => {
    const children = [...(byParent.get(String(item.id)) || []), ...(byParent.get(String(item.slug)) || []), ...(byParent.get(cleanSlug(item.label)) || [])];
    const seen = new Set<string>();
    const links = children.filter((child) => {
      const key = `${child.id}|${child.slug}|${child.label}|${child.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return child.id !== item.id && cleanSlug(child.label) !== cleanSlug(item.label);
    }).sort((a, b) => a.order - b.order).map((child) => [child.label, child.path] as [string, string]);
    return {
      label: item.label,
      path: item.path,
      feature: {
        title: item.label,
        body: item.description || 'Browse print products, options and support links.',
        image: PRODUCT_IMAGES[index % PRODUCT_IMAGES.length],
        cta: `View ${item.label}`,
      },
      columns: [
        { title: links.length ? 'Menu' : 'Browse', links: links.length ? links : [[item.label, item.path]] },
        { title: 'Helpful services', links: [['Artwork Check', '/artwork-upload'], ['Priority Quote', '/bespoke-quote'], ['Express Delivery', '/checkout'], ['Call Support', '/bespoke-quote']] },
        { title: 'Popular categories', links: [['Business Cards', '/business-cards'], ['Flyers', '/flyers'], ['Labels', '/all-products'], ['Signage', '/signage']] },
      ],
    };
  });
}
