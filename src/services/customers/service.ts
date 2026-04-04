import { apiClient } from '@/services/api/client';

export const customersService = {
  listCustomers: async () => apiClient.request(() => ({ items: [] as Array<{ id: string; name: string }> }))
};
