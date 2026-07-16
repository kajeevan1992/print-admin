export const BRAND = {
  bg: 'var(--storefront-bg, #F7F8FC)',
  line: 'var(--storefront-line, #E3E8F0)',
  ink: 'var(--storefront-ink, #161A22)',
  muted: 'var(--storefront-muted, #667487)',
  primary: 'var(--storefront-primary, #18A7D0)',
  primaryDark: 'var(--storefront-primary-dark, #127B98)',
  accent: 'var(--storefront-accent, #7B3FE4)',
  black: 'var(--storefront-black, #0F1012)',
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

export function storeHref(storeBase: string, value = '/') {
  const path = normalPath(value);
  if (/^(https?:|mailto:|tel:)/i.test(path)) return path;
  return path === '/' ? storeBase : `${storeBase}${path}`;
}
