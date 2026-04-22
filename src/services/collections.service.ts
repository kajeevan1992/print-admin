import { categoriesMock } from '@/data/categories';
import { collectionsMock } from '@/data/collections';
import { productsMock } from '@/data/products';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Collection, CollectionFormValues } from '@/modules/collections/types';

let collectionsStore: Collection[] = [...collectionsMock];
const STORAGE_KEY = 'print-admin-collections-store';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

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
  return {
    id,
    title: values.title,
    createdOn: createdOn ?? new Date().toISOString().slice(0, 10),
    productIds: values.productIds,
    categoryIds: values.categoryIds,
    products: productsMock.filter((product) => values.productIds.includes(product.id)).map((product) => ({ id: product.id, name: product.name, thumbnail: product.thumbnail, productNumbers: product.productNumbers })),
    categories: categoriesMock.filter((category) => values.categoryIds.includes(category.id)).map((category) => ({ id: category.id, name: category.name, thumbnail: category.thumbnail }))
  };
}

async function tryLiveCollections(search?: string): Promise<Collection[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/proxy/catalog-collections', { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) return null;
    const raw = payload?.payload?.data || payload?.payload || [];
    if (!Array.isArray(raw)) return null;
    const term = search?.trim().toLowerCase();
    return raw
      .map((row: any, index: number) => ({
        id: row.id || `col-${index + 1}`,
        title: row.name || row.title || `Collection ${index + 1}`,
        createdOn: row.createdAt ? String(row.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
        productIds: Array.isArray(row.productIds) ? row.productIds : [],
        categoryIds: Array.isArray(row.categoryIds) ? row.categoryIds : [],
        products: [],
        categories: []
      }))
      .filter((item) => !term || item.title.toLowerCase().includes(term));
  } catch {
    return null;
  }
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
    await wait();
    const next = hydrate(values, `col-${Math.floor(Math.random() * 9000 + 1000)}`);
    const items = [next, ...readStore()];
    writeStore(items);
    return ok(next);
  },
  updateCollection: async (id: string, values: CollectionFormValues): Promise<ApiResponse<Collection>> => {
    await wait();
    const items = readStore();
    const current = items.find((item) => item.id === id);
    const next = hydrate(values, id, current?.createdOn);
    writeStore(items.map((item) => (item.id === id ? next : item)));
    return ok(next);
  },
  deleteCollection: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    await wait();
    writeStore(readStore().filter((item) => item.id !== id));
    return ok({ id });
  }
};
