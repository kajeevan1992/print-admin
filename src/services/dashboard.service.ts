import { dashboardActivityLog, dashboardApiUsage, dashboardKpis, dashboardReferrers, dashboardSalesSeries } from '@/data/dashboard';
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type DashboardPayload = {
  kpis: typeof dashboardKpis;
  salesSeries: typeof dashboardSalesSeries;
  apiUsage: typeof dashboardApiUsage;
  activity: typeof dashboardActivityLog;
  referrers: typeof dashboardReferrers;
};

export const dashboardService = {
  getDashboardMetrics: async (): Promise<ApiResponse<DashboardPayload>> =>
    apiClient.request(() => ({
      kpis: dashboardKpis,
      salesSeries: dashboardSalesSeries,
      apiUsage: dashboardApiUsage,
      activity: dashboardActivityLog,
      referrers: dashboardReferrers
    }))
};
