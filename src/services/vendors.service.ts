import { productVendors } from '@/data/products';
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type Vendor = { id: string; name: string };

export const vendorsService = {
  listVendors: async (): Promise<ApiResponse<{ items: Vendor[] }>> =>
    apiClient.request(() => ({ items: productVendors }))
};
