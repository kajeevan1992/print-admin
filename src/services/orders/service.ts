import { apiClient } from '@/services/api/client';

export const ordersService = {
  listOrders: async () => apiClient.request(() => ({ items: [] as Array<{ id: string; status: string }> }))
};
