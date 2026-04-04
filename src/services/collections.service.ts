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
    products: productsMock
      .filter((product) => values.productIds.includes(product.id))
      .map((product) => ({ id: product.id, name: product.name, thumbnail: product.thumbnail, productNumbers: product.productNumbers })),
    categories: categoriesMock
      .filter((category) => values.categoryIds.includes(category.id))
      .map((category) => ({ id: category.id, name: category.name, thumbnail: category.thumbnail }))
  };
}

export const collectionsService = {
  listCollections: async (search?: string): Promise<PaginatedResponse<Collection>> => {
    await wait();
    const items = readStore().filter((item) => !search || item.title.toLowerCase().includes(search.toLowerCase()));
    return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
  },
  getCollection: async (id: string): Promise<ApiResponse<Collection>> => {
    await wait();
    const item = readStore().find((collection) => collection.id === id);
    if (!item) throw new Error('Collection not found');
    return ok(item);
  },
  createCollection: async (values: CollectionFormValues): Promise<ApiResponse<Collection>> => {
    await wait();
    const created = hydrate(values, `col-${Math.floor(Math.random() * 9000 + 1000)}`);
    writeStore([created, ...readStore()]);
    return ok(created);
  },
  updateCollection: async (id: string, values: CollectionFormValues): Promise<ApiResponse<Collection>> => {
    await wait();
    const existing = readStore().find((collection) => collection.id === id);
    if (!existing) throw new Error('Collection not found');
    const updated = hydrate(values, id, existing.createdOn);
    writeStore(readStore().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  },
  deleteCollection: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    await wait();
    writeStore(readStore().filter((item) => item.id !== id));
    return ok({ success: true });
  }
};
