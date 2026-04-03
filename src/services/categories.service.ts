import { productCategories } from '@/data/products';
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type Category = { id: string; name: string };

export const categoriesService = {
  listCategories: async (): Promise<ApiResponse<{ items: Category[] }>> =>
    apiClient.request(() => ({ items: productCategories }))
};
