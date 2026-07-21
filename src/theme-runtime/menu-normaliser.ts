import type { MenuItem } from '@/themes/atlantis-native/types';

function clean(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

export function normaliseRuntimeMenuItem(raw: any, index: number): MenuItem {
  const label = String(raw?.label || raw?.name || raw?.title || raw?.path || `Menu ${index + 1}`);
  const path = String(raw?.path || raw?.href || raw?.url || '/');
  return {
    id: String(raw?.id || raw?.slug || label),
    slug: clean(String(raw?.slug || label)),
    label,
    path: path.startsWith('/') ? path : `/${path}`,
    enabled: raw?.enabled !== false && raw?.status !== 'hidden' && raw?.status !== 'disabled',
    order: Number(raw?.order || raw?.sortOrder || index + 1),
    parentId: String(raw?.parentId || raw?.parent || raw?.parentKey || ''),
    parentSlug: clean(String(raw?.parentSlug || raw?.parentLabel || '')),
    description: String(raw?.description || raw?.featureBody || ''),
    group: String(raw?.group || raw?.column || 'Menu'),
    imageUrl: String(raw?.imageUrl || raw?.image || ''),
  };
}
