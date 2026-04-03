import { dashboardOrganizations, dashboardPayloadByStoreId, dashboardStores } from '@/data/dashboard';
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type DashboardStore = (typeof dashboardStores)[number];
export type DashboardOrganization = typeof dashboardOrganizations;
export type DashboardPayload = (typeof dashboardPayloadByStoreId)['store-1'];

export type DashboardResponse = {
  organization: DashboardOrganization;
  stores: DashboardStore[];
  selectedStore: DashboardStore;
  payload: DashboardPayload;
};

export const dashboardService = {
  getDashboardMetrics: async (storeId?: string): Promise<ApiResponse<DashboardResponse>> =>
    apiClient.request(() => {
      const selectedStore =
        dashboardStores.find((store) => store.id === storeId) ?? dashboardStores[0];

      const payload =
        dashboardPayloadByStoreId[
          selectedStore.id as keyof typeof dashboardPayloadByStoreId
        ] ?? dashboardPayloadByStoreId['store-1'];

      return {
        organization: dashboardOrganizations,
        stores: dashboardStores,
        selectedStore,
        payload
      };
    })
};
