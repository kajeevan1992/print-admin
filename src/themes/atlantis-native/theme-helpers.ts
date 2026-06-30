export const BRAND = {
  bg: '#F7F8FC',
  line: '#E3E8F0',
  ink: '#161A22',
  muted: '#667487',
  primary: '#18A7D0',
  primaryDark: '#127B98',
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

export function storeHref(storeBase: string, value = '/') {
  const path = normalPath(value);
  if (/^(https?:|mailto:|tel:)/i.test(path)) return path;
  return path === '/' ? storeBase : `${storeBase}${path}`;
}
