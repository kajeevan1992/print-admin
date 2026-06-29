export type StorefrontMenuItemType = 'category' | 'product' | 'page' | 'custom';

export type StorefrontMenuItem = {
  id: string;
  label: string;
  type: StorefrontMenuItemType;
  path: string;
  enabled: boolean;
  order: number;
  column: string;
  parentId?: string;
  parentSlug?: string;
  group?: string;
  categoryId?: string;
  categorySlug?: string;
  productId?: string;
  productSlug?: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  updatedAt?: string;
};

const CONFIG_KEY = 'storefront-menu-builder';
const LOCAL_KEY = 'print-admin-storefront-menu-builder';
const isBrowser = typeof window !== 'undefined';

const seedItems: StorefrontMenuItem[] = [
  { id: 'menu-business-cards', label: 'Business Cards', type: 'category', path: '/business-cards', enabled: true, order: 10, column: 'Main menu', group: 'Products', categorySlug: 'business-cards', description: 'Business cards and essentials', imageUrl: '/images/business-card-front.svg' },
  { id: 'menu-flyers', label: 'Flyers', type: 'category', path: '/flyers', enabled: true, order: 20, column: 'Main menu', group: 'Products', categorySlug: 'flyers', description: 'Flyers and leaflets', imageUrl: '/images/flyer-front.svg' },
  { id: 'menu-bespoke', label: 'Bespoke Quote', type: 'page', path: '/bespoke-quote', enabled: true, order: 900, column: 'Main menu', group: 'Support', description: 'Custom print support' },
];

function readLocal() {
  if (!isBrowser) return seedItems;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return seedItems;
    const parsed = JSON.parse(raw) as StorefrontMenuItem[];
    return Array.isArray(parsed) ? parsed : seedItems;
  } catch {
    return seedItems;
  }
}

function writeLocal(items: StorefrontMenuItem[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

function normaliseItem(item: StorefrontMenuItem): StorefrontMenuItem {
  return {
    ...item,
    type: item.type || 'custom',
    enabled: item.enabled !== false,
    order: Number(item.order || 999),
    column: item.column || (item.parentId ? 'Dropdown' : 'Main menu'),
    group: item.group || item.column || (item.parentId ? 'Menu' : 'Main menu'),
    parentId: item.parentId || '',
    parentSlug: item.parentSlug || '',
  };
}

async function readRemote() {
  const response = await fetch(`/api/internal/config/${encodeURIComponent(CONFIG_KEY)}/items`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Menu config API failed.');
  return Array.isArray(payload?.data?.items) ? (payload.data.items as StorefrontMenuItem[]).map(normaliseItem) : [];
}

async function saveRemote(item: StorefrontMenuItem) {
  const response = await fetch(`/api/internal/config/${encodeURIComponent(CONFIG_KEY)}/items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Menu config save failed.');
  return (payload?.item || item) as StorefrontMenuItem;
}

async function deleteRemote(id: string) {
  const response = await fetch(`/api/internal/config/${encodeURIComponent(CONFIG_KEY)}/items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Menu config delete failed.');
}

export const storefrontMenuService = {
  async list() {
    try {
      const items = await readRemote();
      const sorted = items.sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
      writeLocal(sorted);
      return { items: sorted, source: 'db' as const, message: 'Menu builder connected to internal config API.' };
    } catch (error) {
      const fallback = readLocal().map(normaliseItem).sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
      return { items: fallback, source: 'local' as const, message: `Using menu fallback: ${error instanceof Error ? error.message : 'unknown error'}` };
    }
  },
  async save(item: Omit<StorefrontMenuItem, 'id' | 'updatedAt'> & { id?: string }) {
    const next: StorefrontMenuItem = normaliseItem({
      ...item,
      id: item.id || `menu-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString(),
    } as StorefrontMenuItem);
    const local = readLocal().map(normaliseItem);
    writeLocal(local.some((row) => row.id === next.id) ? local.map((row) => row.id === next.id ? next : row) : [next, ...local]);
    return saveRemote(next);
  },
  async remove(id: string) {
    writeLocal(readLocal().filter((item) => item.id !== id));
    return deleteRemote(id);
  },
};
