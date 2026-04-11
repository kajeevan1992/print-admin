import {
  dashboardActivityLog,
  dashboardAlerts,
  dashboardApiUsage,
  dashboardHealth,
  dashboardKpis,
  dashboardOrdersSeries,
  dashboardOrganization,
  dashboardQuickActions,
  dashboardReferrers,
  dashboardSalesSeries,
  dashboardStores
} from '@/data/dashboard';
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type DashboardPayload = {
  kpis: typeof dashboardKpis;
  salesSeries: typeof dashboardSalesSeries;
  ordersSeries: typeof dashboardOrdersSeries;
  apiUsage: typeof dashboardApiUsage;
  activity: typeof dashboardActivityLog;
  referrers: typeof dashboardReferrers;
  alerts: typeof dashboardAlerts;
  health: typeof dashboardHealth;
  quickActions: typeof dashboardQuickActions;
  stores: typeof dashboardStores;
  organization: typeof dashboardOrganization;
};

export const dashboardService = {
  getDashboardMetrics: async (): Promise<ApiResponse<DashboardPayload>> =>
    apiClient.request(() => ({
      kpis: dashboardKpis,
      salesSeries: dashboardSalesSeries,
      ordersSeries: dashboardOrdersSeries,
      apiUsage: dashboardApiUsage,
      activity: dashboardActivityLog,
      referrers: dashboardReferrers,
      alerts: dashboardAlerts,
      health: dashboardHealth,
      quickActions: dashboardQuickActions,
      stores: dashboardStores,
      organization: dashboardOrganization
    }))
};
