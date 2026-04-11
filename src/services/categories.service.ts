import { accuZipOptionsMock, attributeSetOptionsMock, categoriesMock, categoryTagsMock, pricingOptionsMock } from '@/data/categories';
import { productsMock } from '@/data/products';
import { ok } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Category, CategoryFormValues, CategoryTag } from '@/modules/categories/types';

let categoriesStore: Category[] = [...categoriesMock];
let categoryTagsStore: CategoryTag[] = [...categoryTagsMock];

const STORAGE_KEY = 'print-admin-categories-store';
const TAGS_KEY = 'print-admin-category-tags-store';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

function readCategories(): Category[] {
  if (typeof window === 'undefined') return categoriesStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return categoriesStore;
    const parsed = JSON.parse(raw) as Category[];
    return Array.isArray(parsed) ? parsed : categoriesStore;
  } catch {
    return categoriesStore;
  }
}

function writeCategories(next: Category[]) {
  categoriesStore = next;
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function readTags(): CategoryTag[] {
  if (typeof window === 'undefined') return categoryTagsStore;
  try {
    const raw = window.localStorage.getItem(TAGS_KEY);
    if (!raw) return categoryTagsStore;
    const parsed = JSON.parse(raw) as CategoryTag[];
    return Array.isArray(parsed) ? parsed : categoryTagsStore;
  } catch {
    return categoryTagsStore;
  }
}

function writeTags(next: CategoryTag[]) {
  categoryTagsStore = next;
  if (typeof window !== 'undefined') window.localStorage.setItem(TAGS_KEY, JSON.stringify(next));
}

const countProducts = (categoryId: string) => productsMock.filter((product) => product.categoryId === categoryId && product.published).length;

function buildCategory(id: string, values: CategoryFormValues): Category {
  const existing = readCategories().find((item) => item.id === id);
  return {
    id,
    name: values.name,
    description: values.description,
    parentId: values.parentId || null,
    pricingId: values.pricingId,
    attributeSetId: values.attributeSetId,
    published: values.published,
    thumbnail: values.thumbnail || `https://placehold.co/96x96/111827/ffffff?text=${encodeURIComponent(values.name.slice(0, 2).toUpperCase() || 'CT')}`,
    friendlyUrl: values.friendlyUrl || `/${values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    productCount: countProducts(id),
    sortOrder: existing?.sortOrder ?? (readCategories().length + 1) * 10,
    accuZipConfig: values.accuZipConfig,
    useAlternateMaster: values.useAlternateMaster,
    tags: readTags().filter((tag) => values.tagIds.includes(tag.id)),
    canBrowse: values.canBrowse,
    canUpload: values.canUpload,
    canUploadLater: values.canUploadLater,
    canCreate: values.canCreate,
    canCustom: values.canCustom
  };
}

export const categoriesService = {
  listCategories: async (): Promise<ApiResponse<{ items: Category[] }>> => {
    await wait();
    return ok({ items: [...readCategories()].sort((a, b) => a.sortOrder - b.sortOrder) });
  },

  createCategory: async (values: CategoryFormValues): Promise<ApiResponse<Category>> => {
    await wait();
    const id = `cat-${Math.floor(Math.random() * 9000 + 1000)}`;
    const category = buildCategory(id, values);
    writeCategories([...readCategories(), category]);
    return ok(category);
  },

  updateCategory: async (id: string, values: CategoryFormValues): Promise<ApiResponse<Category>> => {
    await wait();
    const category = buildCategory(id, values);
    writeCategories(readCategories().map((item) => (item.id === id ? category : item)));
    return ok(category);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    await wait();
    writeCategories(readCategories().filter((item) => item.id !== id));
    return ok({ success: true });
  },

  togglePublished: async (id: string, published: boolean): Promise<ApiResponse<Category>> => {
    await wait();
    const category = readCategories().find((item) => item.id === id);
    if (!category) throw new Error('Category not found');
    const updated = { ...category, published };
    writeCategories(readCategories().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  },

  moveCategory: async (id: string, direction: 'up' | 'down'): Promise<ApiResponse<{ items: Category[] }>> => {
    await wait();
    const sorted = [...readCategories()].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((item) => item.id === id);
    if (index === -1) return ok({ items: sorted });
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sorted.length) return ok({ items: sorted });
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    const reordered = sorted.map((item, idx) => ({ ...item, sortOrder: (idx + 1) * 10 }));
    writeCategories(reordered);
    return ok({ items: reordered });
  },

  listCategoryTags: async (): Promise<ApiResponse<{ items: CategoryTag[] }>> => {
    await wait();
    return ok({ items: readTags() });
  },

  saveCategoryTags: async (labels: string[]): Promise<ApiResponse<{ items: CategoryTag[] }>> => {
    await wait();
    const nextTags = labels.filter(Boolean).map((label, index) => ({ id: `ct-${index + 1}`, label: label.trim() }));
    writeTags(nextTags);
    writeCategories(
      readCategories().map((category) => ({
        ...category,
        tags: category.tags.filter((tag) => nextTags.some((saved) => saved.id === tag.id))
      }))
    );
    return ok({ items: nextTags });
  },

  listPricingOptions: async () => ok({ items: pricingOptionsMock }),
  listAttributeSets: async () => ok({ items: attributeSetOptionsMock }),
  listAccuZipConfigs: async () => ok({ items: accuZipOptionsMock })
};
