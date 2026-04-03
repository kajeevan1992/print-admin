import { apiClient } from '@/services/api/client';

export const quotesService = {
  listQuotes: async () => apiClient.request(() => ({ items: [] as Array<{ id: string; status: string }> }))
};
