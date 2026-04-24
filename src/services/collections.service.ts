import { categoriesMock } from '@/data/categories';
import { collectionsMock } from '@/data/collections';
import { productsMock } from '@/data/products';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Collection, CollectionFormValues } from '@/modules/collections/types';

let collectionsStore: Collection[] = [...collectionsMock];
const STORAGE_KEY = 'print-admin-collections-store';
const LIVE_ENDPOINT = '/api/internal/catalog/collections';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

function slugify(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

function readStore(): Collection[] {
  if (typeof window === 'undefined') return collectionsStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return collectionsStore;
    const parsed = JSON.parse(raw) as Collection[];
    return Array.isArray(parsed) ? parsed : collectionsStore;
  } catch {
    return collectionsStore;
  }
}

function writeStore(next: Collection[]) {
  collectionsStore = next;
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function hydrate(values: CollectionFormValues, id: string, createdOn?: string): Collection {
  const liveProducts = readLiveProductsCache();
  const liveCategories = readLiveCategoriesCache();
  const productSource = liveProducts.length ? liveProducts : productsMock.map((product) => ({ id: product.id, name: product.name, thumbnail: product.thumbnail, productNumbers: product.productNumbers }));
  const categorySource = liveCategories.length ? liveCategories : categoriesMock.map((category) => ({ id: category.id, name: category.name, thumbnail: category.thumbnail }));

  return {
    id,
    title: values.title,
    createdOn: createdOn ?? new Date().toISOString().slice(0, 10),
    productIds: values.productIds,
    categoryIds: values.categoryIds,
    products: productSource.filter((product) => values.productIds.includes(product.id)),
    categories: categorySource.filter((category) => values.categoryIds.includes(category.id))
  };
}

function readLiveProductsCache() {
  if (typeof window === 'undefined') return [] as Collection['products'];
  try {
    const raw = window.sessionStorage.getItem('print-admin.live-products-cache');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as Collection['products'];
  }
}

function readLiveCategoriesCache() {
  if (typeof window === 'undefined') return [] as Collection['categories'];
  try {
    const raw = window.sessionStorage.getItem('print-admin.live-categories-cache');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as Collection['categories'];
  }
}

function mapLiveCollection(row: any, index: number): Collection {
  const metadata = row?.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
  const productIds = Array.isArray(metadata.productIds) ? metadata.productIds.map(String) : Array.isArray(row.productIds) ? row.productIds.map(String) : [];
  const categoryIds = Array.isArray(metadata.categoryIds) ? metadata.categoryIds.map(String) : Array.isArray(row.categoryIds) ? row.categoryIds.map(String) : [];
  return hydrate(
    {
      title: String(row.name || row.title || `Collection ${index + 1}`),
      productIds,
      categoryIds,
    },
    String(row.id || row.slug || `collection-${index + 1}`),
    row.createdAt ? String(row.createdAt).slice(0, 10) : undefined
  );
}

async function liveJson<T>(endpoint: string, init?: RequestInit): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const res = await fetch(endpoint, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Internal collections API failed.');
  return payload as T;
}

async function tryLiveCollections(search?: string): Promise<Collection[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const endpoint = search ? `${LIVE_ENDPOINT}?search=${encodeURIComponent(search)}` : LIVE_ENDPOINT;
    const payload: any = await liveJson(endpoint, { cache: 'no-store' });
    const raw = payload?.data?.items || payload?.data || payload?.payload?.data?.items || payload?.payload || [];
    if (!Array.isArray(raw)) return null;
    return raw.map(mapLiveCollection);
  } catch {
    return null;
  }
}

function livePayload(values: CollectionFormValues, id?: string) {
  const slug = slugify(values.title, id || `collection-${Date.now()}`);
  return {
    id,
    slug,
    name: values.title,
    title: values.title,
    description: `${values.productIds.length} products • ${values.categoryIds.length} categories`,
    metadataJson: {
      productIds: values.productIds,
      categoryIds: values.categoryIds,
      recordType: 'storefront-collection',
    },
  };
}

async function writeLiveCollection(values: CollectionFormValues, id?: string) {
  const method = id ? 'PATCH' : 'POST';
  const payload: any = await liveJson(LIVE_ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(livePayload(values, id)),
  });
  return mapLiveCollection(payload?.data || payload?.item || payload?.payload || livePayload(values, id), 0);
}

async function deleteLiveCollection(id: string) {
  await liveJson(`${LIVE_ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const collectionsService = {
  listCollections: async (search?: string): Promise<PaginatedResponse<Collection>> => {
    const live = await tryLiveCollections(search);
    if (live) return okPaginated(live, { page: 1, perPage: Math.max(1, live.length), total: live.length, totalPages: 1 });

    await wait();
    const items = readStore().filter((item) => !search || item.title.toLowerCase().includes(search.toLowerCase()));
    return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
  },
  getCollection: async (id: string): Promise<ApiResponse<Collection>> => {
    await wait();
    const item = readStore().find((collection) => collection.id === id) ?? collectionsStore[0];
    return ok(item);
  },
  createCollection: async (values: CollectionFormValues): Promise<ApiResponse<Collection>> => {
    try {
      const live = await writeLiveCollection(values);
      return ok(live);
    } catch {
      await wait();
      const next = hydrate(values, `col-${Math.floor(Math.random() * 9000 + 1000)}`);
      const items = [next, ...readStore()];
      writeStore(items);
      return ok(next);
    }
  },
  updateCollection: async (id: string, values: CollectionFormValues): Promise<ApiResponse<Collection>> => {
    try {
      const live = await writeLiveCollection(values, id);
      return ok(live);
    } catch {
      await wait();
      const items = readStore();
      const current = items.find((item) => item.id === id);
      const next = hydrate(values, id, current?.createdOn);
      writeStore(items.map((item) => (item.id === id ? next : item)));
      return ok(next);
    }
  },
  deleteCollection: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    try {
      await deleteLiveCollection(id);
    } catch {
      await wait();
    }
    writeStore(readStore().filter((item) => item.id !== id));
    return ok({ id });
  }
};
