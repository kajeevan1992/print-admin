import { accuZipOptionsMock, attributeSetOptionsMock, categoriesMock, categoryTagsMock, pricingOptionsMock } from '@/data/categories';
import { productsMock } from '@/data/products';
import { ok } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Category, CategoryFormValues, CategoryTag } from '@/modules/categories/types';

let categoriesStore: Category[] = categoriesMock.map((item) => ({
  ...item,
  productCount: productsMock.filter((product) => product.categoryId === item.id && product.published).length
}));

let categoryTagsStore: CategoryTag[] = [...categoryTagsMock];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const buildCategoryFromForm = (values: CategoryFormValues, existing?: Category): Category => {
  const id = existing?.id ?? `cat-${slugify(values.name || 'category')}-${Math.floor(Math.random() * 9000)}`;
  const selectedTags = categoryTagsStore.filter((tag) => values.tagIds.includes(tag.id));

  return {
    id,
    name: values.name,
    description: values.description,
    parentId: values.parentId || null,
    pricingId: values.pricingId,
    attributeSetId: values.attributeSetId,
    published: values.published,
    thumbnail: values.thumbnail || `https://placehold.co/96x96/111827/ffffff?text=${encodeURIComponent((values.name || 'CT').slice(0, 2).toUpperCase())}`,
    friendlyUrl: values.friendlyUrl || `/${slugify(values.name)}`,
    productCount: existing?.productCount ?? 0,
    sortOrder: existing?.sortOrder ?? categoriesStore.length * 10 + 10,
    accuZipConfig: values.accuZipConfig,
    useAlternateMaster: values.useAlternateMaster,
    tags: selectedTags,
    canBrowse: values.canBrowse,
    canUpload: values.canUpload,
    canUploadLater: values.canUploadLater,
    canCreate: values.canCreate,
    canCustom: values.canCustom
  };
};

export const categoriesService = {
  listCategories: async (): Promise<ApiResponse<{ items: Category[] }>> =>
    ok({ items: [...categoriesStore].sort((a, b) => a.sortOrder - b.sortOrder) }),

  createCategory: async (values: CategoryFormValues): Promise<ApiResponse<Category>> => {
    const category = buildCategoryFromForm(values);
    categoriesStore.push(category);
    return ok(category);
  },

  updateCategory: async (id: string, values: CategoryFormValues): Promise<ApiResponse<Category>> => {
    const index = categoriesStore.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Category not found');
    const updated = buildCategoryFromForm(values, categoriesStore[index]);
    categoriesStore[index] = updated;
    return ok(updated);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    categoriesStore = categoriesStore.filter((item) => item.id !== id);
    return ok({ success: true });
  },

  togglePublished: async (id: string, published: boolean): Promise<ApiResponse<Category>> => {
    const category = categoriesStore.find((item) => item.id === id);
    if (!category) throw new Error('Category not found');
    category.published = published;
    return ok(category);
  },

  moveCategory: async (id: string, direction: 'up' | 'down'): Promise<ApiResponse<{ items: Category[] }>> => {
    const sorted = [...categoriesStore].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Category not found');
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return ok({ items: sorted });
    const current = sorted[index];
    const target = sorted[swapIndex];
    const temp = current.sortOrder;
    current.sortOrder = target.sortOrder;
    target.sortOrder = temp;
    categoriesStore = sorted;
    return ok({ items: [...sorted].sort((a, b) => a.sortOrder - b.sortOrder) });
  },

  listCategoryTags: async (): Promise<ApiResponse<{ items: CategoryTag[] }>> => ok({ items: categoryTagsStore }),

  saveCategoryTags: async (labels: string[]): Promise<ApiResponse<{ items: CategoryTag[] }>> => {
    categoryTagsStore = labels
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label, index) => ({ id: `ct-${index + 1}`, label }));

    categoriesStore = categoriesStore.map((category) => ({
      ...category,
      tags: category.tags.filter((tag) => categoryTagsStore.some((globalTag) => globalTag.label === tag.label))
        .map((tag) => categoryTagsStore.find((globalTag) => globalTag.label === tag.label) ?? tag)
    }));

    return ok({ items: categoryTagsStore });
  },

  listPricingOptions: async (): Promise<ApiResponse<{ items: Array<{ id: string; name: string }> }>> => ok({ items: pricingOptionsMock }),
  listAttributeSets: async (): Promise<ApiResponse<{ items: Array<{ id: string; name: string }> }>> => ok({ items: attributeSetOptionsMock }),
  listAccuZipConfigs: async (): Promise<ApiResponse<{ items: Array<{ id: string; name: string }> }>> => ok({ items: accuZipOptionsMock })
};
