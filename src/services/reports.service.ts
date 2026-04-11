import { activityLog, channelPerformance, productPerformance, revenueSeries } from '@/data/reports';

export const reportsService = {
  getRevenueSeries: async () => revenueSeries,
  getChannelPerformance: async () => channelPerformance,
  getProductPerformance: async () => productPerformance,
  getActivityLog: async () => activityLog
};