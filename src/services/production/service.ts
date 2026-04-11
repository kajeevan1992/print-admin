import { apiClient } from '@/services/api/client';

export const productionService = {
  listRuns: async () => apiClient.request(() => ({ items: [] as Array<{ id: string; state: string }> }))
};
